import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireTenant?: boolean;
}

export function ProtectedRoute({ children, requireAdmin, requireTenant }: ProtectedRouteProps) {
  const { user, isAdmin, isTenant } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/");
      return;
    }

    if (requireAdmin && !isAdmin) {
      setLocation("/");
      return;
    }

    if (requireTenant && !isTenant) {
      setLocation("/");
      return;
    }
  }, [user, isAdmin, isTenant, requireAdmin, requireTenant, setLocation]);

  if (!user) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  if (requireTenant && !isTenant) {
    return null;
  }

  return <>{children}</>;
}
