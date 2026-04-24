import { Home, Users, DollarSign, Wrench, LogOut, Settings, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import retmotLogo from "@assets/retmotLogo-removebg-preview_1761667317022.png";

const menuItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: Home,
  },
  {
    title: "Tenants",
    url: "/admin/tenants",
    icon: Users,
  },
  {
    title: "Payments",
    url: "/admin/payments",
    icon: DollarSign,
  },
  {
    title: "Maintenance",
    url: "/admin/maintenance",
    icon: Wrench,
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: payments } = useQuery<any[]>({
    queryKey: ["/api/payments"],
  });
  const { data: reports } = useQuery<any[]>({
    queryKey: ["/api/maintenance"],
  });

  const newPayments = payments?.filter((payment) => payment.status === "pending").length || 0;
  const newMaintenance = reports?.filter((report) => report.status === "pending").length || 0;

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold mb-4">
            <div className="flex items-center gap-2">
              <img src={retmotLogo} alt="RETMOT" className="h-8 w-auto" />
              <Badge variant="outline" className="text-xs">Admin</Badge>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.title === "Payments" && newPayments > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-xs">
                          {newPayments}
                        </Badge>
                      )}
                      {item.title === "Maintenance" && newMaintenance > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-xs">
                          {newMaintenance}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-sm text-muted-foreground mb-2">
          Logged in as: <span className="font-medium">{user?.username}</span>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
