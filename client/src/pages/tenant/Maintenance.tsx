import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, FileImage, Wrench, Eye, Edit, Trash2, MessageCircle, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StatusBadge } from "@/components/StatusBadge";
import type { MaintenanceReport } from "@shared/schema";

const reportSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  image: z.instanceof(FileList).optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

export default function TenantMaintenance() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<MaintenanceReport | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<MaintenanceReport | null>(null);
  const { user, tenant } = useAuth();
  const { toast } = useToast();

  const { data: reports, isLoading } = useQuery<MaintenanceReport[]>({
    queryKey: ['/api/tenant/maintenance', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/tenant/maintenance?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch maintenance reports');
      return response.json();
    },
    enabled: !!user,
  });

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      description: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/maintenance/submit", {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Submission failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/maintenance'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/dashboard'], refetchType: 'active' });
      toast({ title: "Maintenance report submitted successfully" });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ReportFormData & { id: number }) => {
      return await apiRequest("PATCH", `/api/maintenance/${data.id}`, {
        description: data.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/maintenance'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/dashboard'], refetchType: 'active' });
      toast({ title: "Maintenance report updated successfully" });
      setIsEditOpen(false);
      setEditingReport(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/maintenance/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/maintenance'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/dashboard'], refetchType: 'active' });
      toast({ title: "Maintenance report deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ReportFormData) => {
    if (editingReport) {
      updateMutation.mutate({ ...data, id: editingReport.id });
    } else {
      const formData = new FormData();
      formData.append("tenantId", tenant!.id.toString());
      formData.append("description", data.description);
      if (data.image && data.image.length > 0) {
        formData.append("image", data.image[0]);
      }
      submitMutation.mutate(formData);
    }
  };

  const handleEdit = (report: MaintenanceReport) => {
    setEditingReport(report);
    form.reset({ description: report.description });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Maintenance Requests</h1>
          <p className="text-muted-foreground mt-1">
            Report and track maintenance issues
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-submit-report">
              <Plus className="h-4 w-4 mr-2" />
              Submit Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Maintenance Report</DialogTitle>
              <DialogDescription>
                Describe the maintenance issue you're experiencing
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the maintenance issue in detail..."
                          className="min-h-32"
                          data-testid="input-description"
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
                      <FormLabel>Image (Optional)</FormLabel>
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
                            Upload a photo of the issue (optional)
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
                    disabled={submitMutation.isPending}
                    data-testid="button-submit-maintenance"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit Report"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
        ) : reports && reports.length > 0 ? (
          reports.map((report) => {
            const hasAdminMessage = !!(report as any).adminMessage;
            return (
              <Card key={report.id} data-testid={`card-maintenance-${report.id}`}>
                <CardContent className="pt-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={report.status} />
                        {hasAdminMessage && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <MessageCircle className="h-3 w-3" />
                            Admin replied
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.dateReported).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-sm leading-relaxed line-clamp-3">{report.description}</p>

                      {/* Admin message — visible to tenant */}
                      {hasAdminMessage && (
                        <div className="mt-2 rounded-md border-l-4 border-primary bg-primary/5 px-3 py-2">
                          <div className="flex items-center gap-1 mb-1">
                            <MessageCircle className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-semibold text-primary">Admin Update</span>
                          </div>
                          <p className="text-sm">{(report as any).adminMessage}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingReport(report)}
                        data-testid={`button-view-maintenance-${report.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {report.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(report)}
                            data-testid={`button-edit-maintenance-${report.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteId(report.id)}
                            data-testid={`button-delete-maintenance-${report.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No maintenance reports</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Submit a report if you're experiencing any maintenance issues
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View full report dialog */}
      <Dialog open={viewingReport !== null} onOpenChange={() => setViewingReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Maintenance Report</DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={viewingReport.status} />
                <span className="text-sm text-muted-foreground">
                  {new Date(viewingReport.dateReported).toLocaleDateString()}
                </span>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Your report</p>
                <p className="text-sm whitespace-pre-wrap">{viewingReport.description}</p>
              </div>

              {(viewingReport as any).adminMessage && (
                <div className="rounded-md border-l-4 border-primary bg-primary/5 px-3 py-3 space-y-1">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">Admin Update</span>
                  </div>
                  <p className="text-sm">{(viewingReport as any).adminMessage}</p>
                </div>
              )}

              {viewingReport.imagePath && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Attached image</p>
                  <img
                    src={`/${viewingReport.imagePath}`}
                    alt="Maintenance report"
                    className="max-w-full rounded-lg border"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent data-testid="dialog-edit-maintenance">
          <DialogHeader>
            <DialogTitle>Edit Maintenance Report</DialogTitle>
            <DialogDescription>
              Update the description of your maintenance report
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the maintenance issue in detail..."
                        className="min-h-32"
                        data-testid="input-edit-description"
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
                  onClick={() => { setIsEditOpen(false); setEditingReport(null); }}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-maintenance"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent data-testid="dialog-delete-maintenance">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Maintenance Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this maintenance report. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image viewer */}
      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Maintenance Report Image</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="flex justify-center">
              <img
                src={selectedImage}
                alt="Maintenance report"
                className="max-w-full max-h-[70vh] rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
