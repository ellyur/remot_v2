import { Fragment, useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle, FileImage, Eye, Search, AlertTriangle, Plus, Filter, MessageSquare, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTablePagination } from "@/components/DataTablePagination";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PaymentWithTenant, Tenant, Payment } from "@shared/schema";

interface OverduePayment {
  tenant: Tenant;
  month: string;
  monthLabel?: string;
  dueDate: string;
  daysOverdue: number;
  rentAmount: string;
}

interface BillingPeriod {
  month: string;
  monthLabel: string;
  dueDate: string;
  daysOverdue: number;
  status: "paid" | "pending" | "rejected" | "unpaid" | "overdue";
  payment: Payment | null;
  rentAmount: string;
}

interface TenantBillingSummary {
  tenant: Tenant;
  totalUnpaid: number;
  totalOverdue: number;
  totalDue: number;
  periods: BillingPeriod[];
}

const markPaidSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  amount: z.string().min(1, "Amount is required"),
});

type MarkPaidFormData = z.infer<typeof markPaidSchema>;

const rejectSchema = z.object({
  notes: z.string().min(5, "Please provide at least 5 characters explaining the reason"),
});
type RejectFormData = z.infer<typeof rejectSchema>;

export default function AdminPayments() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("submissions");
  const [billingSearch, setBillingSearch] = useState<string>("");
  const [billingFilter, setBillingFilter] = useState<string>("with-balance");
  const [expandedTenantId, setExpandedTenantId] = useState<number | null>(null);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [billingPage, setBillingPage] = useState(1);
  const PAGE_SIZE = 10;
  const { toast } = useToast();

  const rejectForm = useForm<RejectFormData>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { notes: "" },
  });

  const { data: allTenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const form = useForm<MarkPaidFormData>({
    resolver: zodResolver(markPaidSchema),
    defaultValues: {
      tenantId: "",
      month: new Date().toISOString().slice(0, 7), // Current month in YYYY-MM format
      amount: "",
    },
  });

  const { data: payments, isLoading } = useQuery<PaymentWithTenant[]>({
    queryKey: ["/api/payments"],
  });

  const { data: overduePayments } = useQuery<OverduePayment[]>({
    queryKey: ["/api/payments/overdue"],
  });

  const { data: billingSummaries, isLoading: billingLoading } = useQuery<TenantBillingSummary[]>({
    queryKey: ["/api/admin/billing-summary"],
  });

  const invalidatePayments = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/payments/overdue"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tenant/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tenant/payments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
  };

  const remindMutation = useMutation({
    mutationFn: async ({ tenantId, month }: { tenantId: number; month: string }) => {
      return await apiRequest("POST", "/api/payments/remind", { tenantId, month });
    },
    onSuccess: () => {
      toast({ title: "Reminder sent", description: "An SMS reminder has been sent to the tenant." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send SMS", description: error.message, variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/payments/${id}/status`, { status });
    },
    onSuccess: () => {
      invalidatePayments();
      toast({ title: "Payment verified" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      return await apiRequest("PATCH", `/api/payments/${id}/status`, { status: "rejected", rejectionNotes: notes });
    },
    onSuccess: () => {
      invalidatePayments();
      toast({ title: "Payment rejected", description: "The tenant will see the rejection reason." });
      setRejectingPaymentId(null);
      rejectForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (data: MarkPaidFormData) => {
      return await apiRequest("POST", "/api/payments/create", data);
    },
    onSuccess: () => {
      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/overdue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/payments"] });
      // Explicitly refetch payments to ensure UI updates
      queryClient.refetchQueries({ queryKey: ["/api/payments"] });
      toast({ title: "Payment marked as paid successfully" });
      setIsMarkPaidOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const uniqueTenants = useMemo(() => {
    if (!payments) return [];
    const tenants = new Map();
    payments.forEach(p => tenants.set(p.tenant.id, p.tenant));
    return Array.from(tenants.values());
  }, [payments]);

  const uniqueMonths = useMemo(() => {
    if (!payments) return [];
    const months = new Set(payments.map(p => p.month));
    return Array.from(months).sort().reverse();
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    
    return payments.filter(payment => {
      if (statusFilter !== "all" && payment.status !== statusFilter) return false;
      if (tenantFilter !== "all" && payment.tenant.id.toString() !== tenantFilter) return false;
      if (monthFilter !== "all" && payment.month !== monthFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!payment.tenant.fullName.toLowerCase().includes(search) &&
            !payment.tenant.unitId.toLowerCase().includes(search)) {
          return false;
        }
      }
      return true;
    });
  }, [payments, statusFilter, tenantFilter, monthFilter, searchTerm]);

  const clearFilters = () => {
    setStatusFilter("all");
    setTenantFilter("all");
    setMonthFilter("all");
    setSearchTerm("");
  };

  const hasActiveFilters = statusFilter !== "all" || tenantFilter !== "all" || monthFilter !== "all" || searchTerm !== "";

  const pagedSubmissions = useMemo(
    () => filteredPayments.slice((submissionsPage - 1) * PAGE_SIZE, submissionsPage * PAGE_SIZE),
    [filteredPayments, submissionsPage],
  );
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
    if (submissionsPage > totalPages) setSubmissionsPage(totalPages);
  }, [filteredPayments.length, submissionsPage]);
  useEffect(() => { setSubmissionsPage(1); }, [statusFilter, tenantFilter, monthFilter, searchTerm]);

  const filteredBilling = useMemo(() => {
    if (!billingSummaries) return [] as TenantBillingSummary[];
    const term = billingSearch.trim().toLowerCase();
    return billingSummaries.filter((s) => {
      if (billingFilter === "with-balance" && s.totalUnpaid === 0) return false;
      if (billingFilter === "overdue" && s.totalOverdue === 0) return false;
      if (billingFilter === "paid-up" && s.totalUnpaid > 0) return false;
      if (term && !s.tenant.fullName.toLowerCase().includes(term) && !s.tenant.unitId.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [billingSummaries, billingSearch, billingFilter]);

  const pagedBilling = useMemo(
    () => filteredBilling.slice((billingPage - 1) * PAGE_SIZE, billingPage * PAGE_SIZE),
    [filteredBilling, billingPage],
  );
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredBilling.length / PAGE_SIZE));
    if (billingPage > totalPages) setBillingPage(totalPages);
  }, [filteredBilling.length, billingPage]);
  useEffect(() => { setBillingPage(1); }, [billingSearch, billingFilter]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Payment Management</h1>
          <p className="text-muted-foreground mt-1">
            Review and verify payment submissions
          </p>
        </div>
        <Button onClick={() => setIsMarkPaidOpen(true)} data-testid="button-mark-paid">
          <Plus className="h-4 w-4 mr-2" />
          Mark as Paid
        </Button>
      </div>

      {overduePayments && overduePayments.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Overdue Payments Alert
            </CardTitle>
            <CardDescription>
              {overduePayments.length} unpaid month{overduePayments.length > 1 ? "s" : ""} across tenants
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-auto py-0 px-2 underline text-orange-700 dark:text-orange-400 hover:bg-transparent"
                onClick={() => setActiveTab("billing")}
                data-testid="link-view-billing-status"
              >
                View Billing Status
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overduePayments.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white dark:bg-background rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.tenant.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      Unit {item.tenant.unitId} - {formatMonth(item.month)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="mb-1">
                      {item.daysOverdue} days overdue
                    </Badge>
                    <p className="text-sm font-semibold">₱{item.rentAmount}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="submissions" data-testid="tab-submissions">Submissions</TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">Billing Status</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Payment Submissions</CardTitle>
              <CardDescription>All payment proofs from tenants</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {filteredPayments.length} of {payments?.length || 0} payments
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tenant name or unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-payments"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-tenant-filter">
                <SelectValue placeholder="Filter by tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {uniqueTenants.map(tenant => (
                  <SelectItem key={tenant.id} value={tenant.id.toString()}>
                    {tenant.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-month-filter">
                <SelectValue placeholder="Filter by month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {uniqueMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
          ) : filteredPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date Uploaded</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedSubmissions.map((payment) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="font-medium">{payment.tenant.fullName}</TableCell>
                      <TableCell>{payment.tenant.unitId}</TableCell>
                      <TableCell>{formatMonth(payment.month)}</TableCell>
                      <TableCell className="text-right font-semibold">₱{payment.amount}</TableCell>
                      <TableCell>
                        {new Date(payment.dateUploaded).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {payment.imagePath ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedImage(`/${payment.imagePath}`)}
                            data-testid={`button-view-proof-${payment.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">No image</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => verifyMutation.mutate({ id: payment.id, status: "verified" })}
                              disabled={verifyMutation.isPending || rejectMutation.isPending}
                              data-testid={`button-verify-${payment.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                              Verify
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRejectingPaymentId(payment.id);
                                rejectForm.reset();
                              }}
                              disabled={verifyMutation.isPending || rejectMutation.isPending}
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              data-testid={`button-reject-${payment.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataTablePagination
                page={submissionsPage}
                pageSize={PAGE_SIZE}
                totalItems={filteredPayments.length}
                onPageChange={setSubmissionsPage}
                testIdPrefix="pagination-submissions"
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">
                {hasActiveFilters ? "No payments match your filters" : "No payment submissions"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Try adjusting your filters to see more results"
                  : "Payment proofs will appear here once tenants upload them"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Billing Status</CardTitle>
                  <CardDescription>
                    See unpaid months for every tenant and send SMS reminders
                  </CardDescription>
                </div>
                <Badge variant="secondary" data-testid="badge-billing-count">
                  {filteredBilling.length} of {billingSummaries?.length || 0} tenants
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by tenant name or unit..."
                    value={billingSearch}
                    onChange={(e) => setBillingSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-billing"
                  />
                </div>
                <Select value={billingFilter} onValueChange={setBillingFilter}>
                  <SelectTrigger className="w-[200px]" data-testid="select-billing-filter">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="with-balance">With Balance</SelectItem>
                    <SelectItem value="overdue">Overdue Only</SelectItem>
                    <SelectItem value="paid-up">Paid Up</SelectItem>
                    <SelectItem value="all">All Tenants</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {billingLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading billing status...</div>
              ) : filteredBilling.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Unpaid Months</TableHead>
                        <TableHead className="text-right">Overdue Months</TableHead>
                        <TableHead className="text-right">Total Due</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedBilling.map((summary) => {
                        const isExpanded = expandedTenantId === summary.tenant.id;
                        const unpaidPeriods = summary.periods.filter(
                          (p) => p.status === "unpaid" || p.status === "overdue" || p.status === "rejected",
                        );
                        return (
                          <Fragment key={summary.tenant.id}>
                            <TableRow
                              data-testid={`row-billing-${summary.tenant.id}`}
                              className={summary.totalOverdue > 0 ? "bg-orange-50/50 dark:bg-orange-950/10" : ""}
                            >
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setExpandedTenantId(isExpanded ? null : summary.tenant.id)
                                  }
                                  disabled={unpaidPeriods.length === 0}
                                  data-testid={`button-expand-${summary.tenant.id}`}
                                  aria-label={isExpanded ? "Collapse" : "Expand"}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="font-medium">{summary.tenant.fullName}</TableCell>
                              <TableCell>{summary.tenant.unitId}</TableCell>
                              <TableCell
                                className="text-right"
                                data-testid={`text-unpaid-count-${summary.tenant.id}`}
                              >
                                {summary.totalUnpaid > 0 ? (
                                  <Badge variant="secondary">{summary.totalUnpaid}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell
                                className="text-right"
                                data-testid={`text-overdue-count-${summary.tenant.id}`}
                              >
                                {summary.totalOverdue > 0 ? (
                                  <Badge variant="destructive">{summary.totalOverdue}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell
                                className="text-right font-semibold"
                                data-testid={`text-total-due-${summary.tenant.id}`}
                              >
                                ₱{summary.totalDue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right">
                                {summary.totalUnpaid > 0 ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const target =
                                        summary.periods.find((p) => p.status === "overdue") ||
                                        summary.periods.find(
                                          (p) => p.status === "unpaid" || p.status === "rejected",
                                        );
                                      if (target) {
                                        remindMutation.mutate({
                                          tenantId: summary.tenant.id,
                                          month: target.month,
                                        });
                                      }
                                    }}
                                    disabled={remindMutation.isPending}
                                    data-testid={`button-remind-${summary.tenant.id}`}
                                  >
                                    <MessageSquare className="h-4 w-4 mr-1" />
                                    Remind
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="text-green-600 border-green-200">
                                    Paid up
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                            {isExpanded && unpaidPeriods.length > 0 && (
                              <TableRow
                                key={`${summary.tenant.id}-expanded`}
                                data-testid={`row-billing-expanded-${summary.tenant.id}`}
                              >
                                <TableCell colSpan={7} className="bg-muted/30 p-4">
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium mb-2">Unpaid months</p>
                                    {unpaidPeriods.map((period) => (
                                      <div
                                        key={period.month}
                                        className="flex items-center justify-between p-3 bg-background rounded-md border"
                                        data-testid={`row-period-${summary.tenant.id}-${period.month}`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div>
                                            <p className="font-medium">{period.monthLabel}</p>
                                            <p className="text-xs text-muted-foreground">
                                              Due {new Date(period.dueDate + "T00:00:00").toLocaleDateString()}
                                            </p>
                                          </div>
                                          {period.status === "overdue" && (
                                            <Badge variant="destructive">
                                              {period.daysOverdue} days overdue
                                            </Badge>
                                          )}
                                          {period.status === "rejected" && (
                                            <Badge variant="destructive">Rejected</Badge>
                                          )}
                                          {period.status === "unpaid" && (
                                            <Badge variant="outline">Unpaid</Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <p className="font-semibold">₱{period.rentAmount}</p>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              remindMutation.mutate({
                                                tenantId: summary.tenant.id,
                                                month: period.month,
                                              })
                                            }
                                            disabled={remindMutation.isPending}
                                            data-testid={`button-remind-period-${summary.tenant.id}-${period.month}`}
                                          >
                                            <MessageSquare className="h-4 w-4 mr-1" />
                                            Remind
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <DataTablePagination
                    page={billingPage}
                    pageSize={PAGE_SIZE}
                    totalItems={filteredBilling.length}
                    onPageChange={setBillingPage}
                    testIdPrefix="pagination-billing"
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No tenants match your filter</h3>
                  <p className="text-sm text-muted-foreground">
                    Try changing the filter or search to see other tenants
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="flex justify-center">
              <img
                src={selectedImage}
                alt="Payment proof"
                className="max-w-full max-h-[70vh] rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog open={rejectingPaymentId !== null} onOpenChange={(open) => { if (!open) { setRejectingPaymentId(null); rejectForm.reset(); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Payment
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this payment. The tenant will be able to see this note.
            </DialogDescription>
          </DialogHeader>
          <Form {...rejectForm}>
            <form
              onSubmit={rejectForm.handleSubmit((data) => {
                if (rejectingPaymentId !== null) {
                  rejectMutation.mutate({ id: rejectingPaymentId, notes: data.notes });
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={rejectForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejection Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. The uploaded image is blurry and unreadable. Please resubmit a clear photo of your receipt."
                        className="min-h-[100px]"
                        data-testid="input-rejection-notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setRejectingPaymentId(null); rejectForm.reset(); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={rejectMutation.isPending}
                  data-testid="button-confirm-reject"
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Reject Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={isMarkPaidOpen} onOpenChange={setIsMarkPaidOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-mark-paid">
          <DialogHeader>
            <DialogTitle>Mark Payment as Paid</DialogTitle>
            <DialogDescription>
              Record a payment that was made in person. This will create a verified payment record.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => markPaidMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tenant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allTenants?.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id.toString()}>
                            {tenant.fullName} - Unit {tenant.unitId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <FormControl>
                      <Input type="month" {...field} data-testid="input-payment-month" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-payment-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsMarkPaidOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={markPaidMutation.isPending}>
                  {markPaidMutation.isPending ? "Creating..." : "Mark as Paid"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
