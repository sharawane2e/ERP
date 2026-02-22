import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrandingProvider } from "@/contexts/branding-context";
import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ClientsPage from "@/pages/clients";
import ProjectsPage from "@/pages/projects";
import UsersPage from "@/pages/users";
import QuotationPage from "@/pages/quotation";
import InvoicePage from "@/pages/invoice";
import GatePassPage from "@/pages/gate-pass";
import DeliveryChallanPage from "@/pages/delivery-challan";
import LedgerPage from "@/pages/ledger";
import ClientLedgerPage from "@/pages/client-ledger";
import BrandingPage from "@/pages/branding";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/revira" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/revira" component={LoginPage} />

      {/* Protected Routes */}
      <Route path="/revira/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>

      {/* Clients Route */}
      <Route path="/revira/clients">
        <ProtectedRoute component={ClientsPage} />
      </Route>

      {/* Projects Route */}
      <Route path="/revira/projects">
        <ProtectedRoute component={ProjectsPage} />
      </Route>

      {/* User Management Route */}
      <Route path="/revira/users">
        <ProtectedRoute component={UsersPage} />
      </Route>

      {/* Quotation Routes */}
      <Route path="/revira/projects/:projectId/quotation/:quotationId">
        <ProtectedRoute component={QuotationPage} />
      </Route>
      <Route path="/revira/projects/:projectId/quotation">
        <ProtectedRoute component={QuotationPage} />
      </Route>

      {/* Invoice Routes */}
      <Route path="/revira/projects/:id/invoice/:invoiceId">
        <ProtectedRoute component={InvoicePage} />
      </Route>
      <Route path="/revira/projects/:id/invoice">
        <ProtectedRoute component={InvoicePage} />
      </Route>

      {/* Gate Pass Routes */}
      <Route path="/revira/projects/:id/gate-pass/:gatePassId">
        <ProtectedRoute component={GatePassPage} />
      </Route>
      <Route path="/revira/projects/:id/gate-pass">
        <ProtectedRoute component={GatePassPage} />
      </Route>

      {/* Delivery Challan Routes */}
      <Route path="/revira/projects/:id/delivery-challan/:deliveryChallanId">
        <ProtectedRoute component={DeliveryChallanPage} />
      </Route>
      <Route path="/revira/projects/:id/delivery-challan">
        <ProtectedRoute component={DeliveryChallanPage} />
      </Route>

      {/* Ledger Route */}
      <Route path="/revira/projects/:id/ledger">
        <ProtectedRoute component={LedgerPage} />
      </Route>
      <Route path="/revira/clients/:id/ledger">
        <ProtectedRoute component={ClientLedgerPage} />
      </Route>

      {/* Branding Route */}
      <Route path="/revira/branding">
        <ProtectedRoute component={BrandingPage} />
      </Route>

      {/* Settings Route */}
      <Route path="/revira/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrandingProvider>
          <Router />
          <Toaster />
        </BrandingProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
