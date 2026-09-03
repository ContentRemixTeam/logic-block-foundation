import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarCheck2, CalendarDays, LogOut, Settings2, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { CelebrationOverlay } from '@/components/celebrations/CelebrationOverlay';

const navigation = [
  { href: '/scorecard/today', label: 'Today', icon: CalendarCheck2 },
  { href: '/scorecard/week', label: 'My Week', icon: CalendarDays },
  { href: '/scorecard/setup', label: 'Set Up', icon: Settings2 },
];

export function ScorecardShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isInstallable, promptInstall } = useInstallPrompt();

  return (
    <div className="min-h-screen bg-[#F7F5F2] font-['DM_Sans'] text-[#111111]">
      <header className="sticky top-0 z-40 border-b-2 border-[#111111] bg-[#F7F5F2]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/scorecard/today" className="flex min-h-11 items-center gap-3" aria-label="Weekly Scorecard home">
            <span className="grid h-9 w-9 place-items-center border-2 border-[#111111] bg-[#C8145E] text-white">
              <CalendarCheck2 className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#B8891E]">Becoming Boss</span>
              <span className="block font-['Bebas_Neue'] text-2xl leading-none tracking-wide">Weekly Scorecard</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {isInstallable && (
              <button
                type="button"
                onClick={() => void promptInstall()}
                className="flex h-11 min-w-11 items-center justify-center gap-2 border-2 border-[#111111] bg-white px-2 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-[#FFF0F5] sm:px-3"
                aria-label="Add Scorecard to phone"
              >
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">Add to phone</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="grid h-11 w-11 place-items-center text-[#4A4A4A] transition-colors hover:bg-white hover:text-[#C8145E]"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <nav className="hidden border-b-2 border-[#111111] bg-white sm:block">
        <div className="mx-auto flex max-w-5xl px-6">
          {navigation.map(({ href, label }) => {
            const active = location.pathname === href;
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  'flex min-h-12 items-center border-x-2 border-transparent px-5 text-sm font-bold uppercase tracking-[0.08em]',
                  active && 'border-[#111111] bg-[#FFF0F5] text-[#C8145E]',
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#111111] bg-white sm:hidden">
        <div className="grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = location.pathname === href;
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 border-r border-[#111111]/20 text-[11px] font-bold uppercase tracking-wide last:border-r-0',
                  active ? 'bg-[#C8145E] text-white' : 'bg-white text-[#4A4A4A]',
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <CelebrationOverlay />
    </div>
  );
}
