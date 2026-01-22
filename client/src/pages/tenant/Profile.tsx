import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { User, Home, Phone, Briefcase, DollarSign, AlertCircle, Edit, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";

const editTenantSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  contact: z.string().min(1, "Contact is required"),
  occupation: z.string().optional(),
  emergencyContact: z.string().optional(),
  password: z.string().optional(),
}).refine((data) => {
  if (data.password && data.password.length > 0 && data.password.length < 6) {
    return false;
  }
  return true;
}, {
  message: "Password must be at least 6 characters if provided",
  path: ["password"],
});

type EditTenantFormData = z.infer<typeof editTenantSchema>;

interface KasunduanData {
  kasunduan: {
    id: number;
    accepted: boolean;
    dateAccepted: string | null;
  } | null;
  tenant: {
    id: number;
    fullName: string;
    unitId: string;
    rentAmount: string;
  };
}

export default function TenantProfile() {
  const { user, tenant, logout } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isKasunduanOpen, setIsKasunduanOpen] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: kasunduanData, isLoading: isLoadingKasunduan } = useQuery<KasunduanData>({
    queryKey: ["/api/kasunduan/view", tenant?.id],
    enabled: isKasunduanOpen && !!tenant?.id,
  });

  const form = useForm<EditTenantFormData>({
    resolver: zodResolver(editTenantSchema),
    defaultValues: {
      fullName: "",
      contact: "",
      occupation: "",
      emergencyContact: "",
      password: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditTenantFormData) => {
      if (!tenant) throw new Error("Tenant not found");
      return await apiRequest("PATCH", `/api/tenants/${tenant.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Profile updated successfully" });
      setIsEditOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!tenant) throw new Error("Tenant not found");
      return await apiRequest("DELETE", `/api/tenants/${tenant.id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Account deleted successfully" });
      setTimeout(() => {
        logout();
        setLocation("/");
      }, 1000);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = () => {
    if (tenant) {
      form.reset({
        fullName: tenant.fullName,
        contact: tenant.contact,
        occupation: tenant.occupation || "",
        emergencyContact: tenant.emergencyContact || "",
        password: "",
      });
      setIsEditOpen(true);
    }
  };

  const handleSubmit = (data: EditTenantFormData) => {
    const updateData = { ...data };
    if (!updateData.password || updateData.password.trim() === "") {
      delete updateData.password;
    }
    updateMutation.mutate(updateData);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const profileItems = [
    {
      icon: User,
      label: "Full Name",
      value: tenant?.fullName || "—",
    },
    {
      icon: Home,
      label: "Unit ID",
      value: tenant?.unitId || "—",
    },
    {
      icon: Phone,
      label: "Contact Number",
      value: tenant?.contact || "—",
    },
    {
      icon: Briefcase,
      label: "Occupation",
      value: tenant?.occupation || "—",
    },
    {
      icon: DollarSign,
      label: "Monthly Rent",
      value: tenant?.rentAmount ? `₱${tenant.rentAmount}` : "—",
    },
    {
      icon: AlertCircle,
      label: "Emergency Contact",
      value: tenant?.emergencyContact || "—",
    },
  ];

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Profile</h1>
            <p className="text-muted-foreground mt-1">
              Your personal information
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsKasunduanOpen(true)}
              data-testid="button-view-kasunduan"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Kasunduan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              data-testid="button-edit-profile"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
              data-testid="button-delete-account"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>View your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Username</div>
                  <div className="font-medium">{user?.username || "—"}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
            <CardDescription>Your registered tenant details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {profileItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-4 rounded-lg border"
                  data-testid={`profile-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">{item.label}</div>
                    <div className="font-medium">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-edit-profile">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information. Leave password blank to keep it unchanged.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-fullname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occupation (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-occupation" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-emergency-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Leave blank to keep current password"
                        {...field}
                        data-testid="input-password"
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
                  onClick={() => setIsEditOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Kasunduan Dialog */}
      <Dialog open={isKasunduanOpen} onOpenChange={setIsKasunduanOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]" data-testid="dialog-view-kasunduan">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center">Kasunduan ng Pagpapaupa</DialogTitle>
            <DialogDescription className="text-center">
              Rental Agreement
              {kasunduanData?.kasunduan?.accepted && (
                <span className="block mt-2 text-green-600 font-medium">
                  ✓ Accepted on {kasunduanData.kasunduan.dateAccepted ? format(new Date(kasunduanData.kasunduan.dateAccepted), "MMMM dd, yyyy") : "N/A"}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] w-full border rounded-lg p-6 bg-muted/30">
            {isLoadingKasunduan ? (
              <div className="text-center py-8 text-muted-foreground">Loading kasunduan...</div>
            ) : (
              <div className="prose prose-sm max-w-none space-y-4">
                <h3 className="text-lg font-semibold">KASUNDUAN NG PAGPAPAUPA</h3>
                
                <p>
                  Ang kasulatang ito ay ginawa at nilagdaan ngayong __________ sa pagitan ng:
                </p>

                <p className="font-semibold">MAY-ARI NG BAHAY / LANDLORD:</p>
                <p>RETMOT Property Management</p>

                <p className="font-semibold">AT</p>

                <p className="font-semibold">NANGUNGUPAHAN / TENANT:</p>
                <p>{kasunduanData?.tenant?.fullName || tenant?.fullName || "[Tenant Name]"}, Unit {kasunduanData?.tenant?.unitId || tenant?.unitId || "[Unit ID]"}</p>

                <h4 className="font-semibold mt-4">I. LAYUNIN</h4>
                <p>
                  Ang kasulatang ito ay naglalaman ng mga tuntunin at kondisyon ng pag-upa ng apartment/unit 
                  na pagmamay-ari ng may-ari sa nasabing tenant.
                </p>

                <h4 className="font-semibold mt-4">II. HALAGANG BAYAD (RENT)</h4>
                <p>
                  Ang buwanang upa ay nagkakahalaga ng ₱{kasunduanData?.tenant?.rentAmount || tenant?.rentAmount || "[Rent Amount]"}. 
                  Ang bayad ay dapat bayaran bawat ika-1 ng buwan.
                </p>

                <h4 className="font-semibold mt-4">III. TERMINO NG PAG-UPA</h4>
                <p>
                  Ang kasunduang ito ay may bisa mula sa petsa ng pagtanggap hanggang sa susunod na abiso 
                  ng alinman sa dalawang partido.
                </p>

                <h4 className="font-semibold mt-4">IV. DEPOSITO</h4>
                <p>
                  Ang deposito ay katumbas ng isang (1) buwan na upa. Ito ay ibabalik sa tenant pagkatapos 
                  ng kanyang paglipat, pagkatapos masuri na ang unit ay nasa mabuting kalagayan.
                </p>

                <h4 className="font-semibold mt-4">V. RESPONSIBILIDAD NG TENANT</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Panatilihing malinis at maayos ang unit</li>
                  <li>Magbayad ng upa sa takdang panahon</li>
                  <li>Iulat agad ang anumang sira o problema sa unit</li>
                  <li>Hindi pahihintulutan ang mga aktibidad na nakakasagabal sa kapwa tenant</li>
                  <li>Huwag gagawa ng mga pagbabago sa unit nang walang pahintulot</li>
                </ul>

                <h4 className="font-semibold mt-4">VI. RESPONSIBILIDAD NG MAY-ARI</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Siguraduhing ang unit ay ligtas at nakakatira</li>
                  <li>Mag-ayos ng mga importanteng sira sa loob ng makatwirang panahon</li>
                  <li>Respetuhin ang privacy ng tenant</li>
                  <li>Magbigay ng advance notice para sa inspeksyon</li>
                </ul>

                <h4 className="font-semibold mt-4">VII. PAGTATAPOS NG KASUNDUAN</h4>
                <p>
                  Ang alinman sa dalawang partido ay maaaring tapusin ang kasunduang ito sa pamamagitan ng 
                  pagbibigay ng tatlumpung (30) araw na advance notice sa isa't isa.
                </p>

                <h4 className="font-semibold mt-4">VIII. IBA PANG TUNTUNIN</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Bawal ang mga alagang hayop maliban kung may nakasulat na pahintulot</li>
                  <li>Ang tenant ay responsable sa kanilang mga bisita</li>
                  <li>Sundin ang mga patakaran ng building/property</li>
                  <li>Ang labag sa kasunduang ito ay maaaring maging sanhi ng pagtatapos nito</li>
                </ul>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setIsKasunduanOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent data-testid="dialog-delete-account">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
