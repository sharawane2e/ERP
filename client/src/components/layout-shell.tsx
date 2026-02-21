import { ReactNode } from "react";
import { useLogout } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/branding-context";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Bell,
  Search,
  Users,
  FolderKanban,
  Palette,
  UserCog
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutShellProps {
  children: ReactNode;
  user: { name: string; username: string } | null | undefined;
}

export function LayoutShell({ children, user }: LayoutShellProps) {
  const [location] = useLocation();
  const { mutate: logout } = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { branding } = useBranding();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'User Management', href: '/users', icon: UserCog },
    { name: 'Branding', href: '/branding', icon: Palette },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-slate-200">
        <div className="flex justify-center">
          {branding?.logoUrl ? (
            <img 
              src={branding.logoUrl} 
              alt="Company Logo" 
              className="h-12 max-w-[200px] object-contain"
              data-testid="img-sidebar-logo"
            />
          ) : (
            <h1 className="font-display font-bold text-xl text-slate-900">REVIRAAPP</h1>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href} className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
              ${isActive 
                ? 'bg-[#da2032] text-white' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }
            `}>
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-slate-200">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} />
              <AvatarFallback className="bg-slate-200 text-slate-700">{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.username}</p>
            </div>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3 text-slate-700 hover:text-slate-900 border-slate-300"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 border-r border-slate-200">
        <NavContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4 lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="w-6 h-6 text-slate-600" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 border-r-0">
                <NavContent />
              </SheetContent>
            </Sheet>
            {branding?.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt="Company Logo" 
                className="h-8 max-w-[140px] object-contain"
              />
            ) : (
              <span className="font-display font-bold text-xl text-slate-900">REVIRAAPP</span>
            )}
          </div>

          <div className="flex-1 max-w-xl mx-auto hidden lg:block px-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
