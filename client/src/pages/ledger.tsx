import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Client, Project } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Wallet, TrendingDown, TrendingUp, Scale, Landmark, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LedgerEntry = {
  id: number;
  projectId: number;
  entryDate: string;
  entryType: "expense" | "receipt";
  category: string;
  description: string;
  amount: string;
  paymentMode: string;
  remarks: string | null;
  reference: string | null;
  receivedAgainst: string | null;
  chequeNumber: string | null;
  bankName: string | null;
  chequeDate: string | null;
  utrNumber: string | null;
  attachmentUrl: string | null;
  createdAt: string;
};

type LedgerBudget = {
  id: number;
  projectId: number;
  projectValue: string;
  updatedAt: string;
} | null;

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "neft", label: "NEFT" },
  { value: "imps", label: "IMPS" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

const modeLabel = (mode: string) => PAYMENT_MODES.find((m) => m.value === mode)?.label || mode;

export default function LedgerPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const [, setLocation] = useLocation();
  const { data: user } = useUser();
  const { toast } = useToast();

  const [budgetValue, setBudgetValue] = useState("");
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<LedgerEntry | null>(null);
  const [expense, setExpense] = useState({
    entryDate: new Date().toISOString().split("T")[0],
    category: "",
    description: "",
    amount: "",
    paymentMode: "cash",
    reference: "",
    attachmentUrl: "",
  });
  const [receipt, setReceipt] = useState({
    entryDate: new Date().toISOString().split("T")[0],
    amount: "",
    receivedAgainst: "",
    paymentMode: "neft",
    remarks: "",
    reference: "",
    chequeNumber: "",
    bankName: "",
    chequeDate: "",
    attachmentUrl: "",
  });

  const readAttachmentAsDataUrl = (file: File, onDone: (value: string) => void) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      onDone(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  };

  const handleExpenseAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readAttachmentAsDataUrl(file, (value) => setExpense((prev) => ({ ...prev, attachmentUrl: value })));
  };

  const handleReceiptAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readAttachmentAsDataUrl(file, (value) => setReceipt((prev) => ({ ...prev, attachmentUrl: value })));
  };

  const attachmentLabel = (value: string) => {
    if (!value) return "-";
    if (value.startsWith("data:")) return "Open Attachment";
    return value;
  };

  const ensureJsonResponse = async (res: Response, fallbackMessage: string) => {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(fallbackMessage);
    }
    return res.json();
  };

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: Number.isFinite(projectId) && projectId > 0,
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", project?.clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${project?.clientId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch client");
      return res.json();
    },
    enabled: !!project?.clientId,
  });

  const { data: budget } = useQuery<LedgerBudget>({
    queryKey: ["/api/projects", projectId, "ledger", "budget"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/ledger/budget`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch budget");
      return ensureJsonResponse(res, "Ledger budget API is unavailable. Please restart backend.");
    },
    enabled: Number.isFinite(projectId) && projectId > 0,
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery<LedgerEntry[]>({
    queryKey: ["/api/projects", projectId, "ledger", "entries"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/ledger/entries`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch ledger entries");
      return ensureJsonResponse(res, "Ledger entries API is unavailable. Please restart backend.");
    },
    enabled: Number.isFinite(projectId) && projectId > 0,
  });

  const budgetMutation = useMutation({
    mutationFn: async () => {
      const numeric = Number(String(budgetValue).replace(/,/g, "").trim());
      const safe = Number.isFinite(numeric) ? numeric : 0;
      const res = await apiRequest("PUT", `/api/projects/${projectId}/ledger/budget`, { projectValue: String(safe) });
      return ensureJsonResponse(res, "Ledger budget API is unavailable. Please restart backend.");
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "ledger", "budget"] });
      setBudgetValue(String(Number(saved?.projectValue || 0)));
      toast({ title: "Budget saved", description: "Project budget updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to save budget", variant: "destructive" });
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: Record<string, string> }) => {
      if (id) {
        const res = await apiRequest("PUT", `/api/ledger-entries/${id}`, payload);
        await ensureJsonResponse(res, "Ledger update API is unavailable. Please restart backend.");
        return;
      }
      const res = await apiRequest("POST", `/api/projects/${projectId}/ledger/entries`, payload);
      await ensureJsonResponse(res, "Ledger create API is unavailable. Please restart backend.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "ledger", "entries"] });
      setExpenseDialogOpen(false);
      setReceiptDialogOpen(false);
      setEditingExpenseId(null);
      setEditingReceiptId(null);
      toast({ title: "Entry saved", description: "Ledger entry saved in database." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to add entry", variant: "destructive" });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/ledger-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "ledger", "entries"] });
      setEntryToDelete(null);
      toast({ title: "Entry deleted", description: "Ledger entry deleted successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (budget && budget.projectValue !== undefined && budget.projectValue !== null) {
      setBudgetValue(String(Number(budget.projectValue)));
    }
  }, [budget?.projectValue]);

  const totals = useMemo(() => {
    const totalExpenses = entries
      .filter((e) => e.entryType === "expense")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalReceived = entries
      .filter((e) => e.entryType === "receipt")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalBudget = Number(budget?.projectValue || 0);

    return {
      totalBudget,
      totalExpenses,
      totalReceived,
      balanceAmount: totalReceived - totalExpenses,
      remainingBudget: totalBudget - totalExpenses,
    };
  }, [entries, budget]);

  const rowsWithRunningBalance = useMemo(() => {
    const asc = [...entries].sort((a, b) => {
      const da = new Date(a.entryDate).getTime();
      const db = new Date(b.entryDate).getTime();
      if (da !== db) return da - db;
      return a.id - b.id;
    });
    let running = 0;
    const runningById: Record<number, number> = {};
    asc.forEach((e) => {
      const amt = Number(e.amount) || 0;
      running += e.entryType === "expense" ? -amt : amt;
      runningById[e.id] = running;
    });

    return [...entries]
      .sort((a, b) => {
        const da = new Date(a.entryDate).getTime();
        const db = new Date(b.entryDate).getTime();
        if (da !== db) return db - da;
        return b.id - a.id;
      })
      .map((e) => ({ ...e, runningBalance: runningById[e.id] || 0 }));
  }, [entries]);

  const saveExpense = () => {
    if (!expense.entryDate || !expense.category || !expense.description || !expense.amount) {
      toast({ title: "Missing fields", description: "Fill date, category, description and amount.", variant: "destructive" });
      return;
    }
    addEntryMutation.mutate({
      id: editingExpenseId || undefined,
      payload: {
        entryDate: expense.entryDate,
        entryType: "expense",
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        paymentMode: expense.paymentMode,
        remarks: "",
        reference: expense.reference,
        attachmentUrl: expense.attachmentUrl,
      },
    });
    setExpense({
      entryDate: new Date().toISOString().split("T")[0],
      category: "",
      description: "",
      amount: "",
      paymentMode: "cash",
      reference: "",
      attachmentUrl: "",
    });
  };

  const saveReceipt = () => {
    if (!receipt.entryDate || !receipt.amount) {
      toast({ title: "Missing fields", description: "Fill received date and amount.", variant: "destructive" });
      return;
    }
    addEntryMutation.mutate({
      id: editingReceiptId || undefined,
      payload: {
        entryDate: receipt.entryDate,
        entryType: "receipt",
        category: "Client Receipt",
        description: "Payment received from client",
        amount: receipt.amount,
        paymentMode: receipt.paymentMode,
        remarks: receipt.remarks,
        reference: receipt.reference,
        receivedAgainst: receipt.receivedAgainst,
        chequeNumber: receipt.paymentMode === "cheque" ? receipt.chequeNumber : "",
        bankName: receipt.paymentMode === "cheque" ? receipt.bankName : "",
        chequeDate: receipt.paymentMode === "cheque" ? receipt.chequeDate : "",
        utrNumber: "",
        attachmentUrl: receipt.attachmentUrl,
      },
    });
    setReceipt({
      entryDate: new Date().toISOString().split("T")[0],
      amount: "",
      receivedAgainst: "",
      paymentMode: "neft",
      remarks: "",
      reference: "",
      chequeNumber: "",
      bankName: "",
      chequeDate: "",
      attachmentUrl: "",
    });
  };

  if (projectLoading) {
    return (
      <LayoutShell user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </LayoutShell>
    );
  }

  if (!project) {
    return (
      <LayoutShell user={user}>
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-slate-700">Project not found</h2>
          <Button onClick={() => setLocation("/projects")} className="mt-4">Back to Projects</Button>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell user={user}>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 px-1 sm:px-0">
        <div className="flex items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/projects")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Project Ledger</h1>
              <p className="text-xs sm:text-sm text-slate-500 break-words">{project.projectName} {client ? `- ${client.name}` : ""}</p>
            </div>
          </div>
        </div>

        <Card className="border-[#eeb7b7]">
          <CardHeader className="bg-slate-50">
            <CardTitle className="text-[#d92134]">Budget Initialization</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-sm text-slate-500">Project Cost / Project Value</label>
                <Input
                  type="number"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  placeholder={budget?.projectValue || "0.00"}
                  data-testid="input-ledger-budget"
                />
              </div>
              <Button className="w-full md:w-auto" onClick={() => budgetMutation.mutate()} disabled={budgetMutation.isPending} data-testid="button-save-ledger-budget">
                {budgetMutation.isPending ? "Saving..." : "Save Budget"}
              </Button>
              <div className="text-sm text-slate-600 md:text-right">
                Current Budget: <span className="font-semibold">Rs. {Number(budget?.projectValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total Budget</p><p className="text-lg font-bold">Rs. {totals.totalBudget.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total Expenses</p><p className="text-lg font-bold text-red-600">Rs. {totals.totalExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total Received</p><p className="text-lg font-bold text-green-600">Rs. {totals.totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Balance (Received - Expenses)</p><p className={`text-lg font-bold ${totals.balanceAmount >= 0 ? "text-green-600" : "text-red-600"}`}>Rs. {totals.balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Remaining Budget</p><p className={`text-lg font-bold ${totals.remainingBudget >= 0 ? "text-green-600" : "text-red-600"}`}>Rs. {totals.remainingBudget.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Ledger Entries</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="w-full sm:w-auto"
                  data-testid="button-open-expense-dialog"
                  onClick={() => {
                    setEditingExpenseId(null);
                    setExpense({
                      entryDate: new Date().toISOString().split("T")[0],
                      category: "",
                      description: "",
                      amount: "",
                      paymentMode: "cash",
                      reference: "",
                      attachmentUrl: "",
                    });
                  }}
                >
                  <TrendingDown className="w-4 h-4 mr-2" /> Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input type="date" value={expense.entryDate} onChange={(e) => setExpense({ ...expense, entryDate: e.target.value })} />
                    <Input placeholder="Expense category/type" value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })} />
                  </div>
                  <Textarea placeholder="Description / remarks" value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input type="number" placeholder="Amount" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} />
                    <Select value={expense.paymentMode} onValueChange={(v) => setExpense({ ...expense, paymentMode: v })}>
                      <SelectTrigger><SelectValue placeholder="Mode of payment" /></SelectTrigger>
                      <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input placeholder="Reference / bill no." value={expense.reference} onChange={(e) => setExpense({ ...expense, reference: e.target.value })} />
                    <Input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleExpenseAttachmentUpload}
                    />
                  </div>
                  {expense.attachmentUrl ? <p className="text-xs text-slate-500">Attachment selected</p> : null}
                  <Button onClick={saveExpense} disabled={addEntryMutation.isPending} className="w-full" data-testid="button-add-expense">
                    {addEntryMutation.isPending ? "Saving..." : editingExpenseId ? "Update Expense" : "Save Expense"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  data-testid="button-open-receipt-dialog"
                  onClick={() => {
                    setEditingReceiptId(null);
                    setReceipt({
                      entryDate: new Date().toISOString().split("T")[0],
                      amount: "",
                      receivedAgainst: "",
                      paymentMode: "neft",
                      remarks: "",
                      reference: "",
                      chequeNumber: "",
                      bankName: "",
                      chequeDate: "",
                      attachmentUrl: "",
                    });
                  }}
                >
                  <TrendingUp className="w-4 h-4 mr-2" /> Add Client Receipt
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Client Receipt</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input type="date" value={receipt.entryDate} onChange={(e) => setReceipt({ ...receipt, entryDate: e.target.value })} />
                    <Input type="number" placeholder="Amount received" value={receipt.amount} onChange={(e) => setReceipt({ ...receipt, amount: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input placeholder="Received against (milestone/invoice/term)" value={receipt.receivedAgainst} onChange={(e) => setReceipt({ ...receipt, receivedAgainst: e.target.value })} />
                    <Select value={receipt.paymentMode} onValueChange={(v) => setReceipt({ ...receipt, paymentMode: v })}>
                      <SelectTrigger><SelectValue placeholder="Mode of receipt" /></SelectTrigger>
                      <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {receipt.paymentMode === "cheque" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input placeholder="Cheque number" value={receipt.chequeNumber} onChange={(e) => setReceipt({ ...receipt, chequeNumber: e.target.value })} />
                      <Input placeholder="Bank name" value={receipt.bankName} onChange={(e) => setReceipt({ ...receipt, bankName: e.target.value })} />
                      <Input type="date" value={receipt.chequeDate} onChange={(e) => setReceipt({ ...receipt, chequeDate: e.target.value })} />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input placeholder="Reference details" value={receipt.reference} onChange={(e) => setReceipt({ ...receipt, reference: e.target.value })} />
                    <Input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleReceiptAttachmentUpload}
                    />
                  </div>
                  {receipt.attachmentUrl ? <p className="text-xs text-slate-500">Attachment selected</p> : null}
                  <Textarea placeholder="Remarks" value={receipt.remarks} onChange={(e) => setReceipt({ ...receipt, remarks: e.target.value })} />
                  <Button onClick={saveReceipt} disabled={addEntryMutation.isPending} className="w-full" data-testid="button-add-receipt">
                    {addEntryMutation.isPending ? "Saving..." : editingReceiptId ? "Update Receipt" : "Save Receipt"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Landmark className="w-4 h-4" /> Ledger View</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="md:hidden p-3 space-y-3">
              {entriesLoading ? (
                <div className="text-sm text-slate-500">Loading...</div>
              ) : rowsWithRunningBalance.length === 0 ? (
                <div className="text-sm text-slate-500">No ledger entries yet.</div>
              ) : (
                rowsWithRunningBalance.map((e) => {
                  const amount = Number(e.amount) || 0;
                  return (
                    <div key={e.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs text-slate-500">{e.entryDate}</div>
                        <div className="flex items-center gap-2">
                          <div className={`text-xs font-semibold ${e.entryType === "expense" ? "text-red-600" : "text-green-600"}`}>
                            {e.entryType === "expense" ? "Expense" : "Receipt"}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              if (e.entryType === "expense") {
                                setEditingExpenseId(e.id);
                                setExpense({
                                  entryDate: e.entryDate,
                                  category: e.category,
                                  description: e.description,
                                  amount: String(Number(e.amount) || 0),
                                  paymentMode: e.paymentMode,
                                  reference: e.reference || "",
                                  attachmentUrl: e.attachmentUrl || "",
                                });
                                setExpenseDialogOpen(true);
                              } else {
                                setEditingReceiptId(e.id);
                                setReceipt({
                                  entryDate: e.entryDate,
                                  amount: String(Number(e.amount) || 0),
                                  receivedAgainst: e.receivedAgainst || "",
                                  paymentMode: e.paymentMode,
                                  remarks: e.remarks || "",
                                  reference: e.reference || "",
                                  chequeNumber: e.chequeNumber || "",
                                  bankName: e.bankName || "",
                                  chequeDate: e.chequeDate || "",
                                  attachmentUrl: e.attachmentUrl || "",
                                });
                                setReceiptDialogOpen(true);
                              }
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-600"
                            onClick={() => setEntryToDelete(e)}
                            disabled={deleteEntryMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-slate-800">{e.category}</div>
                      <div className="text-xs text-slate-500">{e.description}</div>
                      <div className="text-xs text-slate-600">Mode: {modeLabel(e.paymentMode)}</div>
                      {e.receivedAgainst ? <div className="text-xs text-slate-600">Against: {e.receivedAgainst}</div> : null}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Amount</span>
                        <span className={e.entryType === "expense" ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                          Rs. {amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Running Balance</span>
                        <span className={e.runningBalance >= 0 ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                          Rs. {e.runningBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {(e.remarks || e.reference || e.utrNumber || e.chequeNumber || e.attachmentUrl) && (
                        <div className="pt-1 border-t text-xs text-slate-600 space-y-1">
                          {e.remarks ? <div>Remarks: {e.remarks}</div> : null}
                          {e.reference ? <div>Ref: {e.reference}</div> : null}
                          {e.utrNumber ? <div>UTR: {e.utrNumber}</div> : null}
                          {e.chequeNumber ? <div>Cheque: {e.chequeNumber}</div> : null}
                          {e.attachmentUrl ? (
                            <div>
                              Attach:{" "}
                              <a className="text-blue-600 underline" href={e.attachmentUrl} target="_blank" rel="noreferrer">
                                {attachmentLabel(e.attachmentUrl)}
                              </a>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Category / Particulars</th>
                    <th className="p-3 text-left">Payment Mode</th>
                    <th className="p-3 text-right">Debit</th>
                    <th className="p-3 text-right">Credit</th>
                    <th className="p-3 text-left">Remarks</th>
                    <th className="p-3 text-left">Reference / Attachment</th>
                    <th className="p-3 text-right">Running Balance</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entriesLoading ? (
                    <tr><td className="p-4 text-slate-500" colSpan={10}>Loading...</td></tr>
                  ) : rowsWithRunningBalance.length === 0 ? (
                    <tr><td className="p-4 text-slate-500" colSpan={10}>No ledger entries yet.</td></tr>
                  ) : (
                    rowsWithRunningBalance.map((e) => {
                      const amount = Number(e.amount) || 0;
                      return (
                        <tr key={e.id} className="border-t">
                          <td className="p-3">{e.entryDate}</td>
                          <td className={`p-3 font-semibold ${e.entryType === "expense" ? "text-red-600" : "text-green-600"}`}>
                            {e.entryType === "expense" ? "Expense" : "Receipt"}
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{e.category}</div>
                            <div className="text-xs text-slate-500">{e.description}</div>
                            {e.receivedAgainst ? <div className="text-xs text-slate-500">Against: {e.receivedAgainst}</div> : null}
                          </td>
                          <td className="p-3">{modeLabel(e.paymentMode)}</td>
                          <td className="p-3 text-right text-red-600">{e.entryType === "expense" ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                          <td className="p-3 text-right text-green-600">{e.entryType === "receipt" ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                          <td className="p-3">{e.remarks || "-"}</td>
                          <td className="p-3">
                            <div>{e.reference || "-"}</div>
                            {e.utrNumber ? <div className="text-xs text-slate-500">UTR: {e.utrNumber}</div> : null}
                            {e.chequeNumber ? <div className="text-xs text-slate-500">Cheque: {e.chequeNumber}</div> : null}
                            {e.attachmentUrl ? (
                              <div className="text-xs text-slate-500">
                                Attach:{" "}
                                <a className="text-blue-600 underline" href={e.attachmentUrl} target="_blank" rel="noreferrer">
                                  {attachmentLabel(e.attachmentUrl)}
                                </a>
                              </div>
                            ) : null}
                          </td>
                          <td className={`p-3 text-right font-semibold ${e.runningBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                            {e.runningBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  if (e.entryType === "expense") {
                                    setEditingExpenseId(e.id);
                                    setExpense({
                                      entryDate: e.entryDate,
                                      category: e.category,
                                      description: e.description,
                                      amount: String(Number(e.amount) || 0),
                                      paymentMode: e.paymentMode,
                                      reference: e.reference || "",
                                      attachmentUrl: e.attachmentUrl || "",
                                    });
                                    setExpenseDialogOpen(true);
                                  } else {
                                    setEditingReceiptId(e.id);
                                    setReceipt({
                                      entryDate: e.entryDate,
                                      amount: String(Number(e.amount) || 0),
                                      receivedAgainst: e.receivedAgainst || "",
                                      paymentMode: e.paymentMode,
                                      remarks: e.remarks || "",
                                      reference: e.reference || "",
                                      chequeNumber: e.chequeNumber || "",
                                      bankName: e.bankName || "",
                                      chequeDate: e.chequeDate || "",
                                      attachmentUrl: e.attachmentUrl || "",
                                    });
                                    setReceiptDialogOpen(true);
                                  }
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600"
                                onClick={() => setEntryToDelete(e)}
                                disabled={deleteEntryMutation.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t bg-slate-50 p-3 text-sm flex flex-wrap gap-4">
              <span className="font-semibold flex items-center gap-1"><Wallet className="w-4 h-4" /> Total Budget: Rs. {totals.totalBudget.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="font-semibold text-red-600">Total Expenses: Rs. {totals.totalExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="font-semibold text-green-600">Total Received: Rs. {totals.totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`font-semibold ${totals.balanceAmount >= 0 ? "text-green-700" : "text-red-700"}`}><Scale className="w-4 h-4 inline mr-1" /> Balance: Rs. {totals.balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>
        <Dialog open={!!entryToDelete} onOpenChange={(isOpen) => !isOpen && setEntryToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Ledger Entry?</DialogTitle>
              <DialogDescription>
                {entryToDelete
                  ? `Are you sure you want to delete this ${entryToDelete.entryType} entry dated ${entryToDelete.entryDate}? This action cannot be undone.`
                  : "This action cannot be undone."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                autoFocus
                onClick={() => setEntryToDelete(null)}
                disabled={deleteEntryMutation.isPending}
                data-testid="button-cancel-delete-ledger-entry"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => entryToDelete && deleteEntryMutation.mutate(entryToDelete.id)}
                disabled={deleteEntryMutation.isPending}
                data-testid="button-confirm-delete-ledger-entry"
              >
                {deleteEntryMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutShell>
  );
}
