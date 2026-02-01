import { lazy, Suspense, ComponentType } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { MembershipProvider } from "@/hooks/useMembership";
import { ArcadeProvider } from "@/hooks/useArcade";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { TourProvider } from "@/hooks/useTour";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { TourWelcome } from "@/components/tour/TourWelcome";
import { TourKeyboardHandler } from "@/components/tour/TourKeyboardHandler";
import { QuickCaptureProvider } from "@/components/quick-capture";
import { ManifestSwitcher } from "@/components/pwa/ManifestSwitcher";
import { PWAUpdatePrompt } from "@/components/pwa/PWAUpdatePrompt";
import { DevDebugPanel } from "@/components/dev/DevDebugPanel";
import { LoadingState } from "@/components/system/LoadingState";

// Eagerly load critical auth pages (small, needed immediately)
import Auth from "./pages/Auth";
import LoginHelp from "./pages/LoginHelp";
import NotFound from "./pages/NotFound";

// Retry function for lazy imports that handles stale chunk errors
function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      // Check if it's a chunk loading error
      if (
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.message?.includes('Load failed')
      ) {
        // Clear cache and reload once
        const hasReloaded = sessionStorage.getItem('chunk_reload_attempted');
        if (!hasReloaded) {
          sessionStorage.setItem('chunk_reload_attempted', 'true');
          window.location.reload();
        }
      }
      throw error;
    }
  });
}

