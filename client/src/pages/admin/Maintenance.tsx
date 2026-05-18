import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Eye, Wrench, MessageSquare } from "lucide-react";
import { DataTablePagination } from "@/components/DataTablePagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StatusBadge } from "@/components/StatusBadge";
import type { MaintenanceReportWithTenant } from "@shared/schema";

export default function AdminMaintenance() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<MaintenanceReportWithTenant | null>(null);
  const [updateReport, setUpdateReport] = useState<MaintenanceReportWithTenant | null>(null);
  const [updateStatus, setUpdateStatus] = useState("pending");
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const { toast } = useToast();

  const { data: reports, isLoading } = useQuery<MaintenanceReportWithTenant[]>({
    queryKey: ["/api/maintenance"],
  });

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const sortedReports = useMemo(() => reports ?? [], [reports]);
  const pagedReports = useMemo(
    () => sortedReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedReports, page],
  );
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(sortedReports.length / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [sortedReports.length, page]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminMessage, adminNotes }: { id: number; status: string; adminMessage: string; adminNotes: string }) => {
      return await apiRequest("PATCH", `/api/maintenance/${id}/status`, { status, adminMessage, adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({ title: "Maintenance report updated" });
      setUpdateReport(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openUpdateDialog = (report: MaintenanceReportWithTenant) => {
    setUpdateReport(report);
    setUpdateStatus(report.status);
    setUpdateMessage((report as any).adminMessage ?? "");
    setUpdateNotes((report as any).adminNotes ?? "");
  };

  const handleSaveUpdate = () => {
    if (!updateReport) return;
    updateStatusMutation.mutate({
      id: updateReport.id,
      status: updateStatus,
      adminMessage: updateMessage,
      adminNotes: updateNotes,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Maintenance Requests</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage maintenance reports
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Maintenance Reports</CardTitle>
          <CardDescription>Review and update status of maintenance requests</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
          ) : sortedReports.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date Reported</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedReports.map((report) => (
                    <TableRow key={report.id} data-testid={`row-maintenance-${report.id}`}>
                      <TableCell className="font-medium">{report.tenant.fullName}</TableCell>
                      <TableCell>{report.tenant.unitId}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="line-clamp-2 mb-2">{report.description}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReport(report)}
                          data-testid={`button-view-description-${report.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Full
                        </Button>
                      </TableCell>
                      <TableCell>
                        {new Date(report.dateReported).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {report.imagePath ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedImage(`/${report.imagePath}`)}
                            data-testid={`button-view-image-${report.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">No image</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={report.status} />
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        {(report as any).adminMessage ? (
                          <p className="text-sm line-clamp-2 text-muted-foreground">
                            {(report as any).adminMessage}
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => openUpdateDialog(report)}
                          data-testid={`button-update-${report.id}`}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataTablePagination
                page={page}
                pageSize={PAGE_SIZE}
                totalItems={sortedReports.length}
                onPageChange={setPage}
                testIdPrefix="pagination-maintenance"
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No maintenance reports</h3>
              <p className="text-sm text-muted-foreground">
                Reports will appear here once tenants submit them
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Status + Message Dialog */}
      <Dialog open={updateReport !== null} onOpenChange={() => setUpdateReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Maintenance Report</DialogTitle>
            <DialogDescription>
              Change the status and leave a message for {updateReport?.tenant.fullName} (Unit {updateReport?.tenant.unitId})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={updateStatus} onValueChange={setUpdateStatus}>
                <SelectTrigger data-testid="select-update-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Message to Tenant
                <span className="ml-1 text-xs text-muted-foreground">(visible to tenant)</span>
              </Label>
              <Input
                placeholder='e.g. "Papunta na ang technician bukas"'
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                data-testid="input-admin-message"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Internal Notes
                <span className="ml-1 text-xs text-muted-foreground">(admin only)</span>
              </Label>
              <Textarea
                placeholder="e.g. Tools needed: wrench, pipe sealant. Need to buy replacement faucet."
                className="min-h-24 resize-none"
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                data-testid="input-admin-notes"
              />
            </div>

            {updateReport && (
              <div className="space-y-2">
                <div className="rounded-md border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Tenant's report</p>
                  <p className="text-sm whitespace-pre-wrap">{updateReport.description}</p>
                </div>
                {(updateReport as any).tenantReply && (
                  <div className="rounded-md border-l-4 border-orange-400 bg-orange-50 dark:bg-orange-950/20 px-3 py-2">
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">Tenant replied</p>
                    <p className="text-sm whitespace-pre-wrap">{(updateReport as any).tenantReply}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateReport(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveUpdate}
              disabled={updateStatusMutation.isPending}
              data-testid="button-save-update"
            >
              {updateStatusMutation.isPending ? "Saving..." : "Save Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Full description viewer */}
      <Dialog open={selectedReport !== null} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Maintenance Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Tenant</h3>
                <p className="text-base font-medium">{selectedReport.tenant.fullName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Unit</h3>
                <p className="text-base">{selectedReport.tenant.unitId}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Date Reported</h3>
                <p className="text-base">{new Date(selectedReport.dateReported).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                <StatusBadge status={selectedReport.status} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p className="text-base whitespace-pre-wrap">{selectedReport.description}</p>
              </div>
              {(selectedReport as any).adminMessage && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Message to Tenant</h3>
                  <p className="text-base whitespace-pre-wrap">{(selectedReport as any).adminMessage}</p>
                </div>
              )}
              {(selectedReport as any).adminNotes && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Internal Notes</h3>
                  <p className="text-base whitespace-pre-wrap text-muted-foreground">{(selectedReport as any).adminNotes}</p>
                </div>
              )}
              {selectedReport.imagePath && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Attached Image</h3>
                  <img
                    src={`/${selectedReport.imagePath}`}
                    alt="Maintenance report"
                    className="max-w-full rounded-lg border"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
