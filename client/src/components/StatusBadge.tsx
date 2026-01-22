import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Wrench } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusIcon = () => {
    switch (status.toLowerCase()) {
      case "verified":
      case "resolved":
        return <CheckCircle2 className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "in progress":
        return <Wrench className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status.toLowerCase()) {
      case "verified":
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
      case "in progress":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      default:
        return "";
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={`${getStatusColor()} capitalize gap-1.5 flex items-center`}
      data-testid={`badge-status-${status.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {getStatusIcon()}
      {status}
    </Badge>
  );
}
