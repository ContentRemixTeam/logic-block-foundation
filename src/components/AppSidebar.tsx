import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  CalendarDays,
  Calendar,
  FileText,
  BarChart3,
  CheckSquare,
  Zap,
  Brain,
  TrendingUp,
  Settings,
  LogOut,
  ChevronDown,
  ListTodo,
  BookOpen,
  ClipboardList,
  Sparkles,
  HelpCircle,
  Users,
  Map,
  Scroll,
  Swords,
  Compass,
  Trophy,
  Flag,
  Mountain,
  Flame,
  BookMarked,
  Lightbulb,
  Shield,
  Anchor,
  MessageCircle,
  Video,
  GraduationCap,
  Ticket,
  Archive,
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { XPDisplay } from '@/components/quest/XPDisplay';
import { StreakDisplay } from '@/components/quest/StreakDisplay';
import { Progress } from '@/components/ui/progress';
import { getLevelTitle } from '@/lib/questLabels';

export function AppSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { open: sidebarOpen } = useSidebar();
  const { isQuestMode, getNavLabel, level, currentLevelXP, xpToNextLevel, levelTitle } = useTheme();

  // Navigation items with quest mode support
  const planningNavigation = [
    { 
      name: getNavLabel('dashboard'), 
      href: '/dashboard', 
      icon: isQuestMode ? Map : LayoutDashboard,
      questIcon: '🗺️',
      tourId: 'dashboard' 
    },
    { 
      name: 'Planning', 
      href: '/planning', 
      icon: isQuestMode ? Compass : CalendarDays,
      questIcon: '🧭',
      tourId: 'planning' 
    },
    { 
      name: getNavLabel('tasks'), 
      href: '/tasks', 
      icon: isQuestMode ? Scroll : ListTodo,
      questIcon: '📜',
    },
  ];

  const reflectionNavigation = [
    { 
      name: getNavLabel('dailyReview'), 
      href: '/daily-review', 
      icon: isQuestMode ? Sparkles : Sparkles,
      questIcon: '✨',
      tourId: 'reflection' 
    },
    { 
      name: getNavLabel('weeklyReview'), 
      href: '/weekly-review', 
      icon: isQuestMode ? Flag : FileText,
      questIcon: '🏁',
    },
    { 
      name: getNavLabel('monthlyReview'), 
      href: '/monthly-review', 
      icon: isQuestMode ? Mountain : BarChart3,
      questIcon: '⛰️',
    },
    { 
      name: getNavLabel('progress'), 
      href: '/progress', 
      icon: isQuestMode ? TrendingUp : TrendingUp,
      questIcon: '📊',
      tourId: 'progress' 
    },
  ];

  const resourcesNavigation = [
    { 
      name: getNavLabel('notes'), 
      href: '/notes', 
      icon: isQuestMode ? BookMarked : BookOpen,
      questIcon: '📒',
      tourId: 'resources' 
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
  ];

  const mindsetNavigation = [
    { name: 'Useful Thoughts', href: '/useful-thoughts', icon: Brain, questIcon: '💭' },
    { name: 'Belief Builder', href: '/belief-builder', icon: Shield, questIcon: '🛡️' },
    { name: 'Identity Anchors', href: '/identity-anchors', icon: Anchor, questIcon: '⚓' },
    { name: 'Self-Coaching', href: '/self-coaching', icon: MessageCircle, questIcon: '💬' },
  ];
  
  // Check if any mindset route is active
  const isMindsetRouteActive = mindsetNavigation.some(
    (item) => location.pathname === item.href
  );
  
  // Keep mindset section open if any child is active
  const [mindsetOpen, setMindsetOpen] = useState(isMindsetRouteActive);

  const isActive = (href: string) => location.pathname === href;

  const renderNavItems = (items: typeof planningNavigation) => (
    <>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={isActive(item.href)} className="quest-nav-item">
            <Link to={item.href} data-tour={(item as any).tourId}>
              {isQuestMode ? (
                <span className="quest-nav-icon text-base">{item.questIcon}</span>
              ) : (
                <item.icon className="h-4 w-4" />
              )}
              <span>{item.name}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );

  const xpProgress = xpToNextLevel > 0 ? (currentLevelXP / xpToNextLevel) * 100 : 0;

  return (
    <Sidebar collapsible="icon">
      {/* Quest-branded header */}
      <div className={`flex h-16 items-center border-b px-6 ${isQuestMode ? 'quest-sidebar-header' : ''}`}>
        {isQuestMode ? (
          <div className="quest-logo-icon flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--quest-gold))] to-[hsl(var(--quest-gold-light))] shadow-md">
            <span className="text-xl">🎯</span>
          </div>
        ) : (
          <Target className="h-6 w-6 text-primary flex-shrink-0" />
        )}
        {sidebarOpen && (
          <div className="ml-3">
            <span 
              className="text-lg font-semibold whitespace-nowrap block"
              style={{ fontFamily: isQuestMode ? 'var(--font-heading)' : 'inherit' }}
            >
              {isQuestMode ? '90-Day Quest' : '90-Day Planner'}
            </span>
            {isQuestMode && (
              <span className="text-xs font-semibold text-[hsl(var(--quest-gold))] uppercase tracking-wider">
                Epic Quest Mode
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quest Mode XP & Streak Display */}
      {sidebarOpen && isQuestMode && (
        <div className="px-4 py-3 border-b space-y-2">
          <XPDisplay compact />
          <StreakDisplay compact />
        </div>
      )}

      <SidebarContent>
        {/* PLANNING Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={isQuestMode ? 'quest-section-header' : ''}>
            {isQuestMode ? (
              <>
                <span className="mr-2">⚔️</span>
                Quests
              </>
            ) : 'Planning'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(planningNavigation)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* REFLECTION Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={isQuestMode ? 'quest-section-header' : ''}>
            {isQuestMode ? (
              <>
                <span className="mr-2">🔍</span>
                Debriefs
              </>
            ) : 'Reflection'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(reflectionNavigation)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* RESOURCES Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={isQuestMode ? 'quest-section-header' : ''}>
            {isQuestMode ? (
              <>
                <span className="mr-2">🎒</span>
                Inventory
              </>
            ) : 'Resources'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(resourcesNavigation)}

              {/* Mindset Section - Collapsible */}
              <Collapsible
                open={mindsetOpen || isMindsetRouteActive}
                onOpenChange={setMindsetOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={`quest-nav-item ${isMindsetRouteActive ? 'bg-accent text-accent-foreground' : ''}`}
                    >
                      {isQuestMode ? (
                        <span className="quest-nav-icon text-base">🧠</span>
                      ) : (
                        <Brain className="h-4 w-4" />
                      )}
                      <span>{getNavLabel('mindset')}</span>
                      {sidebarOpen && (
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>

                <CollapsibleContent>
                  <SidebarMenu className="ml-4">
                    {mindsetNavigation.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={isActive(item.href)} className="quest-nav-item">
                          <Link to={item.href}>
                            {isQuestMode ? (
                              <span className="quest-nav-icon text-sm">{item.questIcon}</span>
                            ) : (
                              <item.icon className="h-3 w-3" />
                            )}
                            <span className="text-sm">{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>

              {/* Celebration Wall / Victory Hall */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/community')} className="quest-nav-item">
                  <Link to="/community">
                    {isQuestMode ? (
                      <span className="quest-nav-icon text-base">🏆</span>
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                    <span>{getNavLabel('community')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* MASTERMIND Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={isQuestMode ? 'quest-section-header' : ''}>
            {isQuestMode ? (
              <>
                <span className="mr-2">🎓</span>
                Mastermind
              </>
            ) : 'Mastermind'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="quest-nav-item">
                  <a href="https://airtable.com/appP01GhbZAtwT4nN/shrIRdOHFXijc8462" target="_blank" rel="noopener noreferrer">
                    {isQuestMode ? (
                      <span className="quest-nav-icon text-base">🙋</span>
                    ) : (
                      <HelpCircle className="h-4 w-4" />
                    )}
                    <span>Ask Faith</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="quest-nav-item">
                  <a href="https://gobrunch.com/events/389643/589970" target="_blank" rel="noopener noreferrer">
                    {isQuestMode ? (
                      <span className="quest-nav-icon text-base">👥</span>
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                    <span>Coworking Room</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="quest-nav-item">
                  <a href="https://portal.faithmariah.com/communities/groups/mastermind/learning?productId=8cd48d79-e6dd-4e11-9e4c-5d643703bad1" target="_blank" rel="noopener noreferrer">
                    {isQuestMode ? (
                      <span className="quest-nav-icon text-base">🎬</span>
                    ) : (
                      <Video className="h-4 w-4" />
                    )}
                    <span>Recent Call Replays</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="quest-nav-item">
                  <a href="https://www.faithmariahevents.com/" target="_blank" rel="noopener noreferrer">
                    {isQuestMode ? (
                      <span className="quest-nav-icon text-base">🎟️</span>
                    ) : (
                      <Ticket className="h-4 w-4" />
                    )}
                    <span>Apply for Upcoming Events</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="quest-nav-item">
                  <a href="https://portal.faithmariah.com/communities/groups/mastermind/learning" target="_blank" rel="noopener noreferrer">
                    {isQuestMode ? (
                      <span className="quest-nav-icon text-base">📚</span>
                    ) : (
                      <GraduationCap className="h-4 w-4" />
                    )}
                    <span>Learning</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="quest-nav-item">
                  <a href="https://portal.faithmariah.com/communities/groups/mastermind/events" target="_blank" rel="noopener noreferrer">
                    {isQuestMode ? (
                      <span className="quest-nav-icon text-base">📅</span>
                    ) : (
                      <Calendar className="h-4 w-4" />
                    )}
                    <span>Events</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="quest-nav-item">
                  <a href="https://portal.faithmariah.com/communities/groups/mastermind/home" target="_blank" rel="noopener noreferrer">
                    {isQuestMode ? (
                      <span className="quest-nav-icon text-base">💬</span>
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    <span>Community</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="quest-nav-item">
                  <a href="https://hub-3pwl3413w2.membership.io/" target="_blank" rel="noopener noreferrer">
                    {isQuestMode ? (
                      <span className="quest-nav-icon text-base">🗄️</span>
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    <span>Replay Vault</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* SETTINGS Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={isQuestMode ? 'quest-section-header' : ''}>
            {isQuestMode ? (
              <>
                <span className="mr-2">⚙️</span>
                Settings
              </>
            ) : 'Settings'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/settings')} className="quest-nav-item">
                  <Link to="/settings">
                    {isQuestMode ? (
                      <span className="quest-nav-icon text-base">⚙️</span>
                    ) : (
                      <Settings className="h-4 w-4" />
                    )}
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/support')} className="quest-nav-item">
                  <Link to="/support" data-tour="support">
                    {isQuestMode ? (
                      <span className="quest-nav-icon text-base">❓</span>
                    ) : (
                      <HelpCircle className="h-4 w-4" />
                    )}
                    <span>Support</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                <div className="quest-level-badge w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(var(--quest-gold))] to-[hsl(var(--quest-gold-light))] flex flex-col items-center justify-center shadow-lg">
                  <span className="text-sm">⭐</span>
                  <span className="text-sm font-bold text-foreground">{level}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{levelTitle}</p>
                  <div className="mt-1">
                    <Progress value={xpProgress} className="h-1.5 quest-xp-bar" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{currentLevelXP} / {xpToNextLevel} XP</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="quest-nav-item">
              {isQuestMode ? (
                <span className="quest-nav-icon text-base">🚪</span>
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}