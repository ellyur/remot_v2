import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, User, Building } from "lucide-react";
import { DataTablePagination } from "@/components/DataTablePagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Tenant, Unit } from "@shared/schema";

const tenantSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string(),
  fullName: z.string().min(1, "Full name is required"),
  contact: z.string().min(1, "Contact is required"),
  unitId: z.string().min(1, "Unit ID is required"),
  occupation: z.string().optional(),
  rentAmount: z.string().min(1, "Rent amount is required"),
  emergencyContact: z.string().optional(),
  moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Move-in date is required"),
}).refine((data) => {
  if (data.password.length > 0 && data.password.length < 6) {
    return false;
  }
  return true;
}, {
  message: "Password must be at least 6 characters",
  path: ["password"],
});

type TenantFormData = z.infer<typeof tenantSchema>;

export default function Tenants() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnitOpen, setIsUnitOpen] = useState(false);
  const [newUnitId, setNewUnitId] = useState("");
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: units } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const createUnitMutation = useMutation({
    mutationFn: async (unitId: string) => {
      return await apiRequest("POST", "/api/units", { unitId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "Unit created successfully" });
      setIsUnitOpen(false);
      setNewUnitId("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      contact: "",
      unitId: "",
      occupation: "",
      rentAmount: "",
      emergencyContact: "",
      moveInDate: new Date().toISOString().slice(0, 10),
    },
  });

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const sortedTenants = useMemo(() => tenants ?? [], [tenants]);
  const pagedTenants = useMemo(
    () => sortedTenants.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedTenants, page],
  );
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(sortedTenants.length / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [sortedTenants.length, page]);

  const createMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      return await apiRequest("POST", "/api/tenants", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "Tenant created successfully" });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<TenantFormData> & { id: number }) => {
      return await apiRequest("PATCH", `/api/tenants/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Tenant updated successfully" });
      setIsOpen(false);
      setEditingTenant(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/tenants/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "Tenant deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    form.reset({
      username: "",
      password: "",
      fullName: tenant.fullName,
      contact: tenant.contact,
      unitId: tenant.unitId,
      occupation: tenant.occupation || "",
      rentAmount: tenant.rentAmount,
      emergencyContact: tenant.emergencyContact || "",
      moveInDate: (tenant as any).moveInDate || new Date().toISOString().slice(0, 10),
    });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingTenant(null);
    form.reset();
  };

  const onSubmit = (data: TenantFormData) => {
    if (editingTenant) {
      updateMutation.mutate({ ...data, id: editingTenant.id });
    } else {
      if (!data.password || data.password.length < 6) {
        form.setError("password", {
          type: "manual",
          message: "Password is required and must be at least 6 characters",
        });
        return;
      }
      createMutation.mutate(data);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage tenant accounts and information
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isUnitOpen} onOpenChange={setIsUnitOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-unit">
                <Building className="h-4 w-4 mr-2" />
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Unit</DialogTitle>
                <DialogDescription>Create a new unit ID for tenants</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Unit ID</label>
                  <Input 
                    placeholder="e.g. Unit 101" 
                    value={newUnitId} 
                    onChange={(e) => setNewUnitId(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUnitOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => createUnitMutation.mutate(newUnitId)}
                  disabled={!newUnitId || createUnitMutation.isPending}
                >
                  Create Unit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-tenant">
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTenant ? "Edit Tenant" : "Add New Tenant"}</DialogTitle>
                <DialogDescription>
                  {editingTenant ? "Update tenant information" : "Create a new tenant account"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Username"
                              disabled={!!editingTenant}
                              data-testid="input-username"
                              {...field}
                            />
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
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={editingTenant ? "Leave empty to keep current" : "Password"}
                              data-testid="input-password"
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
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full Name" data-testid="input-full-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number</FormLabel>
                          <FormControl>
                            <Input placeholder="09xxxxxxxxx" data-testid="input-contact" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit ID</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={!!editingTenant}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-unit-id">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {units?.filter(u => u.status === "available" || u.unitId === editingTenant?.unitId).map((unit) => (
                                <SelectItem key={unit.id} value={unit.unitId}>
                                  {unit.unitId}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="occupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Occupation (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Occupation" data-testid="input-occupation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent Amount</FormLabel>
                          <FormControl>
                            <Input placeholder="5000.00" data-testid="input-rent-amount" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emergencyContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Emergency contact number" data-testid="input-emergency-contact" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="moveInDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Move-in Date</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-move-in-date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-tenant"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : editingTenant
                        ? "Update Tenant"
                        : "Create Tenant"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>View and manage tenant information</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading tenants...</div>
          ) : sortedTenants.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Move-in</TableHead>
                      <TableHead>Occupation</TableHead>
                      <TableHead className="text-right">Monthly Rent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedTenants.map((tenant) => (
                      <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                        <TableCell className="font-medium">{tenant.unitId}</TableCell>
                        <TableCell>{tenant.fullName}</TableCell>
                        <TableCell>{tenant.contact}</TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-move-in-${tenant.id}`}>
                          {(tenant as any).moveInDate
                            ? new Date((tenant as any).moveInDate + "T00:00:00").toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>{tenant.occupation || "—"}</TableCell>
                        <TableCell className="text-right font-semibold">₱{tenant.rentAmount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(tenant)}
                              data-testid={`button-edit-${tenant.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteId(tenant.id)}
                              data-testid={`button-delete-${tenant.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination
                page={page}
                pageSize={PAGE_SIZE}
                totalItems={sortedTenants.length}
                onPageChange={setPage}
                testIdPrefix="pagination-tenants"
              />
            </>
          ) : (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No tenants yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by adding your first tenant
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tenant account and all associated data (payments, maintenance reports). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
