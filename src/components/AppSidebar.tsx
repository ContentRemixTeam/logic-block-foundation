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
  Gamepad2,
  Smartphone,
  DollarSign,
  Library,
  Shield,
  Trash2,
  GraduationCap,
  CalendarRange,
  Trophy,
  MessageSquare,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useUserSettings } from '@/hooks/useUserSettings';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
import { cn } from '@/lib/utils';
import { useQuickCapture } from '@/components/quick-capture';
import { supabase } from '@/integrations/supabase/client';
import { useArcade } from '@/hooks/useArcade';
import { SidebarProjectsDropdown } from '@/components/sidebar/SidebarProjectsDropdown';

// ── Core Navigation (4 groups) ──────────────────────────────────────
const HOME_NAV = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, questIcon: '🗺️' },
  { name: 'Today', href: '/daily-plan', icon: Flame, questIcon: '🔥' },
  { name: 'This Week', href: '/weekly-plan', icon: CalendarDays, questIcon: '📅', isActiveCheck: (path: string) => path.startsWith('/weekly-plan') },
];

const BUILD_NAV = [
  { name: 'Tasks', href: '/tasks', icon: ListTodo, questIcon: '📜' },
  { name: 'Projects', href: '/projects', icon: FolderKanban, questIcon: '🚀', isActiveCheck: (path: string) => path.startsWith('/projects') },
  { name: 'Content', href: '/editorial-calendar', icon: CalendarRange, questIcon: '📅' },
  { name: 'Wizards', href: '/wizards', icon: Sparkles, questIcon: '🪄', isActiveCheck: (path: string) => path.startsWith('/wizards') },
];

const CAPTURE_NAV = [
  { name: 'Brain Dump', href: '/brain-dump', icon: Brain, questIcon: '🧠' },
  { name: 'Notes', href: '/notes', icon: BookOpen, questIcon: '📒' },
  { name: 'Ideas', href: '/ideas', icon: Lightbulb, questIcon: '💡' },
  { name: 'Wins', href: '/wins', icon: Trophy, questIcon: '🏆' },
];

const GROW_NAV = [
  { name: 'Progress', href: '/progress', icon: TrendingUp, questIcon: '📊' },
  { name: 'Learning', href: '/courses', icon: GraduationCap, questIcon: '🎓' },
  { name: 'Mindset', href: '/mindset', icon: Compass, questIcon: '🧠', isActiveCheck: (path: string) => path === '/mindset' || path.includes('useful-thoughts') || path.includes('belief-builder') || path.includes('identity-anchors') || path.includes('self-coaching') },
  { name: 'Mindset', href: '/mindset', icon: Compass, questIcon: '🧠', isActiveCheck: (path: string) => path === '/mindset' || path.includes('useful-thoughts') || path.includes('belief-builder') || path.includes('identity-anchors') || path.includes('self-coaching') || path.includes('coaching-log') },
  { name: 'Reviews', href: '/planning', icon: ClipboardCheck, questIcon: '✅', isActiveCheck: (path: string) => path.includes('review') || path === '/planning' },
];

// ── Advanced features (hidden unless "Show all features" is on) ────
const ADVANCED_NAV = [
  { name: 'Planning', href: '/planning', icon: Map, questIcon: '🧭', isActiveCheck: (path: string) => path.startsWith('/planning') || path.startsWith('/cycles') || path.startsWith('/cycle-') },
  { name: 'Wizards', href: '/wizards', icon: Sparkles, questIcon: '🪄', isActiveCheck: (path: string) => path.startsWith('/wizards') },
  { name: 'Content Vault', href: '/content-vault', icon: Library, questIcon: '📚' },
  { name: 'SOPs', href: '/sops', icon: ClipboardList, questIcon: '📖' },
  { name: 'Habits', href: '/habits', icon: CheckSquare, questIcon: '🔥' },
  { name: 'Finances', href: '/finances', icon: DollarSign, questIcon: '💰', settingsKey: 'show_income_tracker' },
  { name: 'AI Copywriting', href: '/ai-copywriting', icon: Sparkle, questIcon: '✨', isActiveCheck: (path: string) => path.startsWith('/ai-copywriting'), settingsKey: 'show_ai_copywriting' },
];

