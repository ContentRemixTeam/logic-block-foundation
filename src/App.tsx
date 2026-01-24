import { lazy, Suspense } from 'react';
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
import { DevDebugPanel } from "@/components/dev/DevDebugPanel";
import { LoadingState } from "@/components/system/LoadingState";

// Eagerly load critical auth pages (small, needed immediately)
import Auth from "./pages/Auth";
import LoginHelp from "./pages/LoginHelp";
import NotFound from "./pages/NotFound";

// Lazy load all other pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Planning = lazy(() => import('./pages/Planning'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Mindset = lazy(() => import('./pages/Mindset'));
const CycleSetup = lazy(() => import('./pages/CycleSetup'));
const CycleManagement = lazy(() => import('./pages/CycleManagement'));
const CycleView = lazy(() => import('./pages/CycleView'));
const WeeklyPlan = lazy(() => import('./pages/WeeklyPlan'));
const WeeklyReview = lazy(() => import('./pages/WeeklyReview'));
const WeeklyReflection = lazy(() => import('./pages/WeeklyReflection'));
const MonthlyReview = lazy(() => import('./pages/MonthlyReview'));
const CycleSummary = lazy(() => import('./pages/CycleSummary'));
const DailyPlan = lazy(() => import('./pages/DailyPlan'));
const DailyReview = lazy(() => import('./pages/DailyReview'));
const Habits = lazy(() => import('./pages/Habits'));
const Ideas = lazy(() => import('./pages/Ideas'));
const UsefulThoughts = lazy(() => import('./pages/UsefulThoughts'));
const BeliefBuilder = lazy(() => import('./pages/BeliefBuilder'));
const IdentityAnchors = lazy(() => import('./pages/IdentityAnchors'));
const SelfCoaching = lazy(() => import('./pages/SelfCoaching'));
const Settings = lazy(() => import('./pages/Settings'));
const Progress = lazy(() => import('./pages/Progress'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Notes = lazy(() => import('./pages/Notes'));
const SOPs = lazy(() => import('./pages/SOPs'));
const Wins = lazy(() => import('./pages/Wins'));
const Support = lazy(() => import('./pages/Support'));
const CaptureLaunchPage = lazy(() => import('./pages/CaptureLaunchPage'));
const InstallApp = lazy(() => import('./pages/InstallApp'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const MastermindHub = lazy(() => import('./pages/MastermindHub'));
const MastermindRosterImport = lazy(() => import('./pages/MastermindRosterImport'));
const WorkshopPlanner = lazy(() => import('./pages/WorkshopPlanner'));
const TrialSignup = lazy(() => import('./pages/TrialSignup'));
const Admin = lazy(() => import('./pages/Admin'));
const CoachingLog = lazy(() => import('./pages/CoachingLog'));
const ContentVault = lazy(() => import('./pages/ContentVault'));
const MemberSignup = lazy(() => import('./pages/MemberSignup'));
const Trash = lazy(() => import('./pages/Trash'));
const Arcade = lazy(() => import('./pages/Arcade'));
const Focus = lazy(() => import('./pages/Focus'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Wizards = lazy(() => import('./pages/Wizards'));
const LaunchWizardPage = lazy(() => import('./pages/LaunchWizardPage'));
const HabitWizardPage = lazy(() => import('./pages/HabitWizardPage'));
// Configure QueryClient with performance-focused defaults
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
                      <Route path="/wizards/launch" element={<ProtectedRoute><PageSuspense><LaunchWizardPage /></PageSuspense></ProtectedRoute>} />
                      <Route path="/wizards/habits" element={<ProtectedRoute><PageSuspense><HabitWizardPage /></PageSuspense></ProtectedRoute>} />
                      
                      {/* Public routes with lazy loading */}
                      <Route path="/capture" element={<PageSuspense><CaptureLaunchPage /></PageSuspense>} />
                      <Route path="/install" element={<PageSuspense><InstallApp /></PageSuspense>} />
                      <Route path="/workshop-planner" element={<PageSuspense><WorkshopPlanner /></PageSuspense>} />
                      <Route path="/workshop-planner/create" element={<PageSuspense><WorkshopPlanner /></PageSuspense>} />
                      <Route path="/trial" element={<PageSuspense><TrialSignup /></PageSuspense>} />
                      <Route path="/join" element={<PageSuspense><MemberSignup /></PageSuspense>} />
                      
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
