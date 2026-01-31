import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, CheckSquare, FolderKanban, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MobileSidebarContent } from '@/components/sidebar/MobileSidebarContent';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/weekly-plan', label: 'Plan', icon: Calendar },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
];

export function MobileBottomNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    if (href === '/projects') {
      return location.pathname.startsWith('/projects');
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border safe-bottom md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors',
              'active:bg-muted/50 touch-manipulation',
              isActive(href)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('h-5 w-5 mb-1', isActive(href) && 'stroke-[2.5px]')} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}

        {/* Menu Button with Sheet */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full min-w-[64px] transition-colors',
                'active:bg-muted/50 touch-manipulation',
                'text-muted-foreground hover:text-foreground'
              )}
            >
              <Menu className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <div className="h-full overflow-y-auto" onClick={() => setMenuOpen(false)}>
              <MobileSidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
