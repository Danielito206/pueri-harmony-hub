import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  User, 
  LogOut, 
  Menu, 
  X,
  Home,
  Users,
  BookOpen,
  Image,
  Settings,
  Key,
  ChevronRight,
  CalendarRange
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getNavItems = () => {
    const baseItems = [
      { icon: User, label: 'Mon profil', href: '/profile' },
      { icon: Key, label: 'Mot de passe', href: '/change-password' },
    ];

    switch (user?.role) {
      case 'admin':
        return [
          { icon: Home, label: 'Dashboard', href: '/admin' },
          { icon: CalendarRange, label: 'Années académiques', href: '/admin/academic-years' },
          { icon: Users, label: 'Professeurs', href: '/admin/teachers' },
          { icon: BookOpen, label: 'Classes', href: '/admin/classes' },
          { icon: Users, label: 'Élèves', href: '/admin/students' },
          { icon: Users, label: 'Parents', href: '/admin/parents' },
          { icon: Image, label: 'Galerie', href: '/admin/gallery' },
          ...baseItems,
        ];
      case 'teacher':
        return [
          { icon: Home, label: 'Dashboard', href: '/teacher' },
          { icon: Users, label: 'Mes élèves', href: '/teacher/students' },
          { icon: BookOpen, label: 'Horaire', href: '/teacher/schedule' },
          ...baseItems,
        ];
      case 'parent':
        return [
          { icon: Home, label: 'Dashboard', href: '/parent' },
          { icon: Users, label: 'Mes enfants', href: '/parent/children' },
          ...baseItems,
        ];
      default:
        return baseItems;
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <img
              src="/logo.png"
              alt="C.S Pueri Angeli"
              className="h-9 w-9 rounded-full object-contain bg-white"
            />
            <span className="font-heading text-lg font-semibold">Pueri Angeli</span>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-border">
            <p className="font-medium text-foreground">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border space-y-2">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              Retour au site
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="md:pl-64">
        {/* Top Bar */}
              <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-primary border-b border-primary/20 md:px-6">
          <button
            className="md:hidden p-2 -ml-2 text-primary-foreground"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
            <Link to="/" className="hover:text-primary-foreground">Accueil</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-primary-foreground font-medium capitalize">{user?.role === 'admin' ? 'Administration' : user?.role === 'teacher' ? 'Professeur' : 'Parent'}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-primary-foreground/70 hidden sm:block">
              {user?.email}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
