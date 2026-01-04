import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import CycleSetup from "./pages/CycleSetup";
import WeeklyPlan from "./pages/WeeklyPlan";
import WeeklyReview from "./pages/WeeklyReview";
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
import Community from "./pages/Community";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/cycle-setup" element={<ProtectedRoute><CycleSetup /></ProtectedRoute>} />
            <Route path="/weekly-plan" element={<ProtectedRoute><WeeklyPlan /></ProtectedRoute>} />
            <Route path="/weekly-review" element={<ProtectedRoute><WeeklyReview /></ProtectedRoute>} />
            <Route path="/monthly-review" element={<ProtectedRoute><MonthlyReview /></ProtectedRoute>} />
            <Route path="/cycle-summary" element={<ProtectedRoute><CycleSummary /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
            <Route path="/daily-plan" element={<ProtectedRoute><DailyPlan /></ProtectedRoute>} />
            <Route path="/daily-review" element={<ProtectedRoute><DailyReview /></ProtectedRoute>} />
            <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/sops" element={<ProtectedRoute><SOPs /></ProtectedRoute>} />
            <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
              <Route path="/ideas" element={<ProtectedRoute><Ideas /></ProtectedRoute>} />
          <Route path="/useful-thoughts" element={<ProtectedRoute><UsefulThoughts /></ProtectedRoute>} />
          <Route path="/belief-builder" element={<ProtectedRoute><BeliefBuilder /></ProtectedRoute>} />
          <Route path="/identity-anchors" element={<ProtectedRoute><IdentityAnchors /></ProtectedRoute>} />
          <Route path="/self-coaching" element={<ProtectedRoute><SelfCoaching /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
