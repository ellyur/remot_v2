import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { DataTablePagination } from "@/components/DataTablePagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StatusBadge } from "@/components/StatusBadge";
import type { MaintenanceReportWithTenant } from "@shared/schema";
import { Wrench } from "lucide-react";

export default function AdminMaintenance() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<MaintenanceReportWithTenant | null>(null);
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
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/maintenance/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({ title: "Status updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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
                      <TableCell className="text-right">
                        <Select
                          value={report.status}
                          onValueChange={(status) =>
                            updateStatusMutation.mutate({ id: report.id, status })
                          }
                          disabled={updateStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-status-${report.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
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