const COMMUNITY_NAV = [
  { name: 'Community', href: 'https://portal.faithmariah.com/communities/groups/mastermind/home', icon: Users, questIcon: '🏆', isExternal: true },
  { name: 'Mastermind', href: '/mastermind', icon: Sparkle, questIcon: '🎓' },
];

const SETTINGS_NAV = [
  { name: 'Settings', href: '/settings', icon: Settings, questIcon: '⚙️', dataTour: 'settings' },
  { name: 'Trash', href: '/trash', icon: Trash2, questIcon: '🗑️' },
  { name: 'Support', href: '/support', icon: HelpCircle, questIcon: '❓' },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { open: sidebarOpen, toggleSidebar } = useSidebar();
  const { isQuestMode, themeLoaded, level, currentLevelXP, xpToNextLevel, levelTitle } = useTheme();
  const { openQuickCapture } = useQuickCapture();
  const { settings: arcadeSettings, isLoading: arcadeLoading } = useArcade();
  const { settings: userSettings } = useUserSettings();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      
      // Check cache first to avoid redundant RPC calls
      const cacheKey = `admin_${user.id}`;
      const cachedAdmin = sessionStorage.getItem(cacheKey);
      if (cachedAdmin !== null) {
        setIsAdmin(cachedAdmin === 'true');
        return;
      }
      
      // Use the is_admin function which has SECURITY DEFINER
      const { data, error } = await supabase
        .rpc('is_admin', { check_user_id: user.id });
      
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
    items: Array<{ name: string; href: string; icon: any; questIcon: string; isExternal?: boolean; isActiveCheck?: (path: string) => boolean; settingsKey?: string; dataTour?: string }>;
    showLabel?: boolean;
  }) => {
    // Filter items based on user settings
    const visibleItems = items.filter(item => {
      if (!item.settingsKey) return true; // No setting = always show
      if (!userSettings) return true; // Settings not loaded = show all
      return (userSettings as Record<string, unknown>)[item.settingsKey] === true;
    });

    if (visibleItems.length === 0) return null; // Hide section if empty

    return (
      <SidebarGroup className="py-1 px-2">
        {showLabel && label && sidebarOpen && (
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold px-2 h-6 mb-0">
            {label}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu className="gap-0.5">
            {visibleItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton 
                      asChild 
                      isActive={!item.isExternal && isActive(item)}
                      className={cn(
                        "h-8 gap-3 rounded-md transition-all duration-150",
                        !item.isExternal && isActive(item) && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      {item.isExternal ? (
                        <a href={item.href} target="_blank" rel="noopener noreferrer" data-tour={item.dataTour}>
                          {isQuestMode ? (
                            <span className="text-base w-5 text-center">{item.questIcon}</span>
                          ) : (
                            <item.icon className="h-4 w-4" />
                          )}
                          <span className="truncate text-[13px]">{item.name}</span>
                        </a>
                      ) : (
                        <Link to={item.href} data-tour={item.dataTour}>
                          {isQuestMode ? (
                            <span className="text-base w-5 text-center">{item.questIcon}</span>
                          ) : (
                            <item.icon className="h-4 w-4" />
                          )}
                          <span className="truncate text-[13px]">{item.name}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {!sidebarOpen && (
                    <TooltipContent side="right" className="font-medium">
                      {item.name}
                    </TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border/50">
        <div className="flex h-12 items-center justify-between px-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {isQuestMode ? (
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-quest-gold to-quest-gold-light shadow-sm shrink-0">
                <span className="text-lg">🎯</span>
              </div>
            ) : (
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                <Target className="h-4 w-4 text-primary" />
              </div>
            )}
            {sidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span 
                  className="text-sm font-semibold truncate leading-tight"
                  style={{ fontFamily: isQuestMode ? 'Cinzel, serif' : 'Inter, system-ui, sans-serif' }}
                >
                  {isQuestMode ? 'Boss Quest' : 'Boss Planner'}
                </span>
                <span className="text-[10px] text-muted-foreground">Mastermind</span>
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick Capture Button */}
        {sidebarOpen && (
          <div className="px-3 pb-3">
            <Button 
              onClick={() => openQuickCapture()} 
              variant="outline"
              className="w-full justify-start gap-2 h-9 text-muted-foreground hover:text-foreground"
            >
              <Zap className="h-4 w-4" />
              Quick Capture
              <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
            </Button>
          </div>
        )}

        {/* Quest Mode Stats - Only render after theme is loaded */}
        {sidebarOpen && themeLoaded && isQuestMode && (
          <div className="px-3 pb-3 space-y-2">
            <XPDisplay compact />
            <StreakDisplay compact />
          </div>
        )}
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="py-1">
        <NavSection items={HOME_NAV} showLabel={false} />
        <NavSection label="Build" items={BUILD_NAV} />
        <NavSection label="Capture" items={CAPTURE_NAV} />
        <NavSection label="Grow" items={GROW_NAV} />
        
        {/* Advanced features — toggled via user settings */}
        {(userSettings as Record<string, unknown>)?.show_advanced_nav && (
          <NavSection label="More" items={ADVANCED_NAV} />
        )}
        
        <NavSection label="Community" items={COMMUNITY_NAV} />
        
        {/* Focus Mode - Only visible when arcade is enabled */}
        {!arcadeLoading && arcadeSettings.arcade_enabled && (
          <SidebarGroup className="py-1 px-2">
            {sidebarOpen && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold px-2 h-6 mb-0">
                Focus
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === '/focus'}
                        className={cn(
                          "h-8 gap-3 rounded-md transition-all duration-150",
                          location.pathname === '/focus' && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <Link to="/focus">
                          {isQuestMode ? (
                            <span className="text-base w-5 text-center">🎯</span>
                          ) : (
                            <Gamepad2 className="h-4 w-4" />
                          )}
                          <span className="truncate text-[13px]">Focus Mode</span>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent side="right" className="font-medium">
                        Focus Mode
                      </TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        <NavSection label="Settings" items={SETTINGS_NAV} />
        
        {/* Admin Section - Only visible to admins */}
        {isAdmin && (
          <SidebarGroup className="py-1 px-2">
            {sidebarOpen && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold px-2 h-6 mb-0">
                Admin
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === '/admin'}
                        className={cn(
                          "h-8 gap-3 rounded-md transition-all duration-150",
                          location.pathname === '/admin' && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <Link to="/admin">
                          {isQuestMode ? (
                            <span className="text-base w-5 text-center">🛡️</span>
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                          <span className="truncate text-[13px]">Admin Panel</span>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent side="right" className="font-medium">
                        Admin Panel
                      </TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border/50">
        {/* Quest Level Card - Only render after theme is loaded */}
        {sidebarOpen && themeLoaded && isQuestMode && (
          <div className="px-3 py-3">
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
        
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton asChild className="h-8 gap-3 text-muted-foreground hover:text-primary hover:bg-primary/5">
                  <Link to="/install">
                    {isQuestMode ? (
                      <span className="text-base w-5 text-center">📲</span>
                    ) : (
                      <Smartphone className="h-4 w-4" />
                    )}
                    <span>Install App</span>
                  </Link>
                </SidebarMenuButton>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">Install App</TooltipContent>
              )}
            </Tooltip>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton 
                  onClick={signOut} 
                  className="h-8 gap-3 text-muted-foreground hover:text-primary hover:bg-primary/5"
                >
                  {isQuestMode ? (
                    <span className="text-base w-5 text-center">🚪</span>
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">Sign Out</TooltipContent>
              )}
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}