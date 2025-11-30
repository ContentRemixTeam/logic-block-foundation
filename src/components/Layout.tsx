import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import {
  LayoutDashboard,
  Target,
  Calendar,
  CalendarDays,
  CheckSquare,
  Lightbulb,
  Brain,
  Settings,
  LogOut,
  Menu,
  FileText,
  BarChart3,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cycle Setup', href: '/cycle-setup', icon: Target },
  { name: 'Daily Plan', href: '/daily-plan', icon: CalendarDays },
  { name: 'Weekly Plan', href: '/weekly-plan', icon: Calendar },
  { name: 'Weekly Review', href: '/weekly-review', icon: FileText },
  { name: 'Monthly Review', href: '/monthly-review', icon: BarChart3 },
  { name: 'Habits', href: '/habits', icon: CheckSquare },
  { name: 'Ideas', href: '/ideas', icon: Lightbulb },
  { name: 'Self-Coaching', href: '/self-coaching', icon: Brain },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NavItems = () => (
    <>
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link key={item.name} to={item.href} onClick={() => setMobileMenuOpen(false)}>
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.name}
            </Button>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-card flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Target className="h-6 w-6 text-primary" />
          <span className="ml-2 text-lg font-semibold">90-Day Planner</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <NavItems />
        </nav>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card z-50 flex items-center px-4">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-16 items-center border-b px-6">
              <Target className="h-6 w-6 text-primary" />
              <span className="ml-2 text-lg font-semibold">90-Day Planner</span>
            </div>
            <nav className="flex-1 space-y-1 p-4">
              <NavItems />
            </nav>
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={signOut}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <span className="ml-4 text-lg font-semibold">90-Day Planner</span>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-16">
        <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
