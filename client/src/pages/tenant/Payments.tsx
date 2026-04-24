import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, FileImage, Calendar, Eye, Edit, Trash2, Smartphone, XCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StatusBadge } from "@/components/StatusBadge";
import { GCashPaymentDialog } from "@/components/GCashPaymentDialog";
import type { Payment } from "@shared/schema";

const paymentSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Please choose a month to pay"),
  amount: z.string().min(1, "Amount is required"),
  image: z.instanceof(FileList).optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface BillingPeriod {
  month: string;
  monthLabel: string;
  dueDate: string;
  daysOverdue: number;
  status: "paid" | "pending" | "rejected" | "unpaid" | "overdue" | "upcoming" | "n/a";
  payment: { id: number; amount: string; status: string } | null;
  rentAmount: string;
}

interface BillingPeriodsResponse {
  tenant: { id: number; fullName: string; rentAmount: string };
  periods: BillingPeriod[];
}

export default function TenantPayments() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isGCashOpen, setIsGCashOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState<string | null>(null);
  const { user, tenant } = useAuth();
  const { toast } = useToast();

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ['/api/tenant/payments', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/tenant/payments?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch payments');
      return response.json();
    },
    enabled: !!user,
  });

  const { data: billing } = useQuery<BillingPeriodsResponse>({
    queryKey: [`/api/tenant/billing-periods?userId=${user?.id}`],
    enabled: !!user,
  });

  // Months the tenant can still pay for: unpaid, overdue, previously rejected,
  // or upcoming (allow pre-paying future months).
  const payableMonths = (billing?.periods ?? []).filter(
    (p) =>
      p.status === "unpaid" ||
      p.status === "overdue" ||
      p.status === "rejected" ||
      p.status === "upcoming",
  );

  // Default to the oldest unpaid period (overdue first), so they settle arrears first
  const defaultMonth = payableMonths[0]?.month ?? "";

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      month: defaultMonth,
      amount: tenant?.rentAmount || "",
    },
  });

  // Re-seed default month once billing data arrives or after a successful submission
  useEffect(() => {
    if (!isOpen) return;
    if (defaultMonth && !form.getValues("month")) {
      form.setValue("month", defaultMonth);
    }
  }, [isOpen, defaultMonth, form]);

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/payments/upload", {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/payments'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/dashboard'], refetchType: 'active' });
      toast({ title: "Payment proof uploaded successfully" });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PaymentFormData & { id: number }) => {
      return await apiRequest("PATCH", `/api/payments/${data.id}`, {
        month: data.month,
        amount: data.amount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/payments'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/dashboard'], refetchType: 'active' });
      toast({ title: "Payment updated successfully" });
      setIsEditOpen(false);
      setEditingPayment(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/payments/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/payments'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/dashboard'], refetchType: 'active' });
      toast({ title: "Payment deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    if (editingPayment) {
      updateMutation.mutate({ ...data, id: editingPayment.id });
    } else {
      const formData = new FormData();
      formData.append("tenantId", tenant!.id.toString());
      formData.append("month", data.month);
      formData.append("amount", data.amount);
      
      if (data.image && data.image.length > 0) {
        formData.append("image", data.image[0]);
      }

      uploadMutation.mutate(formData);
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    form.reset({
      month: payment.month,
      amount: payment.amount,
    });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Payments</h1>
          <p className="text-muted-foreground mt-1">
            Upload payment proofs and track status
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={() => setIsGCashOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-pay-gcash"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Pay via GCash
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(true)} data-testid="button-upload-payment">
            <Upload className="h-4 w-4 mr-2" />
            Upload Receipt
          </Button>
        </div>
      </div>

      <GCashPaymentDialog open={isGCashOpen} onOpenChange={setIsGCashOpen} />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Payment Proof</DialogTitle>
              <DialogDescription>
                Upload proof of your rent payment
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {payableMonths.length === 0 ? (
                  <div className="rounded-lg border border-green-200 bg-green-50/60 dark:bg-green-950/10 dark:border-green-900 p-4 text-sm text-green-800 dark:text-green-300" data-testid="text-all-paid">
                    You're all caught up! Every month so far has either been paid
                    or is awaiting verification.
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Month</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-month">
                              <SelectValue placeholder="Choose a month to pay" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {payableMonths.map((p) => (
                              <SelectItem
                                key={p.month}
                                value={p.month}
                                data-testid={`option-month-${p.month}`}
                              >
                                <span className="flex items-center gap-2">
                                  <span>{p.monthLabel}</span>
                                  {p.status === "overdue" && (
                                    <span className="text-xs font-medium text-red-600">
                                      Overdue · {p.daysOverdue}d late
                                    </span>
                                  )}
                                  {p.status === "rejected" && (
                                    <span className="text-xs font-medium text-red-600">
                                      Resubmit
                                    </span>
                                  )}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Overdue months are listed first so you can settle them
                          before the current month.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Amount paid"
                          data-testid="input-amount"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel>Payment Proof (Image)</FormLabel>
                      <FormControl>
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                          <FileImage className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => onChange(e.target.files)}
                            data-testid="input-image"
                            {...field}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Upload a screenshot or photo of your payment receipt
                          </p>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploadMutation.isPending || payableMonths.length === 0}
                    data-testid="button-submit-payment"
                  >
                    {uploadMutation.isPending ? "Uploading..." : "Submit Payment"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>All your payment submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
          ) : payments && payments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date Uploaded</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="font-medium">{formatMonth(payment.month)}</TableCell>
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
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={payment.status} />
                          {payment.status === "rejected" && (payment as any).rejectionNotes && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setRejectionNote((payment as any).rejectionNotes)}
                              data-testid={`button-view-rejection-${payment.id}`}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              View reason
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(payment)}
                            data-testid={`button-edit-payment-${payment.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteId(payment.id)}
                            data-testid={`button-delete-payment-${payment.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No payment history</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first payment proof to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Payment Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent data-testid="dialog-edit-payment">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>
              Update payment details (month and amount only)
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Month</FormLabel>
                    <FormControl>
                      <Input type="month" data-testid="input-edit-month" {...field} />
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
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Amount paid"
                        data-testid="input-edit-amount"
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
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingPayment(null);
                  }}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-payment"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent data-testid="dialog-delete-payment">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this payment record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Payment Proof Dialog */}
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