// Lazy load all other pages for code splitting with retry logic
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Onboarding = lazyWithRetry(() => import('./pages/Onboarding'));
const Planning = lazyWithRetry(() => import('./pages/Planning'));
const Reviews = lazyWithRetry(() => import('./pages/Reviews'));
const Mindset = lazyWithRetry(() => import('./pages/Mindset'));
const CycleSetup = lazyWithRetry(() => import('./pages/CycleSetup'));
const CycleManagement = lazyWithRetry(() => import('./pages/CycleManagement'));
const CycleView = lazyWithRetry(() => import('./pages/CycleView'));
const WeeklyPlan = lazyWithRetry(() => import('./pages/WeeklyPlan'));
const WeeklyReview = lazyWithRetry(() => import('./pages/WeeklyReview'));
const WeeklyReflection = lazyWithRetry(() => import('./pages/WeeklyReflection'));
const MonthlyReview = lazyWithRetry(() => import('./pages/MonthlyReview'));
const CycleSummary = lazyWithRetry(() => import('./pages/CycleSummary'));
const DailyPlan = lazyWithRetry(() => import('./pages/DailyPlan'));
const DailyReview = lazyWithRetry(() => import('./pages/DailyReview'));
const Habits = lazyWithRetry(() => import('./pages/Habits'));
const Ideas = lazyWithRetry(() => import('./pages/Ideas'));
const UsefulThoughts = lazyWithRetry(() => import('./pages/UsefulThoughts'));
const BeliefBuilder = lazyWithRetry(() => import('./pages/BeliefBuilder'));
const IdentityAnchors = lazyWithRetry(() => import('./pages/IdentityAnchors'));
const SelfCoaching = lazyWithRetry(() => import('./pages/SelfCoaching'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Progress = lazyWithRetry(() => import('./pages/Progress'));
const Tasks = lazyWithRetry(() => import('./pages/Tasks'));
const Notes = lazyWithRetry(() => import('./pages/Notes'));
const SOPs = lazyWithRetry(() => import('./pages/SOPs'));
const Wins = lazyWithRetry(() => import('./pages/Wins'));
const Support = lazyWithRetry(() => import('./pages/Support'));
const CaptureLaunchPage = lazyWithRetry(() => import('./pages/CaptureLaunchPage'));
const InstallApp = lazyWithRetry(() => import('./pages/InstallApp'));
const Projects = lazyWithRetry(() => import('./pages/Projects'));
const ProjectDetail = lazyWithRetry(() => import('./pages/ProjectDetail'));
const MastermindHub = lazyWithRetry(() => import('./pages/MastermindHub'));
const MastermindRosterImport = lazyWithRetry(() => import('./pages/MastermindRosterImport'));
const WorkshopPlanner = lazyWithRetry(() => import('./pages/WorkshopPlanner'));
const TrialSignup = lazyWithRetry(() => import('./pages/TrialSignup'));
const Admin = lazyWithRetry(() => import('./pages/Admin'));
const CoachingLog = lazyWithRetry(() => import('./pages/CoachingLog'));
const ContentVault = lazyWithRetry(() => import('./pages/ContentVault'));
const MemberSignup = lazyWithRetry(() => import('./pages/MemberSignup'));
const Trash = lazyWithRetry(() => import('./pages/Trash'));
const Arcade = lazyWithRetry(() => import('./pages/Arcade'));
const Focus = lazyWithRetry(() => import('./pages/Focus'));
const Courses = lazyWithRetry(() => import('./pages/Courses'));
const CourseDetail = lazyWithRetry(() => import('./pages/CourseDetail'));
const Wizards = lazyWithRetry(() => import('./pages/Wizards'));
const CycleWizard = lazyWithRetry(() => import('./pages/CycleWizard'));
const LaunchWizardPage = lazyWithRetry(() => import('./pages/LaunchWizardPage'));
const LaunchWizardV2Page = lazyWithRetry(() => import('./pages/LaunchWizardV2Page'));
const HabitWizardPage = lazyWithRetry(() => import('./pages/HabitWizardPage'));
const ContentPlannerPage = lazyWithRetry(() => import('./pages/ContentPlannerPage'));
const PlannerSettings = lazyWithRetry(() => import('./pages/PlannerSettings'));
const DailyPageSettings = lazyWithRetry(() => import('./pages/settings/DailyPageSettings'));
const FinancialTracker = lazyWithRetry(() => import('./pages/FinancialTracker'));
const LaunchDebrief = lazyWithRetry(() => import('./pages/LaunchDebrief'));
const QuickAddApp = lazyWithRetry(() => import('./pages/QuickAddApp'));
const InstallQuickAdd = lazyWithRetry(() => import('./pages/InstallQuickAdd'));
const SummitWizardPage = lazyWithRetry(() => import('./pages/SummitWizardPage'));
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed queries with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Keep data fresh longer to reduce API calls
      staleTime: 1000 * 60 * 5, // 5 minutes (increased from 1)
      gcTime: 1000 * 60 * 15, // 15 minutes (increased from 5)
      // Don't refetch on window focus (realtime handles updates)
      refetchOnWindowFocus: false,
      // Always refetch on reconnect to sync data
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Online status monitor component
function OnlineStatusMonitor() {
  useOnlineStatus();
  return null;
}

// Suspense wrapper for lazy-loaded pages
function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingState variant="skeleton" />}>
      {children}
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TourProvider>
          <AuthProvider>
            <ThemeProvider>
              <MembershipProvider>
                <ArcadeProvider>
                  <QuickCaptureProvider>
                    <OnlineStatusMonitor />
                    <ManifestSwitcher />
                    <PWAUpdatePrompt />
                    <TourOverlay />
                    <TourWelcome />
                    <TourKeyboardHandler />
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/login-help" element={<LoginHelp />} />
                      
                      {/* Protected routes with lazy loading */}
                      <Route path="/dashboard" element={<ProtectedRoute><PageSuspense><Dashboard /></PageSuspense></ProtectedRoute>} />
                      <Route path="/onboarding" element={<ProtectedRoute><PageSuspense><Onboarding /></PageSuspense></ProtectedRoute>} />
                      <Route path="/planning" element={<ProtectedRoute><PageSuspense><Planning /></PageSuspense></ProtectedRoute>} />
                      <Route path="/reviews" element={<ProtectedRoute><PageSuspense><Reviews /></PageSuspense></ProtectedRoute>} />
                      <Route path="/cycle-setup" element={<ProtectedRoute><PageSuspense><CycleSetup /></PageSuspense></ProtectedRoute>} />
                      <Route path="/cycles" element={<ProtectedRoute><PageSuspense><CycleManagement /></PageSuspense></ProtectedRoute>} />
                      <Route path="/cycle-view/:id" element={<ProtectedRoute><PageSuspense><CycleView /></PageSuspense></ProtectedRoute>} />
                      <Route path="/weekly-plan" element={<ProtectedRoute><PageSuspense><WeeklyPlan /></PageSuspense></ProtectedRoute>} />
                      <Route path="/weekly-review" element={<ProtectedRoute><PageSuspense><WeeklyReview /></PageSuspense></ProtectedRoute>} />
                      <Route path="/weekly-reflection" element={<ProtectedRoute><PageSuspense><WeeklyReflection /></PageSuspense></ProtectedRoute>} />
                      <Route path="/monthly-review" element={<ProtectedRoute><PageSuspense><MonthlyReview /></PageSuspense></ProtectedRoute>} />
                      <Route path="/cycle-summary" element={<ProtectedRoute><PageSuspense><CycleSummary /></PageSuspense></ProtectedRoute>} />
                      <Route path="/progress" element={<ProtectedRoute><PageSuspense><Progress /></PageSuspense></ProtectedRoute>} />
                      <Route path="/daily-plan" element={<ProtectedRoute><PageSuspense><DailyPlan /></PageSuspense></ProtectedRoute>} />
                      <Route path="/daily-review" element={<ProtectedRoute><PageSuspense><DailyReview /></PageSuspense></ProtectedRoute>} />
                      <Route path="/notes" element={<ProtectedRoute><PageSuspense><Notes /></PageSuspense></ProtectedRoute>} />
                      <Route path="/tasks" element={<ProtectedRoute><PageSuspense><Tasks /></PageSuspense></ProtectedRoute>} />
                      <Route path="/projects" element={<ProtectedRoute><PageSuspense><Projects /></PageSuspense></ProtectedRoute>} />
                      <Route path="/projects/:id" element={<ProtectedRoute><PageSuspense><ProjectDetail /></PageSuspense></ProtectedRoute>} />
                      <Route path="/sops" element={<ProtectedRoute><PageSuspense><SOPs /></PageSuspense></ProtectedRoute>} />
                      <Route path="/habits" element={<ProtectedRoute><PageSuspense><Habits /></PageSuspense></ProtectedRoute>} />
                      <Route path="/ideas" element={<ProtectedRoute><PageSuspense><Ideas /></PageSuspense></ProtectedRoute>} />
                      <Route path="/wins" element={<ProtectedRoute><PageSuspense><Wins /></PageSuspense></ProtectedRoute>} />
                      <Route path="/mindset" element={<ProtectedRoute><PageSuspense><Mindset /></PageSuspense></ProtectedRoute>} />
                      <Route path="/useful-thoughts" element={<ProtectedRoute><PageSuspense><UsefulThoughts /></PageSuspense></ProtectedRoute>} />
                      <Route path="/belief-builder" element={<ProtectedRoute><PageSuspense><BeliefBuilder /></PageSuspense></ProtectedRoute>} />
                      <Route path="/identity-anchors" element={<ProtectedRoute><PageSuspense><IdentityAnchors /></PageSuspense></ProtectedRoute>} />
                      <Route path="/self-coaching" element={<ProtectedRoute><PageSuspense><SelfCoaching /></PageSuspense></ProtectedRoute>} />
                      <Route path="/mastermind" element={<ProtectedRoute><PageSuspense><MastermindHub /></PageSuspense></ProtectedRoute>} />
                      <Route path="/admin/mastermind-roster" element={<ProtectedRoute><PageSuspense><MastermindRosterImport /></PageSuspense></ProtectedRoute>} />
                      <Route path="/support" element={<ProtectedRoute><PageSuspense><Support /></PageSuspense></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><PageSuspense><Settings /></PageSuspense></ProtectedRoute>} />
                      <Route path="/admin" element={<ProtectedRoute><PageSuspense><Admin /></PageSuspense></ProtectedRoute>} />
                      <Route path="/coaching-log" element={<ProtectedRoute><PageSuspense><CoachingLog /></PageSuspense></ProtectedRoute>} />
                      <Route path="/content-vault" element={<ProtectedRoute><PageSuspense><ContentVault /></PageSuspense></ProtectedRoute>} />
                      <Route path="/trash" element={<ProtectedRoute><PageSuspense><Trash /></PageSuspense></ProtectedRoute>} />
                      <Route path="/arcade" element={<ProtectedRoute><PageSuspense><Arcade /></PageSuspense></ProtectedRoute>} />
                      <Route path="/focus" element={<ProtectedRoute><PageSuspense><Focus /></PageSuspense></ProtectedRoute>} />
                      <Route path="/courses" element={<ProtectedRoute><PageSuspense><Courses /></PageSuspense></ProtectedRoute>} />
                      <Route path="/courses/:id" element={<ProtectedRoute><PageSuspense><CourseDetail /></PageSuspense></ProtectedRoute>} />
                      <Route path="/wizards" element={<ProtectedRoute><PageSuspense><Wizards /></PageSuspense></ProtectedRoute>} />
                      <Route path="/cycle-wizard" element={<ProtectedRoute><PageSuspense><CycleWizard /></PageSuspense></ProtectedRoute>} />
                      <Route path="/wizards/launch" element={<ProtectedRoute><PageSuspense><LaunchWizardV2Page /></PageSuspense></ProtectedRoute>} />
                      <Route path="/wizards/launch-v1" element={<ProtectedRoute><PageSuspense><LaunchWizardPage /></PageSuspense></ProtectedRoute>} />
                      <Route path="/wizards/habits" element={<ProtectedRoute><PageSuspense><HabitWizardPage /></PageSuspense></ProtectedRoute>} />
                      <Route path="/wizards/content" element={<ProtectedRoute><PageSuspense><ContentPlannerPage /></PageSuspense></ProtectedRoute>} />
                      <Route path="/wizards/summit" element={<ProtectedRoute><PageSuspense><SummitWizardPage /></PageSuspense></ProtectedRoute>} />
                      <Route path="/settings/planner" element={<ProtectedRoute><PageSuspense><PlannerSettings /></PageSuspense></ProtectedRoute>} />
                      <Route path="/settings/daily-page" element={<ProtectedRoute><PageSuspense><DailyPageSettings /></PageSuspense></ProtectedRoute>} />
                      <Route path="/finances" element={<ProtectedRoute><PageSuspense><FinancialTracker /></PageSuspense></ProtectedRoute>} />
                      <Route path="/launch-debrief/:launchId" element={<ProtectedRoute><PageSuspense><LaunchDebrief /></PageSuspense></ProtectedRoute>} />
                      
                      {/* Public routes with lazy loading */}
                      <Route path="/capture" element={<PageSuspense><CaptureLaunchPage /></PageSuspense>} />
                      <Route path="/install" element={<PageSuspense><InstallApp /></PageSuspense>} />
                      <Route path="/workshop-planner" element={<PageSuspense><WorkshopPlanner /></PageSuspense>} />
                      <Route path="/workshop-planner/create" element={<PageSuspense><WorkshopPlanner /></PageSuspense>} />
                      <Route path="/trial" element={<PageSuspense><TrialSignup /></PageSuspense>} />
                      <Route path="/join" element={<PageSuspense><MemberSignup /></PageSuspense>} />
                      <Route path="/quick-add" element={<PageSuspense><QuickAddApp /></PageSuspense>} />
                      <Route path="/install-quick-add" element={<PageSuspense><InstallQuickAdd /></PageSuspense>} />
                      
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <DevDebugPanel />
                  </QuickCaptureProvider>
                </ArcadeProvider>
              </MembershipProvider>
            </ThemeProvider>
          </AuthProvider>
        </TourProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
