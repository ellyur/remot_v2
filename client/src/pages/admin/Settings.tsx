import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Settings as SettingsIcon, CreditCard, Bell, Calendar, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const settingsSchema = z.object({
  gcash_number: z.string().min(1, "GCash number is required"),
  gcash_name: z.string().min(1, "GCash account name is required"),
  payment_due_day: z.string().min(1, "Payment due day is required"),
  landlord_name: z.string().min(1, "Landlord name is required"),
  landlord_contact: z.string().optional(),
  landlord_email: z.string().email().optional().or(z.literal("")),
  property_address: z.string().optional(),
  payment_instructions: z.string().optional(),
  send_payment_reminders: z.string().optional(),
  reminder_days_before: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

function TestSMSCard() {
  const [testPhone, setTestPhone] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast({ title: "Error", description: "Please enter a phone number", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const response = await apiRequest("POST", "/api/sms/test", { phoneNumber: testPhone });
      const data = await response.json();
      
      if (data.success) {
        toast({ title: "Success", description: "Test SMS sent! Check your phone." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to send SMS", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send SMS", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Test SMS Connection
        </CardTitle>
        <CardDescription>
          Send a test SMS to verify PhilSMS is working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="09xxxxxxxxx"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            data-testid="input-test-phone"
          />
          <Button 
            onClick={handleTestSMS} 
            disabled={isSending}
            data-testid="button-send-test-sms"
          >
            {isSending ? "Sending..." : "Send Test"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter your phone number to receive a test SMS message
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      gcash_number: "",
      gcash_name: "",
      payment_due_day: "5",
      landlord_name: "",
      landlord_contact: "",
      landlord_email: "",
      property_address: "",
      payment_instructions: "Please send payment to the GCash number above and upload the screenshot as proof of payment.",
      send_payment_reminders: "true",
      reminder_days_before: "3",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        gcash_number: settings.gcash_number || "",
        gcash_name: settings.gcash_name || "",
        payment_due_day: settings.payment_due_day || "5",
        landlord_name: settings.landlord_name || "",
        landlord_contact: settings.landlord_contact || "",
        landlord_email: settings.landlord_email || "",
        property_address: settings.property_address || "",
        payment_instructions: settings.payment_instructions || "Please send payment to the GCash number above and upload the screenshot as proof of payment.",
        send_payment_reminders: settings.send_payment_reminders || "true",
        reminder_days_before: settings.reminder_days_before || "3",
      });
    }
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return await apiRequest("POST", "/api/settings", { settings: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your landlord and payment settings
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="payment" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="payment" data-testid="tab-payment">
                <CreditCard className="h-4 w-4 mr-2" />
                Payment
              </TabsTrigger>
              <TabsTrigger value="landlord" data-testid="tab-landlord">
                <SettingsIcon className="h-4 w-4 mr-2" />
                Landlord Info
              </TabsTrigger>
              <TabsTrigger value="reminders" data-testid="tab-reminders">
                <Bell className="h-4 w-4 mr-2" />
                Reminders
              </TabsTrigger>
            </TabsList>

            <TabsContent value="payment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    GCash Payment Settings
                  </CardTitle>
                  <CardDescription>
                    Configure your GCash details for tenant payments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="gcash_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GCash Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="09xxxxxxxxx" 
                              data-testid="input-gcash-number"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Your GCash mobile number for receiving payments
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gcash_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GCash Account Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Juan Dela Cruz" 
                              data-testid="input-gcash-name"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Name registered with GCash
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="payment_instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Instructions for tenants on how to pay..."
                            className="min-h-[100px]"
                            data-testid="input-payment-instructions"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          These instructions will be shown to tenants when they pay
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Payment Due Date
                  </CardTitle>
                  <CardDescription>
                    Set when rent payments are due each month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="payment_due_day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Day of Month</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="28" 
                            placeholder="5"
                            className="w-32"
                            data-testid="input-due-day"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Day of the month when rent is due (1-28). Payments after this day will be marked as overdue.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="landlord" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Landlord Information</CardTitle>
                  <CardDescription>
                    Your contact information for invoices and communications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="landlord_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Landlord / Property Manager Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="RETMOT Property Management" 
                            data-testid="input-landlord-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="landlord_contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="09xxxxxxxxx" 
                              data-testid="input-landlord-contact"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="landlord_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="email@example.com" 
                              data-testid="input-landlord-email"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="property_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="123 Main Street, City, Province"
                            data-testid="input-property-address"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          This will appear on invoices
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reminders" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Payment Reminders
                  </CardTitle>
                  <CardDescription>
                    Configure SMS reminders for tenants using PhilSMS
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="send_payment_reminders"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Payment Reminders</FormLabel>
                          <FormDescription>
                            Automatically send SMS reminders to tenants before payment due date
                          </FormDescription>
                        </div>
                        <FormControl>
                          <input 
                            type="checkbox" 
                            checked={field.value === "true"}
                            onChange={(e) => field.onChange(e.target.checked ? "true" : "false")}
                            data-testid="checkbox-enable-reminders"
                            className="rounded border-gray-300"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("send_payment_reminders") === "true" && (
                    <FormField
                      control={form.control}
                      name="reminder_days_before"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Days Before Due Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="30" 
                              placeholder="3"
                              data-testid="input-reminder-days"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Number of days before the payment due date to send the reminder (1-30 days)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                    <p className="font-semibold mb-2">How it works:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Reminders are sent via SMS using PhilSMS</li>
                      <li>Tenants receive SMS notifications before their payment due date</li>
                      <li>Reminders also sent when payments are verified</li>
                      <li>All SMS notifications require active PhilSMS account</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <TestSMSCard />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="gap-2"
              data-testid="button-save-settings"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
