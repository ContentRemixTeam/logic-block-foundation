import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  CalendarDays,
  CheckSquare,
  Zap,
  Brain,
  TrendingUp,
  Settings,
  LogOut,
  ListTodo,
  BookOpen,
  ClipboardList,
  Sparkles,
  HelpCircle,
  Users,
  Map,
  Scroll,
  Compass,
  Flame,
  BookMarked,
  Lightbulb,
  FolderKanban,
  Sparkle,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { XPDisplay } from '@/components/quest/XPDisplay';
import { StreakDisplay } from '@/components/quest/StreakDisplay';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function AppSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { open: sidebarOpen, toggleSidebar } = useSidebar();
  const { isQuestMode, getNavLabel, level, currentLevelXP, xpToNextLevel, levelTitle } = useTheme();

  // All navigation items in a single flat list
  const navigationItems = [
    { 
      name: getNavLabel('dashboard'), 
      href: '/dashboard', 
      icon: isQuestMode ? Map : LayoutDashboard,
      questIcon: '🗺️',
    },
    { 
      name: 'Planning', 
      href: '/planning', 
      icon: isQuestMode ? Compass : CalendarDays,
      questIcon: '🧭',
    },
    { 
      name: getNavLabel('tasks'), 
      href: '/tasks', 
      icon: isQuestMode ? Scroll : ListTodo,
      questIcon: '📜',
    },
    { 
      name: 'Projects', 
      href: '/projects', 
      icon: FolderKanban,
      questIcon: '📁',
    },
    { 
      name: 'Reviews', 
      href: '/reviews', 
      icon: Sparkles,
      questIcon: '✨',
    },
    { 
      name: getNavLabel('progress'), 
      href: '/progress', 
      icon: TrendingUp,
      questIcon: '📊',
    },
    { 
      name: getNavLabel('notes'), 
      href: '/notes', 
      icon: isQuestMode ? BookMarked : BookOpen,
      questIcon: '📒',
    },
    { 
      name: getNavLabel('sops'), 
      href: '/sops', 
      icon: isQuestMode ? Scroll : ClipboardList,
      questIcon: '📖',
    },
    { 
      name: getNavLabel('habits'), 
      href: '/habits', 
      icon: isQuestMode ? Flame : CheckSquare,
      questIcon: '🔥',
    },
    { 
      name: getNavLabel('ideas'), 
      href: '/ideas', 
      icon: isQuestMode ? Lightbulb : Zap,
      questIcon: '💡',
    },
    { 
      name: getNavLabel('mindset'), 
      href: '/mindset', 
      icon: Brain,
      questIcon: '🧠',
      isActiveCheck: (path: string) => path === '/mindset' || path.includes('useful-thoughts') || path.includes('belief-builder') || path.includes('identity-anchors') || path.includes('self-coaching'),
    },
    { 
      name: getNavLabel('community'), 
      href: '/community', 
      icon: Users,
      questIcon: '🏆',
    },
    { 
      name: 'Mastermind', 
      href: '/mastermind', 
      icon: Sparkle,
      questIcon: '🎓',
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Settings,
      questIcon: '⚙️',
    },
    { 
      name: 'Support', 
      href: '/support', 
      icon: HelpCircle,
      questIcon: '❓',
    },
  ];

  const isActive = (item: typeof navigationItems[0]) => {
    if (item.isActiveCheck) {
      return item.isActiveCheck(location.pathname);
    }
    return location.pathname === item.href;
  };

  const xpProgress = xpToNextLevel > 0 ? (currentLevelXP / xpToNextLevel) * 100 : 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* Header with logo and collapse button */}
        <div className={`flex h-14 items-center justify-between px-3 ${isQuestMode ? 'quest-sidebar-header' : ''}`}>
          <div className="flex items-center gap-2 min-w-0">
            {isQuestMode ? (
              <div className="quest-logo-icon flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--quest-gold))] to-[hsl(var(--quest-gold-light))] shadow-md shrink-0">
                <span className="text-lg">🎯</span>
              </div>
            ) : (
              <Target className="h-5 w-5 text-primary shrink-0" />
            )}
            {sidebarOpen && (
              <span 
                className="text-sm font-semibold truncate"
                style={{ fontFamily: isQuestMode ? 'var(--font-heading)' : 'inherit' }}
              >
                {isQuestMode ? '90-Day Quest' : '90-Day Planner'}
              </span>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 shrink-0"
                onClick={toggleSidebar}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Quest Mode XP & Streak Display */}
        {sidebarOpen && isQuestMode && (
          <div className="px-3 pb-2 space-y-2">
            <XPDisplay compact />
            <StreakDisplay compact />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild isActive={isActive(item)} className="quest-nav-item">
                        <Link to={item.href}>
                          {isQuestMode ? (
                            <span className="quest-nav-icon text-base">{item.questIcon}</span>
                          ) : (
                            <item.icon className="h-4 w-4" />
                          )}
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent side="right">
                        {item.name}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {/* Level/XP Indicator for Quest Mode */}
        {sidebarOpen && isQuestMode && (
          <div className="px-3 pb-3">
            <div className="quest-level-card rounded-xl p-3 border-2 border-[hsl(var(--quest-gold)/0.2)] bg-gradient-to-br from-[hsl(var(--quest-gold)/0.1)] to-[hsl(var(--quest-gold)/0.05)]">
              <div className="flex items-center gap-3">
                <div className="quest-level-badge w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--quest-gold))] to-[hsl(var(--quest-gold-light))] flex flex-col items-center justify-center shadow-lg">
                  <span className="text-xs">⭐</span>
                  <span className="text-xs font-bold text-foreground">{level}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{levelTitle}</p>
                  <div className="mt-1">
                    <Progress value={xpProgress} className="h-1 quest-xp-bar" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{currentLevelXP} / {xpToNextLevel} XP</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton onClick={signOut} className="quest-nav-item">
                  {isQuestMode ? (
                    <span className="quest-nav-icon text-base">🚪</span>
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">
                  Sign Out
                </TooltipContent>
              )}
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
