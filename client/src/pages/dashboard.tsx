import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { LayoutShell } from "@/components/layout-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FolderKanban,
  FileText,
  Receipt,
  DoorOpen,
  ClipboardList,
  IndianRupee,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";
import type { Client, Project, Quotation, Invoice, GatePass, DeliveryChallan } from "@shared/schema";

async function fetchList<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(path, { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default function DashboardPage() {
  const { data: user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/dashboard/clients"],
    queryFn: () => fetchList<Client>("/api/clients"),
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/dashboard/projects"],
    queryFn: () => fetchList<Project>("/api/projects"),
    enabled: !!user,
  });

  const { data: quotations = [] } = useQuery<Quotation[]>({
    queryKey: ["/dashboard/quotations"],
    queryFn: () => fetchList<Quotation>("/api/quotations"),
    enabled: !!user,
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/dashboard/invoices"],
    queryFn: () => fetchList<Invoice>("/api/invoices"),
    enabled: !!user,
  });

  const { data: gatePasses = [] } = useQuery<GatePass[]>({
    queryKey: ["/dashboard/gate-passes"],
    queryFn: () => fetchList<GatePass>("/api/gate-passes"),
    enabled: !!user,
  });

  const { data: deliveryChallans = [] } = useQuery<DeliveryChallan[]>({
    queryKey: ["/dashboard/delivery-challans"],
    queryFn: () => fetchList<DeliveryChallan>("/api/delivery-challans"),
    enabled: !!user,
  });

  const projectNameById = useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((project) => map.set(project.id, project.projectName));
    return map;
  }, [projects]);

  const safeNumber = (value: unknown) => {
    const raw = String(value ?? "0").replace(/,/g, "");
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const totalInvoiceValue = useMemo(
    () => invoices.reduce((sum, invoice) => sum + safeNumber(invoice.grandTotal), 0),
    [invoices],
  );

  const coverage = useMemo(() => {
    const quoteSet = new Set(quotations.map((q) => q.projectId));
    const invoiceSet = new Set(invoices.map((i) => i.projectId));
    const gatePassSet = new Set(gatePasses.map((g) => g.projectId));
    const dcSet = new Set(deliveryChallans.map((d) => d.projectId));

    const totalProjects = projects.length || 1;
    const fullDocProjects = projects.filter(
      (p) => quoteSet.has(p.id) && invoiceSet.has(p.id) && gatePassSet.has(p.id) && dcSet.has(p.id),
    ).length;

    return {
      quotationCoverage: Math.round((quoteSet.size / totalProjects) * 100),
      invoiceCoverage: Math.round((invoiceSet.size / totalProjects) * 100),
      gatePassCoverage: Math.round((gatePassSet.size / totalProjects) * 100),
      deliveryCoverage: Math.round((dcSet.size / totalProjects) * 100),
      fullDocProjects,
    };
  }, [projects, quotations, invoices, gatePasses, deliveryChallans]);

  const recentActivity = useMemo(() => {
    const toDateValue = (value: unknown) => new Date(value ? String(value) : 0).getTime();

    const activities = [
      ...quotations.map((q) => ({
        id: `q-${q.id}`,
        type: "Quotation",
        number: q.quotationNumber,
        projectId: q.projectId,
        revision: q.revision,
        createdAt: q.createdAt,
        targetPath: `/projects/${q.projectId}/quotation/${q.id}`,
      })),
      ...invoices.map((i) => ({
        id: `i-${i.id}`,
        type: "Invoice",
        number: i.invoiceNumber,
        projectId: i.projectId,
        revision: i.revision,
        createdAt: i.createdAt,
        targetPath: `/projects/${i.projectId}/invoice/${i.id}`,
      })),
      ...gatePasses.map((g) => ({
        id: `g-${g.id}`,
        type: "Gate Pass",
        number: g.gatePassNumber,
        projectId: g.projectId,
        revision: g.revision,
        createdAt: g.createdAt,
        targetPath: `/projects/${g.projectId}/gate-pass/${g.id}`,
      })),
      ...deliveryChallans.map((d) => ({
        id: `d-${d.id}`,
        type: "Delivery Challan",
        number: d.deliveryChallanNumber,
        projectId: d.projectId,
        revision: d.revision,
        createdAt: d.createdAt,
        targetPath: `/projects/${d.projectId}/delivery-challan/${d.id}`,
      })),
    ];

    return activities.sort((a, b) => toDateValue(b.createdAt) - toDateValue(a.createdAt)).slice(0, 5);
  }, [quotations, invoices, gatePasses, deliveryChallans]);

  if (isLoading) return null;

  const topCards = [
    { title: "Clients", value: clients.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Projects", value: projects.length, icon: FolderKanban, color: "text-indigo-600", bg: "bg-indigo-50" },
    {
      title: "Documents",
      value: quotations.length + invoices.length + gatePasses.length + deliveryChallans.length,
      icon: FileText,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Invoice Value",
      value: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
        totalInvoiceValue,
      ),
      icon: IndianRupee,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <LayoutShell user={user}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">Welcome, {user?.name}. Live snapshot of projects and document flow.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation("/clients")}>
              Clients
            </Button>
            <Button variant="outline" onClick={() => setLocation("/projects")}>
              Projects
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {topCards.map((card) => (
            <Card key={card.title} className="border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{card.title}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Document Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500">No activity yet. Create a project and start with quotation.</p>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((activity) => (
                    <button
                      type="button"
                      key={activity.id}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      onClick={() => setLocation(activity.targetPath)}
                      data-testid={`button-dashboard-activity-${activity.id}`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {activity.type} <span className="font-normal text-slate-500">({activity.revision})</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {activity.number} | {projectNameById.get(activity.projectId) || "Unknown Project"}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString("en-IN") : "-"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Documentation Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Projects with all docs</p>
                <p className="text-xl font-bold text-slate-900">
                  {coverage.fullDocProjects}/{projects.length}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <FileText className="h-4 w-4 text-red-500" /> Quotations
                  </span>
                  <span className="font-semibold">{coverage.quotationCoverage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <Receipt className="h-4 w-4 text-green-600" /> Invoices
                  </span>
                  <span className="font-semibold">{coverage.invoiceCoverage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <DoorOpen className="h-4 w-4 text-blue-600" /> Gate Pass
                  </span>
                  <span className="font-semibold">{coverage.gatePassCoverage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <ClipboardList className="h-4 w-4 text-indigo-600" /> Delivery Challan
                  </span>
                  <span className="font-semibold">{coverage.deliveryCoverage}%</span>
                </div>
              </div>
              <Button className="w-full mt-2" variant="outline" onClick={() => setLocation("/projects")}>
                Review Projects <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700 flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" />
                Keep all four documents updated for better project traceability.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutShell>
  );
}
