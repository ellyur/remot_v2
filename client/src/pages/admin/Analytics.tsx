import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, TrendingDown, Users, Wrench, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AnalyticsData {
  revenue: {
    total: number;
    currentMonth: number;
    growth: number;
    trends: Array<{ month: string; revenue: number }>;
  };
  latePayers: Array<{
    tenant: {
      id: number;
      fullName: string;
      unitId: string;
    };
    latePaymentCount: number;
    averageDaysOverdue: number;
  }>;
  maintenance: {
    currentMonth: number;
    byStatus: {
      pending: number;
      inProgress: number;
      resolved: number;
    };
    trends: Array<{ month: string; pending: number; inProgress: number; resolved: number }>;
  };
  payments: {
    rate: number;
    statusBreakdown: {
      verified: number;
      pending: number;
    };
    trends: Array<{ month: string; verified: number; pending: number }>;
  };
}

const formatMonth = (month: string) => {
  const [year, monthNum] = month.split("-");
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function AdminAnalytics() {
  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    retry: 2,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="text-destructive font-medium">Error loading analytics</div>
          <div className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </div>
        </div>
      </div>
    );
  }

  // Use default empty data structure if analytics is null/undefined
  const analyticsData: AnalyticsData = analytics || {
    revenue: {
      total: 0,
      currentMonth: 0,
      growth: 0,
      trends: [],
    },
    latePayers: [],
    maintenance: {
      currentMonth: 0,
      byStatus: {
        pending: 0,
        inProgress: 0,
        resolved: 0,
      },
      trends: [],
    },
    payments: {
      rate: 0,
      statusBreakdown: {
        verified: 0,
        pending: 0,
      },
      trends: [],
    },
  };

  const revenueChartData = (analyticsData.revenue.trends || []).map(item => ({
    month: formatMonth(item.month),
    revenue: item.revenue || 0,
  }));

  const maintenanceChartData = (analyticsData.maintenance.trends || []).map(item => ({
    month: formatMonth(item.month),
    Pending: item.pending || 0,
    "In Progress": item.inProgress || 0,
    Resolved: item.resolved || 0,
  }));

  const paymentChartData = (analyticsData.payments.trends || []).map(item => ({
    month: formatMonth(item.month),
    Verified: item.verified || 0,
    Pending: item.pending || 0,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive insights into revenue, payments, and maintenance
        </p>
      </div>

      {/* Revenue Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {formatCurrency(analyticsData.revenue.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {formatCurrency(analyticsData.revenue.currentMonth || 0)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {(analyticsData.revenue.growth || 0) >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">
                    {analyticsData.revenue.growth || 0}% vs last month
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600">
                    {Math.abs(analyticsData.revenue.growth || 0)}% vs last month
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {analyticsData.payments.rate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
          <CardDescription>Monthly revenue over the last 12 months</CardDescription>
        </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `₱${value.toLocaleString()}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
      </Card>

      {/* Payment Statistics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Status Breakdown</CardTitle>
            <CardDescription>Overall payment status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Verified</span>
                </div>
                <Badge variant="outline" className="text-lg">
                  {analyticsData.payments.statusBreakdown?.verified || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Pending</span>
                </div>
                <Badge variant="outline" className="text-lg">
                  {analyticsData.payments.statusBreakdown?.pending || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Trends</CardTitle>
            <CardDescription>Payment status over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={paymentChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Verified" fill="#22c55e" />
                  <Bar dataKey="Pending" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No payment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Late Payers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Late Payers
          </CardTitle>
          <CardDescription>
            Tenants with frequent late payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(analyticsData.latePayers || []).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-center">Late Payments</TableHead>
                  <TableHead className="text-center">Avg. Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(analyticsData.latePayers || []).map((item) => (
                  <TableRow key={item.tenant.id}>
                    <TableCell className="font-medium">{item.tenant.fullName}</TableCell>
                    <TableCell>{item.tenant.unitId}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive">{item.latePaymentCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.averageDaysOverdue} days</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No late payers found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Statistics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Maintenance This Month</CardTitle>
            <CardDescription>Current month maintenance requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight mb-4">
              {analyticsData.maintenance.currentMonth || 0}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <Badge variant="outline">{analyticsData.maintenance.byStatus?.pending || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">In Progress</span>
                <Badge variant="outline">{analyticsData.maintenance.byStatus?.inProgress || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Resolved</span>
                <Badge variant="outline">{analyticsData.maintenance.byStatus?.resolved || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Trends</CardTitle>
            <CardDescription>Maintenance status over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {maintenanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={maintenanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Pending" fill="#f97316" />
                  <Bar dataKey="In Progress" fill="#3b82f6" />
                  <Bar dataKey="Resolved" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No maintenance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
