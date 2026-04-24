import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle, FileImage, Eye, Search, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StatusBadge } from "@/components/StatusBadge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PaymentWithTenant, Tenant } from "@shared/schema";

interface OverduePayment {
  tenant: Tenant;
  month: string;
  dueDate: string;
  daysOverdue: number;
  rentAmount: string;
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

  const invalidatePayments = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/payments/overdue"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tenant/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tenant/payments"] });
  };

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
              {overduePayments.length} tenant{overduePayments.length > 1 ? 's have' : ' has'} overdue payments
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
                  {filteredPayments.map((payment) => (
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
