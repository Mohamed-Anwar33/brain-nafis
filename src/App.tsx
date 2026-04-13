import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ExamPage from "./pages/ExamPage";
import ResultPage from "./pages/ResultPage";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminQuestions from "./pages/admin/AdminQuestions";
import AdminResults from "./pages/admin/AdminResults";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";
import StudentDashboard from "./pages/student/StudentDashboard";
// Game imports
import MatchingGame from "@/pages/games/MatchingGame";
import OrderingGame from "@/pages/games/OrderingGame";
import SpeedChallenge from "@/pages/games/SpeedChallenge";
import WheelGame from "@/pages/games/WheelGame";
import StagesGame from "@/pages/games/StagesGame";

// Admin imports
import AdminMatching from "./pages/admin/AdminMatching";
import AdminOrdering from "./pages/admin/AdminOrdering";
import AdminSpeed from "./pages/admin/AdminSpeed";
import AdminWheel from "./pages/admin/AdminWheel";
import AdminStages from "./pages/admin/AdminStages";
import { Footer } from "@/components/layout/Footer";
import AdminCentralExamLayout from "./pages/admin/central-exam/AdminCentralExamLayout";
import AdminCentralExamSettings from "./pages/admin/central-exam/AdminCentralExamSettings";
import AdminCentralExamQuestions from "./pages/admin/central-exam/AdminCentralExamQuestions";

// Central Exam imports
import CentralExamIntro from "./pages/student/central-exam/CentralExamIntro";
import CentralExamPlay from "./pages/student/central-exam/CentralExamPlay";
import ChallengeGames from "./pages/student/central-exam/ChallengeGames";

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

            <Route path="/exam/:attemptId" element={<ExamPage />} />
            <Route path="/result/:attemptId" element={<ResultPage />} />

            {/* Games Routes */}
            <Route path="/games/matching" element={<MatchingGame />} />
            <Route path="/games/ordering" element={<OrderingGame />} />
            <Route path="/games/speed" element={<SpeedChallenge />} />
            <Route path="/games/wheel" element={<WheelGame />} />
            <Route path="/games/stages" element={<StagesGame />} />

            {/* Central Exam Routes */}
            <Route path="/central-exam" element={<CentralExamIntro />} />
            <Route path="/central-exam/play" element={<CentralExamPlay />} />
            <Route path="/central-exam/games" element={<ChallengeGames />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="questions" element={<AdminQuestions />} />
              <Route path="matching" element={<AdminMatching />} />
              <Route path="ordering" element={<AdminOrdering />} />
              <Route path="speed" element={<AdminSpeed />} />
              <Route path="results" element={<AdminResults />} />
              <Route path="settings" element={<AdminSettings />} />
              
              <Route path="central-exam" element={<AdminCentralExamLayout />}>
                <Route path="settings" element={<AdminCentralExamSettings />} />
                <Route path="questions" element={<AdminCentralExamQuestions />} />
                <Route path="wheel" element={<AdminWheel />} />
                <Route path="stages" element={<AdminStages />} />
              </Route>
            </Route>

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
