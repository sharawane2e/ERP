import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import jsPDF from "jspdf";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Invoice, Project } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Download, Landmark, Plus } from "lucide-react";

type LedgerEntry = {
  id: number;
  projectId: number;
  entryDate: string;
  entryType: "expense" | "receipt";
  amount: string;
  paymentMode: string;
  reference: string | null;
  remarks: string | null;
  receivedAgainst: string | null;
};

type ReceiptForm = {
  projectId: string;
  entryDate: string;
  amount: string;
  paymentMode: string;
  reference: string;
  remarks: string;
  receivedAgainst: string;
};

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "neft", label: "NEFT" },
  { value: "imps", label: "IMPS" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

const asNumber = (value: string | number | null | undefined) => Number(value || 0) || 0;

export default function ClientLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const [, setLocation] = useLocation();
  const { data: user } = useUser();
  const { toast } = useToast();
  const [openReceiptDialog, setOpenReceiptDialog] = useState(false);
  const [receiptForm, setReceiptForm] = useState<ReceiptForm>({
    projectId: "",
    entryDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMode: "neft",
    reference: "",
    remarks: "",
    receivedAgainst: "",
  });

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: ["/revira/api/clients", clientId],
    queryFn: async () => {
      const res = await fetch(`/revira/api/clients/${clientId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load client");
      return res.json();
    },
    enabled: Number.isFinite(clientId) && clientId > 0,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/revira/api/client-ledger/projects", clientId],
    queryFn: async () => {
      const res = await fetch(`/revira/api/projects`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load projects");
      const all = (await res.json()) as Project[];
      return all.filter((p) => p.clientId === clientId);
    },
    enabled: Number.isFinite(clientId) && clientId > 0,
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/revira/api/client-ledger/invoices", clientId],
    queryFn: async () => {
      const res = await fetch(`/revira/api/invoices`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load invoices");
      const all = (await res.json()) as Invoice[];
      const projectIds = new Set(projects.map((p) => p.id));
      return all.filter((inv) => projectIds.has(inv.projectId));
    },
    enabled: projects.length > 0,
  });

  const { data: receipts = [], isLoading: receiptsLoading } = useQuery<LedgerEntry[]>({
    queryKey: ["/revira/api/client-ledger/receipts", clientId, projects.map((p) => p.id).join(",")],
    queryFn: async () => {
      const all = await Promise.all(
        projects.map(async (project) => {
          const res = await fetch(`/revira/api/projects/${project.id}/ledger/entries`, { credentials: "include" });
          if (!res.ok) return [] as LedgerEntry[];
          const entries = (await res.json()) as LedgerEntry[];
          return entries.filter((e) => e.entryType === "receipt");
        }),
      );
      return all.flat();
    },
    enabled: projects.length > 0,
  });

  const saveReceiptMutation = useMutation({
    mutationFn: async () => {
      if (!receiptForm.projectId) throw new Error("Select a project");
      if (!receiptForm.entryDate || !receiptForm.amount) throw new Error("Date and amount are required");
      const payload = {
        entryDate: receiptForm.entryDate,
        entryType: "receipt",
        category: "Client Receipt",
        description: "Amount received from client",
        amount: receiptForm.amount,
        paymentMode: receiptForm.paymentMode,
        remarks: receiptForm.remarks,
        reference: receiptForm.reference,
        receivedAgainst: receiptForm.receivedAgainst,
        chequeNumber: "",
        bankName: "",
        chequeDate: "",
        utrNumber: "",
        attachmentUrl: "",
      };
      await apiRequest("POST", `/revira/api/projects/${receiptForm.projectId}/ledger/entries`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/client-ledger/receipts", clientId] });
      setOpenReceiptDialog(false);
      setReceiptForm({
        projectId: "",
        entryDate: new Date().toISOString().split("T")[0],
        amount: "",
        paymentMode: "neft",
        reference: "",
        remarks: "",
        receivedAgainst: "",
      });
      toast({ title: "Saved", description: "Received amount has been added." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to save", variant: "destructive" });
    },
  });

  const projectMap = useMemo(() => {
    const m = new Map<number, Project>();
    projects.forEach((p) => m.set(p.id, p));
    return m;
  }, [projects]);

  const projectRows = useMemo(() => {
    return projects.map((project) => {
      const debit = invoices
        .filter((inv) => inv.projectId === project.id)
        .reduce((sum, inv) => sum + asNumber(inv.grandTotal), 0);
      const credit = receipts
        .filter((r) => r.projectId === project.id)
        .reduce((sum, r) => sum + asNumber(r.amount), 0);
      return {
        projectId: project.id,
        projectName: project.projectName,
        debit,
        credit,
        balance: debit - credit,
      };
    });
  }, [projects, invoices, receipts]);

  const totals = useMemo(() => {
    const debit = projectRows.reduce((sum, r) => sum + r.debit, 0);
    const credit = projectRows.reduce((sum, r) => sum + r.credit, 0);
    return { debit, credit, balance: debit - credit };
  }, [projectRows]);

  const transactions = useMemo(() => {
    const invoiceRows = invoices.map((inv) => ({
      date: new Date(inv.createdAt as unknown as string),
      dateText: new Date(inv.createdAt as unknown as string).toLocaleDateString("en-GB"),
      particulars: `Invoice ${inv.invoiceNumber} - ${projectMap.get(inv.projectId)?.projectName || "Project"}`,
      vchType: "Sales",
      vchNo: inv.invoiceNumber || String(inv.id),
      debit: asNumber(inv.grandTotal),
      credit: 0,
    }));
    const receiptRows = receipts.map((r) => ({
      date: new Date(r.entryDate),
      dateText: new Date(r.entryDate).toLocaleDateString("en-GB"),
      particulars: `Receipt - ${projectMap.get(r.projectId)?.projectName || "Project"}`,
      vchType: "Receipt",
      vchNo: r.reference || String(r.id),
      debit: 0,
      credit: asNumber(r.amount),
    }));
    return [...invoiceRows, ...receiptRows].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [invoices, receipts, projectMap]);

  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 12;
    const pageWidth = 210;
    const contentWidth = pageWidth - margin * 2;
    let y = 15;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(`Client Ledger - ${client?.name || "Client"}`, margin, y);
    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Date: ${new Date().toLocaleDateString("en-GB")}`, margin, y);
    y += 7;

    const cols = [
      { key: "date", label: "Date", width: 24 },
      { key: "part", label: "Particulars", width: 68 },
      { key: "type", label: "Vch Type", width: 24 },
      { key: "no", label: "Vch No.", width: 26 },
      { key: "debit", label: "Debit", width: 24 },
      { key: "credit", label: "Credit", width: 24 },
    ];

    const drawHeader = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      let x = margin;
      cols.forEach((c) => {
        pdf.text(c.label, x + 1, y);
        x += c.width;
      });
      y += 2;
      pdf.line(margin, y, margin + contentWidth, y);
      y += 4;
    };

    drawHeader();
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);

    transactions.forEach((row) => {
      if (y > 276) {
        pdf.addPage();
        y = 15;
        drawHeader();
        pdf.setFont("helvetica", "normal");
      }
      let x = margin;
      const values = [
        row.dateText,
        row.particulars,
        row.vchType,
        row.vchNo,
        row.debit > 0 ? row.debit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
        row.credit > 0 ? row.credit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
      ];
      values.forEach((v, idx) => {
        const col = cols[idx];
        const alignRight = col.key === "debit" || col.key === "credit";
        pdf.text(String(v), alignRight ? x + col.width - 1 : x + 1, y, { align: alignRight ? "right" : "left" });
        x += col.width;
      });
      y += 5;
    });

    y += 2;
    pdf.line(margin + contentWidth - 48, y, margin + contentWidth, y);
    y += 5;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Total Debit: ${totals.debit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + contentWidth - 2, y, { align: "right" });
    y += 5;
    pdf.text(`Total Credit: ${totals.credit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + contentWidth - 2, y, { align: "right" });
    y += 5;
    const balanceLabel = totals.balance >= 0 ? "Closing Balance (Dr)" : "Closing Balance (Cr)";
    pdf.text(`${balanceLabel}: ${Math.abs(totals.balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + contentWidth - 2, y, { align: "right" });

    const fileName = `ClientLedger_${client?.name?.replace(/\s+/g, "_") || "Client"}_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(fileName);
  };

  if (clientLoading || projectsLoading) {
    return (
      <LayoutShell user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </LayoutShell>
    );
  }

  if (!client) {
    return (
      <LayoutShell user={user}>
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-slate-700">Client not found</h2>
          <Button onClick={() => setLocation("/revira/clients")} className="mt-4">Back to Clients</Button>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell user={user}>
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/revira/clients")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Landmark className="h-6 w-6 text-[#d92134]" />
                Client Ledger
              </h1>
              <p className="text-sm text-slate-500">{client.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={openReceiptDialog} onOpenChange={setOpenReceiptDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#d92134] hover:bg-[#b91c2c]" data-testid="button-add-client-receipt">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Received Amount
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Add Received Amount</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Select value={receiptForm.projectId} onValueChange={(value) => setReceiptForm((prev) => ({ ...prev, projectId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.projectName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="date" value={receiptForm.entryDate} onChange={(e) => setReceiptForm((prev) => ({ ...prev, entryDate: e.target.value }))} />
                    <Input type="number" placeholder="Amount" value={receiptForm.amount} onChange={(e) => setReceiptForm((prev) => ({ ...prev, amount: e.target.value }))} />
                  </div>
                  <Select value={receiptForm.paymentMode} onValueChange={(value) => setReceiptForm((prev) => ({ ...prev, paymentMode: value }))}>
                    <SelectTrigger><SelectValue placeholder="Payment mode" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Received against" value={receiptForm.receivedAgainst} onChange={(e) => setReceiptForm((prev) => ({ ...prev, receivedAgainst: e.target.value }))} />
                  <Input placeholder="Reference / voucher no." value={receiptForm.reference} onChange={(e) => setReceiptForm((prev) => ({ ...prev, reference: e.target.value }))} />
                  <Textarea placeholder="Remarks" value={receiptForm.remarks} onChange={(e) => setReceiptForm((prev) => ({ ...prev, remarks: e.target.value }))} />
                  <Button onClick={() => saveReceiptMutation.mutate()} className="w-full" disabled={saveReceiptMutation.isPending}>
                    {saveReceiptMutation.isPending ? "Saving..." : "Save Receipt"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={exportPdf} data-testid="button-export-client-ledger-pdf">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total Debit (Invoices)</p><p className="text-xl font-bold text-red-600">Rs. {totals.debit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total Credit (Received)</p><p className="text-xl font-bold text-green-600">Rs. {totals.credit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Closing Balance</p><p className={`text-xl font-bold ${totals.balance >= 0 ? "text-red-700" : "text-green-700"}`}>Rs. {Math.abs(totals.balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {totals.balance >= 0 ? "Dr" : "Cr"}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project-wise Ledger Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-right">Debit (Invoice)</th>
                  <th className="p-3 text-right">Credit (Received)</th>
                  <th className="p-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {invoicesLoading || receiptsLoading ? (
                  <tr><td colSpan={4} className="p-4 text-slate-500">Loading...</td></tr>
                ) : projectRows.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-slate-500">No projects found for this client.</td></tr>
                ) : (
                  projectRows.map((r) => (
                    <tr key={r.projectId} className="border-t">
                      <td className="p-3">{r.projectName}</td>
                      <td className="p-3 text-right text-red-600">{r.debit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right text-green-600">{r.credit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className={`p-3 text-right font-semibold ${r.balance >= 0 ? "text-red-700" : "text-green-700"}`}>{Math.abs(r.balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {r.balance >= 0 ? "Dr" : "Cr"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}

