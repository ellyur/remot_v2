import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, CheckCircle, Clock, Wrench, AlertTriangle, Settings, CalendarDays } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tenant } from "@shared/schema";

interface OverduePayment {
  tenant: Tenant;
  month: string;
  dueDate: string;
  daysOverdue: number;
  rentAmount: string;
}

interface DashboardStats {
  totalTenants: number;
  paidRents: number;
  unpaidRents: number;
  pendingVerification: number;
  pendingMaintenance: number;
  selectedMonth: string;
  recentPayments: Array<{
    id: number;
    tenant: { fullName: string; unitId: string };
    amount: string;
    month: string;
    status: string;
  }>;
  recentMaintenance: Array<{
    id: number;
    tenant: { fullName: string; unitId: string };
    description: string;
    status: string;
  }>;
}

function buildMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

const MONTH_OPTIONS = buildMonthOptions();

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTH_OPTIONS[0].value);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard", selectedMonth],
    queryFn: () =>
      fetch(`/api/admin/dashboard?month=${selectedMonth}`).then(r => r.json()),
  });

  const { data: overduePayments } = useQuery<OverduePayment[]>({
    queryKey: ["/api/payments/overdue"],
  });

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const selectedLabel = MONTH_OPTIONS.find(o => o.value === selectedMonth)?.label ?? selectedMonth;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your apartment management system
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setLocation("/admin/payments")}
            data-testid="button-manage-payments"
          >
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Payments</span>
            <span className="sm:hidden">Payments</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setLocation("/admin/maintenance")}
            data-testid="button-manage-maintenance"
          >
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Maintenance</span>
            <span className="sm:hidden">Maint.</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setLocation("/admin/settings")}
            data-testid="button-settings"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </div>
      </div>

      {/* Month Filter */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-muted-foreground">Viewing stats for:</span>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]" data-testid="select-month-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} data-testid={`month-option-${opt.value}`}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {overduePayments && overduePayments.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <CardTitle className="text-orange-700 dark:text-orange-400">Overdue Payments Alert</CardTitle>
              </div>
              <Badge variant="destructive">{overduePayments.length} unpaid months across tenants</Badge>
            </div>
            <CardDescription>
              Tenants with payments past due date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overduePayments.slice(0, 3).map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-background rounded-lg border gap-2"
                  data-testid={`overdue-payment-${index}`}
                >
                  <div>
                    <p className="font-medium">{item.tenant.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      Unit {item.tenant.unitId} - {formatMonth(item.month)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                    <Badge variant="destructive">
                      {item.daysOverdue} days overdue
                    </Badge>
                    <p className="text-sm font-semibold">₱{parseFloat(item.rentAmount).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {overduePayments.length > 3 && (
                <Button
                  variant="ghost"
                  className="w-full text-orange-600"
                  onClick={() => setLocation("/admin/payments")}
                >
                  View all {overduePayments.length} overdue payments
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats for selected month */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tenants"
          value={stats?.totalTenants ?? 0}
          icon={Users}
          description="Active tenants"
        />
        <StatsCard
          title="Paid Rents"
          value={stats?.paidRents ?? 0}
          icon={CheckCircle}
          description={selectedLabel}
        />
        <StatsCard
          title="Unpaid Rents"
          value={stats?.unpaidRents ?? 0}
          icon={Clock}
          description={`${stats?.pendingVerification ?? 0} pending verification`}
        />
        <StatsCard
          title="Maintenance Requests"
          value={stats?.pendingMaintenance ?? 0}
          icon={Wrench}
          description="Pending resolution"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest payment submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentPayments && stats.recentPayments.length > 0 ? (
              <div className="space-y-4">
                {stats.recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-3"
                    data-testid={`payment-${payment.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{payment.tenant.fullName}</div>
                      <div className="text-sm text-muted-foreground">
                        Unit {payment.tenant.unitId} • ₱{parseFloat(payment.amount).toLocaleString()} • {formatMonth(payment.month)}
                      </div>
                    </div>
                    <div className="shrink-0 self-start sm:self-center">
                      <StatusBadge status={payment.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent payments
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Maintenance</CardTitle>
            <CardDescription>Latest maintenance requests</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentMaintenance && stats.recentMaintenance.length > 0 ? (
              <div className="space-y-4">
                {stats.recentMaintenance.map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-3"
                    data-testid={`maintenance-${report.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{report.tenant?.fullName ?? "Unknown"}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        Unit {report.tenant?.unitId ?? "—"} • {report.description}
                      </div>
                    </div>
                    <div className="shrink-0 self-start sm:self-center">
                      <StatusBadge status={report.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent maintenance requests
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
