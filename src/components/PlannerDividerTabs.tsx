import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const TABS = [
  { label: 'DAILY', path: '/daily-plan', matchPaths: ['/daily-plan', '/daily-review'] },
  { label: 'WEEKLY', path: '/weekly-plan', matchPaths: ['/weekly-plan', '/weekly-review', '/weekly-reflection'] },
  { label: 'MONTHLY', path: '/monthly-review', matchPaths: ['/monthly-review', '/monthly-theme'] },
] as const;

export function PlannerDividerTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const activeTab = TABS.find(tab =>
    tab.matchPaths.some(p => location.pathname.startsWith(p))
  );

  return (
    <div className="relative w-full">
      {/* The tab strip */}
      <div className="flex w-full">
        {TABS.map((tab, i) => {
          const isActive = activeTab?.label === tab.label;
          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex-1 relative py-2.5 text-xs font-semibold tracking-[0.15em] uppercase transition-all duration-200",
                "border-b-2",
                isActive
                  ? "bg-background text-foreground border-b-primary shadow-sm z-10"
                  : "bg-muted/30 text-muted-foreground border-b-transparent hover:bg-muted/50 hover:text-foreground",
                // Divider between tabs
                i > 0 && "border-l border-border/40",
                // Rounded top corners for active tab (paper divider look)
                isActive && "rounded-t-lg",
                isMobile ? "text-[10px] py-2" : ""
              )}
            >
              {tab.label}
              {/* Active tab bottom edge "eraser" — makes it look like it connects to the page */}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-background translate-y-[1px]" />
              )}
            </button>
          );
        })}
      </div>
      {/* Subtle shadow line beneath tabs */}
      <div className="h-px bg-border/60" />
    </div>
  );
}
