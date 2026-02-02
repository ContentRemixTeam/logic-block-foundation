// Mobile sidebar content - rendered directly without Sidebar wrapper
// This avoids the context conflict when AppSidebar is inside MobileBottomNav's Sheet

import { useState, useEffect } from 'react';
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
  Lightbulb,
  Sparkle,
  Gamepad2,
  Smartphone,
  DollarSign,
  Library,
  Shield,
  Trash2,
  GraduationCap,
  FolderKanban,
  Plus,
  ChevronDown,
  CalendarRange,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useProjects } from '@/hooks/useProjects';
import { XPDisplay } from '@/components/quest/XPDisplay';
import { StreakDisplay } from '@/components/quest/StreakDisplay';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuickCapture } from '@/components/quick-capture';
import { supabase } from '@/integrations/supabase/client';
import { useArcade } from '@/hooks/useArcade';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const MAIN_NAV = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, questIcon: '🗺️' },
  { name: 'Planning', href: '/planning', icon: CalendarDays, questIcon: '🧭', isActiveCheck: (path: string) => path.startsWith('/planning') || path.startsWith('/cycles') || path.startsWith('/cycle-') },
  { name: 'Tasks', href: '/tasks', icon: ListTodo, questIcon: '📜' },
];

const ORGANIZE_NAV = [
  { name: 'Notes', href: '/notes', icon: BookOpen, questIcon: '📒' },
  { name: 'Ideas', href: '/ideas', icon: Lightbulb, questIcon: '💡' },
  { name: 'Learning', href: '/courses', icon: GraduationCap, questIcon: '🎓' },
  { name: 'Content Vault', href: '/content-vault', icon: Library, questIcon: '📚' },
  { name: 'Editorial Calendar', href: '/editorial-calendar', icon: CalendarRange, questIcon: '📅' },
  { name: 'SOPs', href: '/sops', icon: ClipboardList, questIcon: '📖' },
  { name: 'Finances', href: '/finances', icon: DollarSign, questIcon: '💰', settingsKey: 'show_income_tracker' },
];

const REVIEW_NAV = [
  { name: 'Reviews', href: '/reviews', icon: Sparkles, questIcon: '✨' },
  { name: 'Progress', href: '/progress', icon: TrendingUp, questIcon: '📊' },
  { name: 'Habits', href: '/habits', icon: CheckSquare, questIcon: '🔥' },
];

const MINDSET_NAV = [
  { 
    name: 'Mindset', 
    href: '/mindset', 
    icon: Brain, 
    questIcon: '🧠',
    isActiveCheck: (path: string) => path === '/mindset' || path.includes('useful-thoughts') || path.includes('belief-builder') || path.includes('identity-anchors') || path.includes('self-coaching'),
  },
];

const COMMUNITY_NAV = [
  { name: 'Community', href: 'https://portal.faithmariah.com/communities/groups/mastermind/home', icon: Users, questIcon: '🏆', isExternal: true },
  { name: 'Mastermind', href: '/mastermind', icon: Sparkle, questIcon: '🎓' },
];

const SETTINGS_NAV = [
  { name: 'Settings', href: '/settings', icon: Settings, questIcon: '⚙️' },
  { name: 'Trash', href: '/trash', icon: Trash2, questIcon: '🗑️' },
  { name: 'Support', href: '/support', icon: HelpCircle, questIcon: '❓' },
];

const MAX_VISIBLE_PROJECTS = 5;

