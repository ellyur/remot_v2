import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  testIdPrefix?: string;
}

export function DataTablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  testIdPrefix = "pagination",
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(totalItems, safePage * pageSize);

  if (totalItems <= pageSize) {
    return (
      <div className="text-sm text-muted-foreground mt-4" data-testid={`${testIdPrefix}-summary`}>
        Showing {totalItems} of {totalItems}
      </div>
    );
  }

  const pageNumbers: (number | "ellipsis")[] = [];
  const push = (n: number | "ellipsis") => pageNumbers.push(n);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) push(i);
  } else {
    push(1);
    if (safePage > 3) push("ellipsis");
    const startN = Math.max(2, safePage - 1);
    const endN = Math.min(totalPages - 1, safePage + 1);
    for (let i = startN; i <= endN; i++) push(i);
    if (safePage < totalPages - 2) push("ellipsis");
    push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
      <div className="text-sm text-muted-foreground" data-testid={`${testIdPrefix}-summary`}>
        Showing {start}–{end} of {totalItems}
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          data-testid={`${testIdPrefix}-prev`}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Prev</span>
        </Button>
        {pageNumbers.map((n, idx) =>
          n === "ellipsis" ? (
            <span key={`e-${idx}`} className="px-2 text-muted-foreground text-sm">
              …
            </span>
          ) : (
            <Button
              key={n}
              variant={n === safePage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(n)}
              className="min-w-[36px]"
              data-testid={`${testIdPrefix}-page-${n}`}
            >
              {n}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          data-testid={`${testIdPrefix}-next`}
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
