import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Wrench, Calendar, Home, Plus, CheckCircle2, Clock, XCircle, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    rejectionNotes?: string | null;
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
  const [rejectionNote, setRejectionNote] = useState<string | null>(null);

  const { data: stats, isLoading } = useQuery<TenantStats>({
    queryKey: [`/api/tenant/dashboard?userId=${user?.id}`],
    enabled: !!user,
  });

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const currentYear = new Date().getFullYear();
  const monthsOfYear = Array.from({ length: 12 }, (_, i) => {
    const month = (i + 1).toString().padStart(2, '0');
    return `${currentYear}-${month}`;
  });

  const getPaymentForMonth = (month: string) => {
    return stats?.recentPayments?.find(p => p.month === month);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
      <div className="p-4 md:p-6 space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome, {tenant?.fullName}</h1>
          <p className="text-muted-foreground mt-1">
            Your tenant dashboard
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end min-w-0">
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

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 min-w-0">
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

      <Card>
        <CardHeader>
          <CardTitle>Rent Schedule {currentYear}</CardTitle>
          <CardDescription>Track your monthly payments for the entire year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-w-0">
            {monthsOfYear.map((month) => {
              const payment = getPaymentForMonth(month);
              const isFuture = month > new Date().toISOString().slice(0, 7);
              
              return (
                <div 
                  key={month}
                  className={`p-4 rounded-lg border flex flex-col justify-between min-h-[6rem] ${
                    payment?.status === 'verified' 
                      ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900' 
                      : payment?.status === 'pending'
                      ? 'bg-yellow-50/50 dark:bg-yellow-950/10 border-yellow-200 dark:border-yellow-900'
                      : payment?.status === 'rejected'
                      ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900'
                      : isFuture
                      ? 'bg-muted/30 border-dashed'
                      : 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm">{formatMonth(month).split(' ')[0]}</span>
                    {payment?.status === 'verified' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : payment?.status === 'pending' ? (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    ) : payment?.status === 'rejected' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-muted-foreground">
                        {payment ? `₱${payment.amount}` : isFuture ? 'Upcoming' : 'Unpaid'}
                      </span>
                      {payment && <StatusBadge status={payment.status} />}
                    </div>
                    {payment?.status === 'rejected' && payment.rejectionNotes && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50 w-full justify-start"
                        onClick={() => setRejectionNote(payment.rejectionNotes!)}
                        data-testid={`button-view-rejection-${payment.id}`}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        View reason
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 min-w-0">
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
                    className="flex items-center justify-between p-3 rounded-lg border gap-3"
                    data-testid={`payment-${payment.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">₱{payment.amount}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatMonth(payment.month)} • {new Date(payment.dateUploaded).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={payment.status} />
                      {payment.status === "rejected" && payment.rejectionNotes && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setRejectionNote(payment.rejectionNotes!)}
                          data-testid={`button-view-rejection-recent-${payment.id}`}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          View reason
                        </Button>
                      )}
                    </div>
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

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectionNote !== null} onOpenChange={(open) => { if (!open) setRejectionNote(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Payment Rejected
            </DialogTitle>
            <DialogDescription>
              Your admin provided the following reason for rejecting this payment.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">
            {rejectionNote}
          </div>
          <p className="text-sm text-muted-foreground">
            Please resubmit your payment proof after addressing the issue above.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
