import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Smartphone, Upload, CheckCircle2, Copy, QrCode } from "lucide-react";
import gcashQrCode from "@assets/image_1765428713462.png";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/queryClient";

const paymentSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  amount: z.string().min(1, "Amount is required"),
  image: z.instanceof(FileList).refine((files) => files.length > 0, "Payment proof is required"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface GCashPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GCashPaymentDialog({ open, onOpenChange }: GCashPaymentDialogProps) {
  const [step, setStep] = useState<"info" | "upload">("info");
  const [copied, setCopied] = useState(false);
  const { tenant } = useAuth();
  const { toast } = useToast();

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      month: new Date().toISOString().slice(0, 7),
      amount: tenant?.rentAmount || "",
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/dashboard"] });
      toast({ 
        title: "Payment submitted successfully",
        description: "The landlord will be notified and verify your payment soon.",
      });
      onOpenChange(false);
      setStep("info");
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCopyNumber = () => {
    if (settings?.gcash_number) {
      navigator.clipboard.writeText(settings.gcash_number);
      setCopied(true);
      toast({ title: "GCash number copied!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleProceedToUpload = () => {
    setStep("upload");
  };

  const onSubmit = (data: PaymentFormData) => {
    const formData = new FormData();
    formData.append("tenantId", tenant!.id.toString());
    formData.append("month", data.month);
    formData.append("amount", data.amount);
    
    if (data.image && data.image.length > 0) {
      formData.append("image", data.image[0]);
    }

    uploadMutation.mutate(formData);
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep("info");
    form.reset();
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-lg sm:max-w-6xl sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-500" />
            Pay with GCash
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === "info" 
              ? "Send payment via GCash or scan the QR code below"
              : "Upload your payment proof"
            }
          </DialogDescription>
        </DialogHeader>

        {step === "info" ? (
          <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-6 sm:space-y-0">
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto bg-white p-2 rounded-lg shadow-md inline-block">
                    <img 
                      src={gcashQrCode} 
                      alt="GCash QR Code" 
                      className="w-56 h-56 object-contain"
                      data-testid="img-gcash-qr"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Scan QR code or send to number below</p>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">GCash Number</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {settings?.gcash_number || "Not configured"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyNumber}
                        disabled={!settings?.gcash_number}
                        data-testid="button-copy-gcash"
                      >
                        {copied ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Account Name</p>
                    <p className="font-semibold">{settings?.gcash_name || "Not configured"}</p>
                  </div>

                </div>
              </CardContent>
            </Card>

            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="pt-4 sm:pt-0">
                  <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    ₱{tenant?.rentAmount || "0.00"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    For {formatMonth(new Date().toISOString().slice(0, 7))}
                  </p>
                </div>

                {settings?.payment_instructions && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Instructions:</p>
                    <p className="text-sm text-muted-foreground">Send payment to the landlord's GCash account</p>
                  </div>
                )}
              </div>

              <DialogFooter className="sm:justify-start">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleProceedToUpload}
                  disabled={!settings?.gcash_number}
                  data-testid="button-proceed-upload"
                >
                  I've Sent the Payment
                </Button>
              </DialogFooter>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Month</FormLabel>
                    <FormControl>
                      <Input 
                        type="month" 
                        data-testid="input-payment-month"
                        {...field} 
                      />
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
                    <FormLabel>Amount Paid</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="5000.00"
                        data-testid="input-payment-amount"
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
                    <FormLabel>Payment Proof (Screenshot)</FormLabel>
                    <FormControl>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Upload your GCash payment screenshot
                        </p>
                        <Input
                          type="file"
                          accept="image/*"
                          className="cursor-pointer"
                          onChange={(e) => onChange(e.target.files)}
                          data-testid="input-payment-proof"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep("info")}
                >
                  Back
                </Button>
                <Button 
                  type="submit"
                  disabled={uploadMutation.isPending}
                  data-testid="button-submit-payment"
                >
                  {uploadMutation.isPending ? "Submitting..." : "Submit Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
