import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, FileText, Upload, Plus, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { signOut, profile } = useAuth();

  const navItems = [
    { path: "/admin", label: "Dashboard", icon: FileText },
    { path: "/admin/intelligence", label: "Intelligence", icon: Settings },
    { path: "/admin/levels", label: "Gestionar Niveles", icon: Settings },
    { path: "/admin/questions-bulk", label: "Subir Preguntas", icon: Upload },
    { path: "/admin/questions-manual", label: "Añadir Preguntas", icon: Plus },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-primary mb-2">Panel de Administración</h1>
            <p className="text-muted-foreground">Gestiona niveles y preguntas del quiz</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{profile?.email}</span>
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                {profile?.role}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Button
                key={item.path}
                asChild
                variant={isActive ? "default" : "outline"}
                className="min-w-[180px]"
              >
                <Link to={item.path}>
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};