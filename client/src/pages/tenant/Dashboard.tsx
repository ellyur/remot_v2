import { useQuery } from "@tanstack/react-query";
import { DollarSign, Wrench, Calendar, Home, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";

interface TenantStats {
  totalPayments: number;
  pendingPayments: number;
  verifiedPayments: number;
  maintenanceReports: number;
  recentPayments: Array<{
    id: number;
    amount: string;
    month: string;
    status: string;
    dateUploaded: string;
  }>;
  recentMaintenance: Array<{
    id: number;
    description: string;
    status: string;
    dateReported: string;
  }>;
}

export default function TenantDashboard() {
  const [, setLocation] = useLocation();
  const { user, tenant } = useAuth();

  const { data: stats, isLoading } = useQuery<TenantStats>({
    queryKey: [`/api/tenant/dashboard?userId=${user?.id}`],
    enabled: !!user,
  });

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome, {tenant?.fullName}</h1>
          <p className="text-muted-foreground mt-1">
            Your tenant dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="gap-2"
            onClick={() => setLocation("/tenant/payments")}
            data-testid="button-submit-payment"
          >
            <Plus className="h-4 w-4" />
            Submit Payment
          </Button>
          <Button 
            variant="outline"
            className="gap-2"
            onClick={() => setLocation("/tenant/maintenance")}
            data-testid="button-report-maintenance"
          >
            <Wrench className="h-4 w-4" />
            Report Issue
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unit
            </CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{tenant?.unitId}</div>
            <p className="text-xs text-muted-foreground mt-1">Your assigned unit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Rent
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">₱{tenant?.rentAmount}</div>
            <p className="text-xs text-muted-foreground mt-1">Due every month</p>
          </CardContent>
        </Card>

        <StatsCard
          title="Total Payments"
          value={stats?.totalPayments || 0}
          icon={Calendar}
          description="Payment submissions"
        />

        <StatsCard
          title="Maintenance Reports"
          value={stats?.maintenanceReports || 0}
          icon={Wrench}
          description="Submitted reports"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Your payment history</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentPayments && stats.recentPayments.length > 0 ? (
              <div className="space-y-4">
                {stats.recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`payment-${payment.id}`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">₱{payment.amount}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatMonth(payment.month)} • {new Date(payment.dateUploaded).toLocaleDateString()}
                      </div>
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No payment history yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Maintenance</CardTitle>
            <CardDescription>Your maintenance reports</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentMaintenance && stats.recentMaintenance.length > 0 ? (
              <div className="space-y-4">
                {stats.recentMaintenance.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`maintenance-${report.id}`}
                  >
                    <div className="flex-1">
                      <div className="font-medium line-clamp-1">{report.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(report.dateReported).toLocaleDateString()}
                      </div>
                    </div>
                    <StatusBadge status={report.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No maintenance reports yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
