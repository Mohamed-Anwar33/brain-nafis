import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import ExamPage from "./pages/ExamPage";
import ResultPage from "./pages/ResultPage";
import AdminLogin from "./pages/admin/AdminLogin";
import NotFound from "./pages/NotFound";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentGamesHub from "./pages/student/StudentGamesHub";
// Game imports
import MatchingGame from "@/pages/games/MatchingGame";
import OrderingGame from "@/pages/games/OrderingGame";
import SpeedChallenge from "@/pages/games/SpeedChallenge";
import WheelGame from "@/pages/games/WheelGame";

import { Footer } from "@/components/layout/Footer";

// System Selector
import AdminSystemSelector from "./pages/admin/AdminSystemSelector";

// Nafis System imports
import NafisLayout from "./pages/admin/nafis/NafisLayout";
import NafisDashboard from "./pages/admin/nafis/NafisDashboard";
import NafisQuestions from "./pages/admin/nafis/NafisQuestions";
import NafisMatching from "./pages/admin/nafis/NafisMatching";
import NafisOrdering from "./pages/admin/nafis/NafisOrdering";
import NafisSpeed from "./pages/admin/nafis/NafisSpeed";
import NafisWheel from "./pages/admin/nafis/NafisWheel";

// Central Exam imports
import CentralExamIntro from "./pages/student/central-exam/CentralExamIntro";
import CentralExamPlay from "./pages/student/central-exam/CentralExamPlay";
import ChallengeGames from "./pages/student/central-exam/ChallengeGames";

// Admin Central Exam imports
import AdminCentralExamLayout from "./pages/admin/central-exam/AdminCentralExamLayout";
import CentralExamDashboard from "./pages/admin/central-exam/CentralExamDashboard";
import AdminCentralExamSettings from "./pages/admin/central-exam/AdminCentralExamSettings";
import AdminCentralExamQuestions from "./pages/admin/central-exam/AdminCentralExamQuestions";
import CentralExamWheel from "./pages/admin/central-exam/CentralExamWheel";
import CentralExamMatching from "./pages/admin/central-exam/CentralExamMatching";
import CentralExamSpeed from "./pages/admin/central-exam/CentralExamSpeed";
import AdminResultsPage from "./pages/admin/AdminResultsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" dir="rtl" />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Routes>
            {/* Student Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/games" element={<StudentGamesHub />} />

            <Route path="/exam/:attemptId" element={<ExamPage />} />
            <Route path="/result/:attemptId" element={<ResultPage />} />

            {/* Games Routes */}
            <Route path="/games/matching" element={<MatchingGame />} />
            <Route path="/games/ordering" element={<OrderingGame />} />
            <Route path="/games/speed" element={<SpeedChallenge />} />
            <Route path="/games/wheel" element={<WheelGame />} />
            <Route path="/games/stages" element={<Navigate to="/student/dashboard" replace />} />

            {/* Central Exam Routes */}
            <Route path="/central-exam" element={<CentralExamIntro />} />
            <Route path="/central-exam/play" element={<CentralExamPlay />} />
            <Route path="/central-exam/games" element={<ChallengeGames />} />

            {/* Admin Routes - New System Only */}
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* System Selector - Main Entry Point */}
            <Route path="/admin/system-selector" element={<AdminSystemSelector />} />
            <Route path="/admin" element={<Navigate to="/admin/system-selector" replace />} />
            
            {/* Nafis System Routes */}
            <Route path="/admin/nafis" element={<NafisLayout />}>
              <Route index element={<NafisDashboard />} />
              <Route path="questions" element={<NafisQuestions />} />
              <Route path="matching" element={<NafisMatching />} />
              <Route path="ordering" element={<NafisOrdering />} />
              <Route path="speed" element={<NafisSpeed />} />
              <Route path="stages" element={<Navigate to="/admin/nafis" replace />} />
              <Route path="wheel" element={<NafisWheel />} />
            </Route>
            
            {/* Central Exam Admin Routes */}
            <Route path="/admin/central-exam" element={<AdminCentralExamLayout />}>
              <Route index element={<CentralExamDashboard />} />
              <Route path="settings" element={<AdminCentralExamSettings />} />
              <Route path="questions" element={<AdminCentralExamQuestions />} />
              <Route path="wheel" element={<CentralExamWheel />} />
              <Route path="matching" element={<CentralExamMatching />} />
              <Route path="ordering" element={<Navigate to="/admin/central-exam" replace />} />
              <Route path="speed" element={<CentralExamSpeed />} />
              <Route path="stages" element={<Navigate to="/admin/central-exam" replace />} />
            </Route>
            
            
            {/* Results Route - accessible from system selector */}
            <Route path="/admin/results" element={<AdminResultsPage />} />

            {/* Any other /admin/* routes redirect to system selector */}
            <Route path="/admin/*" element={<Navigate to="/admin/system-selector" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
