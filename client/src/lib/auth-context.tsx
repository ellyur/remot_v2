import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Tenant } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  login: (user: User, tenant?: Tenant) => void;
  logout: () => void;
  isAdmin: boolean;
  isTenant: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedTenant = localStorage.getItem("tenant");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedTenant) {
      setTenant(JSON.parse(storedTenant));
    }
  }, []);

  const login = (newUser: User, newTenant?: Tenant) => {
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
    
    if (newTenant) {
      setTenant(newTenant);
      localStorage.setItem("tenant", JSON.stringify(newTenant));
    }
  };

  const logout = () => {
    setUser(null);
    setTenant(null);
    localStorage.removeItem("user");
    localStorage.removeItem("tenant");
  };

  const isAdmin = user?.role === "admin";
  const isTenant = user?.role === "tenant";

  return (
    <AuthContext.Provider value={{ user, tenant, login, logout, isAdmin, isTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
