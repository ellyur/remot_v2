import { useState } from "react";
import { Home, DollarSign, Wrench, User, LogOut, Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import retmotLogo from "@assets/retmotLogo-removebg-preview_1761667317022.png";

const menuItems = [
  {
    title: "Dashboard",
    url: "/tenant",
    icon: Home,
  },
  {
    title: "My Payments",
    url: "/tenant/payments",
    icon: DollarSign,
  },
  {
    title: "Maintenance",
    url: "/tenant/maintenance",
    icon: Wrench,
  },
  {
    title: "Profile",
    url: "/tenant/profile",
    icon: User,
  },
];

export function TenantHeader() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, tenant, logout } = useAuth();

  return (
    <header className="border-b bg-card">
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2">
            <img src={retmotLogo} alt="RETMOT" className="h-8 w-auto" />
            <Badge variant="secondary" className="text-xs">Tenant</Badge>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {menuItems.map((item) => (
              <Link key={item.title} href={item.url}>
                <Button
                  variant={location === item.url ? "secondary" : "ghost"}
                  size="sm"
                  data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.title}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium">{user?.username}</div>
            <div className="text-xs text-muted-foreground">
              Unit: {tenant?.unitId || "N/A"}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            data-testid="button-logout"
            className="hidden sm:flex"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>

          {/* Mobile menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden" data-testid="button-mobile-menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-4">
                <div className="pb-4 border-b">
                  <div className="text-sm font-medium">{user?.username}</div>
                  <div className="text-xs text-muted-foreground">
                    Unit: {tenant?.unitId || "N/A"}
                  </div>
                </div>
                <nav className="flex flex-col gap-2">
                  {menuItems.map((item) => (
                    <Link key={item.title} href={item.url}>
                      <Button
                        variant={location === item.url ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid={`mobile-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.title}
                      </Button>
                    </Link>
                  ))}
                </nav>
                <Button
                  variant="outline"
                  className="w-full justify-start mt-4"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  data-testid="mobile-button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
