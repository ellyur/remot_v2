import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { TenantHeader } from "@/components/tenant/TenantHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeProvider } from "next-themes";

import Login from "@/pages/Login";
import Kasunduan from "@/pages/Kasunduan";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminTenants from "@/pages/admin/Tenants";
import AdminPayments from "@/pages/admin/Payments";
import AdminMaintenance from "@/pages/admin/Maintenance";
import AdminSettings from "@/pages/admin/Settings";
import AdminAnalytics from "@/pages/admin/Analytics";
import TenantDashboard from "@/pages/tenant/Dashboard";
import TenantPayments from "@/pages/tenant/Payments";
import TenantMaintenance from "@/pages/tenant/Maintenance";
import TenantProfile from "@/pages/tenant/Profile";
import NotFound from "@/pages/not-found";

function AdminLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between p-2 border-b shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h2 className="text-sm font-semibold md:hidden">Admin Panel</h2>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <TenantHeader />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/kasunduan">
        <ProtectedRoute requireTenant>
          <Kasunduan />
        </ProtectedRoute>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/tenants">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminTenants />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/payments">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminPayments />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/maintenance">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminMaintenance />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminSettings />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/analytics">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminAnalytics />
          </AdminLayout>
        </ProtectedRoute>
      </Route>

      {/* Tenant Routes */}
      <Route path="/tenant">
        <ProtectedRoute requireTenant>
          <TenantLayout>
            <TenantDashboard />
          </TenantLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tenant/payments">
        <ProtectedRoute requireTenant>
          <TenantLayout>
            <TenantPayments />
          </TenantLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tenant/maintenance">
        <ProtectedRoute requireTenant>
          <TenantLayout>
            <TenantMaintenance />
          </TenantLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tenant/profile">
        <ProtectedRoute requireTenant>
          <TenantLayout>
            <TenantProfile />
          </TenantLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
