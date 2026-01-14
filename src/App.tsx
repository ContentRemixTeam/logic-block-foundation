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
import Auth from "./pages/Auth";
import LoginHelp from "./pages/LoginHelp";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Planning from "./pages/Planning";
import Reviews from "./pages/Reviews";
import Mindset from "./pages/Mindset";
import CycleSetup from "./pages/CycleSetup";
import CycleManagement from "./pages/CycleManagement";
import CycleView from "./pages/CycleView";
import WeeklyPlan from "./pages/WeeklyPlan";
import WeeklyReview from "./pages/WeeklyReview";
import WeeklyReflection from "./pages/WeeklyReflection";
import MonthlyReview from "./pages/MonthlyReview";
import CycleSummary from "./pages/CycleSummary";
import DailyPlan from "./pages/DailyPlan";
import DailyReview from "./pages/DailyReview";
import Habits from "./pages/Habits";
import Ideas from "./pages/Ideas";
import UsefulThoughts from "./pages/UsefulThoughts";
import BeliefBuilder from "./pages/BeliefBuilder";
import IdentityAnchors from "./pages/IdentityAnchors";
import SelfCoaching from "./pages/SelfCoaching";
import Settings from "./pages/Settings";
import Progress from "./pages/Progress";
import Tasks from "./pages/Tasks";
import Notes from "./pages/Notes";
import SOPs from "./pages/SOPs";
import Wins from "./pages/Wins";

import Support from "./pages/Support";
import CaptureLaunchPage from "./pages/CaptureLaunchPage";
import InstallApp from "./pages/InstallApp";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import MastermindHub from "./pages/MastermindHub";
import MastermindRosterImport from "./pages/MastermindRosterImport";
import WorkshopPlanner from "./pages/WorkshopPlanner";
import TrialSignup from "./pages/TrialSignup";
import Admin from "./pages/Admin";
import CoachingLog from "./pages/CoachingLog";
import ContentVault from "./pages/ContentVault";
import MemberSignup from "./pages/MemberSignup";
import NotFound from "./pages/NotFound";
import Trash from "./pages/Trash";

// Configure QueryClient with stability-focused defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed queries up to 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Keep data fresh but don't refetch too aggressively
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      // Don't refetch on window focus in production to reduce API calls
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect automatically
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TourProvider>
        <Toaster />
        <Sonner />
        <TourOverlay />
        <TourWelcome />
        <TourKeyboardHandler />
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <MembershipProvider>
                <ArcadeProvider>
                  <QuickCaptureProvider>
                    <OnlineStatusMonitor />
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/login-help" element={<LoginHelp />} />
                      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                      <Route path="/planning" element={<ProtectedRoute><Planning /></ProtectedRoute>} />
                      <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
                      <Route path="/cycle-setup" element={<ProtectedRoute><CycleSetup /></ProtectedRoute>} />
                      <Route path="/cycles" element={<ProtectedRoute><CycleManagement /></ProtectedRoute>} />
                      <Route path="/cycle-view/:id" element={<ProtectedRoute><CycleView /></ProtectedRoute>} />
                      <Route path="/weekly-plan" element={<ProtectedRoute><WeeklyPlan /></ProtectedRoute>} />
                      <Route path="/weekly-review" element={<ProtectedRoute><WeeklyReview /></ProtectedRoute>} />
                      <Route path="/weekly-reflection" element={<ProtectedRoute><WeeklyReflection /></ProtectedRoute>} />
                      <Route path="/monthly-review" element={<ProtectedRoute><MonthlyReview /></ProtectedRoute>} />
                      <Route path="/cycle-summary" element={<ProtectedRoute><CycleSummary /></ProtectedRoute>} />
                      <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
                      <Route path="/daily-plan" element={<ProtectedRoute><DailyPlan /></ProtectedRoute>} />
                      <Route path="/daily-review" element={<ProtectedRoute><DailyReview /></ProtectedRoute>} />
                      <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
                      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                      <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
                      <Route path="/sops" element={<ProtectedRoute><SOPs /></ProtectedRoute>} />
                      <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
                      <Route path="/ideas" element={<ProtectedRoute><Ideas /></ProtectedRoute>} />
                      <Route path="/wins" element={<ProtectedRoute><Wins /></ProtectedRoute>} />
                      <Route path="/mindset" element={<ProtectedRoute><Mindset /></ProtectedRoute>} />
                      <Route path="/useful-thoughts" element={<ProtectedRoute><UsefulThoughts /></ProtectedRoute>} />
                      <Route path="/belief-builder" element={<ProtectedRoute><BeliefBuilder /></ProtectedRoute>} />
                      <Route path="/identity-anchors" element={<ProtectedRoute><IdentityAnchors /></ProtectedRoute>} />
                      <Route path="/self-coaching" element={<ProtectedRoute><SelfCoaching /></ProtectedRoute>} />
                      
                      <Route path="/mastermind" element={<ProtectedRoute><MastermindHub /></ProtectedRoute>} />
                      <Route path="/admin/mastermind-roster" element={<ProtectedRoute><MastermindRosterImport /></ProtectedRoute>} />
                      <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/capture" element={<CaptureLaunchPage />} />
                      <Route path="/install" element={<InstallApp />} />
                      <Route path="/workshop-planner" element={<WorkshopPlanner />} />
                      <Route path="/workshop-planner/create" element={<WorkshopPlanner />} />
                      <Route path="/trial" element={<TrialSignup />} />
                      <Route path="/join" element={<MemberSignup />} />
                      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                      <Route path="/coaching-log" element={<ProtectedRoute><CoachingLog /></ProtectedRoute>} />
                      <Route path="/content-vault" element={<ProtectedRoute><ContentVault /></ProtectedRoute>} />
                      <Route path="/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <DevDebugPanel />
                  </QuickCaptureProvider>
                </ArcadeProvider>
              </MembershipProvider>
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TourProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