export function MobileSidebarContent() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isQuestMode, themeLoaded, level, currentLevelXP, xpToNextLevel, levelTitle } = useTheme();
  const { openQuickCapture } = useQuickCapture();
  const { settings: arcadeSettings, isLoading: arcadeLoading } = useArcade();
  const { settings: userSettings } = useUserSettings();
  const { data: projects = [] } = useProjects();
  const [isAdmin, setIsAdmin] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  const activeProjects = projects.filter(p => p.status === 'active');
  const visibleProjects = activeProjects.slice(0, MAX_VISIBLE_PROJECTS);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const cacheKey = `admin_${user.id}`;
      const cachedAdmin = sessionStorage.getItem(cacheKey);
      if (cachedAdmin !== null) {
        setIsAdmin(cachedAdmin === 'true');
        return;
      }
      const { data, error } = await supabase.rpc('is_admin', { check_user_id: user.id });
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }
      const isAdminResult = data === true;
      sessionStorage.setItem(cacheKey, String(isAdminResult));
      setIsAdmin(isAdminResult);
    };
    checkAdmin();
  }, [user?.id]);

  const isActive = (item: { href: string; isActiveCheck?: (path: string) => boolean }) => {
    if (item.isActiveCheck) {
      return item.isActiveCheck(location.pathname);
    }
    return location.pathname === item.href;
  };

  const xpProgress = xpToNextLevel > 0 ? (currentLevelXP / xpToNextLevel) * 100 : 0;

  const NavSection = ({ 
    label, 
    items,
    showLabel = true,
  }: { 
    label?: string; 
    items: Array<{ name: string; href: string; icon: any; questIcon: string; isExternal?: boolean; isActiveCheck?: (path: string) => boolean; settingsKey?: string }>;
    showLabel?: boolean;
  }) => {
    const visibleItems = items.filter(item => {
      if (!item.settingsKey) return true;
      if (!userSettings) return true;
      return (userSettings as Record<string, unknown>)[item.settingsKey] === true;
    });

    if (visibleItems.length === 0) return null;

    return (
      <div className="py-2 px-2">
        {showLabel && label && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-1">
            {label}
          </p>
        )}
        <div className="space-y-0.5">
          {visibleItems.map((item) => (
            item.isExternal ? (
              <a 
                key={item.href}
                href={item.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {isQuestMode ? (
                  <span className="text-base w-5 text-center">{item.questIcon}</span>
                ) : (
                  <item.icon className="h-4 w-4" />
                )}
                <span>{item.name}</span>
              </a>
            ) : (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive(item)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {isQuestMode ? (
                  <span className="text-base w-5 text-center">{item.questIcon}</span>
                ) : (
                  <item.icon className="h-4 w-4" />
                )}
                <span>{item.name}</span>
              </Link>
            )
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2.5 mb-3">
          {isQuestMode ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-quest-gold to-quest-gold-light shadow-sm">
              <span className="text-lg">🎯</span>
            </div>
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex flex-col">
            <span 
              className="text-sm font-semibold leading-tight"
              style={{ fontFamily: isQuestMode ? 'Cinzel, serif' : 'Inter, system-ui, sans-serif' }}
            >
              {isQuestMode ? 'Boss Quest' : 'Boss Planner'}
            </span>
            <span className="text-[10px] text-muted-foreground">Mastermind</span>
          </div>
        </div>

        {/* Quick Capture Button */}
        <Button 
          onClick={() => openQuickCapture()} 
          variant="outline"
          className="w-full justify-start gap-2 h-9 text-muted-foreground hover:text-foreground"
        >
          <Zap className="h-4 w-4" />
          Quick Capture
        </Button>

        {/* Quest Mode Stats */}
        {themeLoaded && isQuestMode && (
          <div className="mt-3 space-y-2">
            <XPDisplay compact />
            <StreakDisplay compact />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        <NavSection items={MAIN_NAV} showLabel={false} />
        
        {/* Projects Dropdown */}
        <div className="py-2 px-2">
          <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  {isQuestMode ? (
                    <span className="text-base w-5 text-center">📁</span>
                  ) : (
                    <FolderKanban className="h-4 w-4" />
                  )}
                  <span>Projects</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", projectsOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
              {activeProjects.length === 0 ? (
                <Link
                  to="/projects"
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <Plus className="h-3 w-3" />
                  Create a project
                </Link>
              ) : (
                <>
                  {visibleProjects.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                        location.pathname === `/projects/${project.id}`
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: project.color || 'hsl(var(--muted-foreground))' }}
                      />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  ))}
                  {activeProjects.length > MAX_VISIBLE_PROJECTS && (
                    <Link
                      to="/projects"
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      View all ({activeProjects.length})
                    </Link>
                  )}
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        <NavSection label="Organize" items={ORGANIZE_NAV} />
        <NavSection label="Review" items={REVIEW_NAV} />
        <NavSection label="Mindset" items={MINDSET_NAV} />
        <NavSection label="Community" items={COMMUNITY_NAV} />
        
        {/* Focus Mode */}
        {!arcadeLoading && arcadeSettings.arcade_enabled && (
          <div className="py-2 px-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-1">
              Focus
            </p>
            <Link
              to="/focus"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                location.pathname === '/focus'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {isQuestMode ? (
                <span className="text-base w-5 text-center">🎯</span>
              ) : (
                <Gamepad2 className="h-4 w-4" />
              )}
              <span>Focus Mode</span>
            </Link>
          </div>
        )}
        
        <NavSection label="Settings" items={SETTINGS_NAV} />
        
        {/* Admin */}
        {isAdmin && (
          <div className="py-2 px-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-1">
              Admin
            </p>
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                location.pathname === '/admin'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {isQuestMode ? (
                <span className="text-base w-5 text-center">🛡️</span>
              ) : (
                <Shield className="h-4 w-4" />
              )}
              <span>Admin Panel</span>
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        {/* Quest Level Card */}
        {themeLoaded && isQuestMode && (
          <div className="mb-3">
            <div className="rounded-lg p-3 border border-quest-gold/20 bg-gradient-to-br from-quest-gold/10 to-quest-gold/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-quest-gold to-quest-gold-light flex items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-white">{level}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{levelTitle}</p>
                  <Progress value={xpProgress} className="h-1 mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {currentLevelXP} / {xpToNextLevel} XP
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-0.5">
          <Link
            to="/install"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            {isQuestMode ? (
              <span className="text-base w-5 text-center">📲</span>
            ) : (
              <Smartphone className="h-4 w-4" />
            )}
            <span>Install App</span>
          </Link>
          
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors w-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            {isQuestMode ? (
              <span className="text-base w-5 text-center">🚪</span>
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
