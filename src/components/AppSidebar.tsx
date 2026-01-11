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
  Smartphone,
  Library,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
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

const MAIN_NAV = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, questIcon: '🗺️' },
  { name: 'My Cycles', href: '/cycles', icon: Target, questIcon: '🎯' },
  { name: 'Planning', href: '/planning', icon: CalendarDays, questIcon: '🧭' },
  { name: 'Tasks', href: '/tasks', icon: ListTodo, questIcon: '📜' },
  { name: 'Projects', href: '/projects', icon: FolderKanban, questIcon: '📁' },
];

const ORGANIZE_NAV = [
  { name: 'Notes', href: '/notes', icon: BookOpen, questIcon: '📒' },
  { name: 'Ideas', href: '/ideas', icon: Lightbulb, questIcon: '💡' },
  { name: 'Content Vault', href: '/content-vault', icon: Library, questIcon: '📚' },
  { name: 'SOPs', href: '/sops', icon: ClipboardList, questIcon: '📖' },
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
  { name: 'Support', href: '/support', icon: HelpCircle, questIcon: '❓' },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { open: sidebarOpen, toggleSidebar } = useSidebar();
  const { isQuestMode, themeLoaded, level, currentLevelXP, xpToNextLevel, levelTitle } = useTheme();
  const { openQuickCapture } = useQuickCapture();
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
    items: Array<{ name: string; href: string; icon: any; questIcon: string; isExternal?: boolean; isActiveCheck?: (path: string) => boolean }>;
    showLabel?: boolean;
  }) => (
    <SidebarGroup>
      {showLabel && label && sidebarOpen && (
        <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton 
                    asChild 
                    isActive={!item.isExternal && isActive(item)}
                    className={cn(
                      "h-9 gap-3 transition-all duration-150",
                      !item.isExternal && isActive(item) && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    {item.isExternal ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                        {isQuestMode ? (
                          <span className="text-base w-5 text-center">{item.questIcon}</span>
                        ) : (
                          <item.icon className="h-4 w-4" />
                        )}
                        <span className="truncate">{item.name}</span>
                      </a>
                    ) : (
                      <Link to={item.href}>
                        {isQuestMode ? (
                          <span className="text-base w-5 text-center">{item.questIcon}</span>
                        ) : (
                          <item.icon className="h-4 w-4" />
                        )}
                        <span className="truncate">{item.name}</span>
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

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-14 items-center justify-between px-3">
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
                  style={{ fontFamily: isQuestMode ? 'Cinzel, serif' : 'inherit' }}
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
      <SidebarContent className="py-2">
        <NavSection items={MAIN_NAV} showLabel={false} />
        <NavSection label="Organize" items={ORGANIZE_NAV} />
        <NavSection label="Review" items={REVIEW_NAV} />
        <NavSection label="Mindset" items={MINDSET_NAV} />
        <NavSection label="Community" items={COMMUNITY_NAV} />
        <NavSection label="Settings" items={SETTINGS_NAV} />
        
        {/* Admin Section - Only visible to admins */}
        {isAdmin && (
          <SidebarGroup>
            {sidebarOpen && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-1">
                Admin
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === '/admin'}
                        className={cn(
                          "h-9 gap-3 transition-all duration-150",
                          location.pathname === '/admin' && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <Link to="/admin">
                          {isQuestMode ? (
                            <span className="text-base w-5 text-center">🛡️</span>
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                          <span className="truncate">Admin Panel</span>
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
      <SidebarFooter className="border-t border-sidebar-border">
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
                <SidebarMenuButton asChild className="h-9 gap-3 text-muted-foreground hover:text-primary hover:bg-primary/5">
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
                  className="h-9 gap-3 text-muted-foreground hover:text-primary hover:bg-primary/5"
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