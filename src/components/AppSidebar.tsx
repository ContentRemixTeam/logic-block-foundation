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

export function AppSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { open: sidebarOpen } = useSidebar();
  const { isQuestMode, getNavLabel } = useTheme();

  // Navigation items with quest mode support
  const planningNavigation = [
    { 
      name: getNavLabel('dashboard'), 
      href: '/dashboard', 
      icon: isQuestMode ? Map : LayoutDashboard, 
      tourId: 'dashboard' 
    },
    { 
      name: getNavLabel('cycleSetup'), 
      href: '/cycle-setup', 
      icon: isQuestMode ? Compass : Target, 
      tourId: 'cycle-setup' 
    },
    { 
      name: getNavLabel('dailyPlan'), 
      href: '/daily-plan', 
      icon: isQuestMode ? Swords : CalendarDays, 
      tourId: 'planning' 
    },
    { 
      name: getNavLabel('weeklyPlan'), 
      href: '/weekly-plan', 
      icon: Calendar 
    },
    { 
      name: getNavLabel('tasks'), 
      href: '/tasks', 
      icon: isQuestMode ? Scroll : ListTodo 
    },
  ];

  const reflectionNavigation = [
    { 
      name: getNavLabel('dailyReview'), 
      href: '/daily-review', 
      icon: Sparkles, 
      tourId: 'reflection' 
    },
    { 
      name: getNavLabel('weeklyReview'), 
      href: '/weekly-review', 
      icon: FileText 
    },
    { 
      name: getNavLabel('monthlyReview'), 
      href: '/monthly-review', 
      icon: BarChart3 
    },
    { 
      name: getNavLabel('progress'), 
      href: '/progress', 
      icon: TrendingUp, 
      tourId: 'progress' 
    },
  ];

  const resourcesNavigation = [
    { 
      name: getNavLabel('notes'), 
      href: '/notes', 
      icon: BookOpen, 
      tourId: 'resources' 
    },
    { 
      name: getNavLabel('sops'), 
      href: '/sops', 
      icon: ClipboardList 
    },
    { 
      name: getNavLabel('habits'), 
      href: '/habits', 
      icon: CheckSquare 
    },
    { 
      name: getNavLabel('ideas'), 
      href: '/ideas', 
      icon: Zap 
    },
  ];

  const mindsetNavigation = [
    { name: 'Useful Thoughts', href: '/useful-thoughts', icon: Brain },
    { name: 'Belief Builder', href: '/belief-builder', icon: TrendingUp },
    { name: 'Identity Anchors', href: '/identity-anchors', icon: Target },
    { name: 'Self-Coaching', href: '/self-coaching', icon: Brain },
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
          <SidebarMenuButton asChild isActive={isActive(item.href)}>
            <Link to={item.href} data-tour={(item as any).tourId}>
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );

  return (
    <Sidebar collapsible="icon">
      <div className="flex h-16 items-center border-b px-6">
        <Target className="h-6 w-6 text-primary flex-shrink-0" />
        {sidebarOpen && (
          <span 
            className="ml-2 text-lg font-semibold whitespace-nowrap"
            style={{ fontFamily: isQuestMode ? 'var(--font-heading)' : 'inherit' }}
          >
            {isQuestMode ? '90-Day Quest' : '90-Day Planner'}
          </span>
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
          <SidebarGroupLabel>
            {isQuestMode ? 'Quests' : 'Planning'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(planningNavigation)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* REFLECTION Section */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {isQuestMode ? 'Debriefs' : 'Reflection'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(reflectionNavigation)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* RESOURCES Section */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {isQuestMode ? 'Inventory' : 'Resources'}
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
                      className={isMindsetRouteActive ? 'bg-accent text-accent-foreground' : ''}
                    >
                      <Brain className="h-4 w-4" />
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
                        <SidebarMenuButton asChild isActive={isActive(item.href)}>
                          <Link to={item.href}>
                            <item.icon className="h-3 w-3" />
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
                <SidebarMenuButton asChild isActive={isActive('/community')}>
                  <Link to="/community">
                    {isQuestMode ? (
                      <Trophy className="h-4 w-4" />
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

        {/* SETTINGS Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/settings')}>
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/support')}>
                  <Link to="/support" data-tour="support">
                    <HelpCircle className="h-4 w-4" />
                    <span>Support</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
