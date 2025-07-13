import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import ProximitySelection from "./pages/ProximitySelection";
import LevelSelect from "./pages/LevelSelect";
import Game from "./pages/Game";
import Admin from "./pages/Admin";
import AdminLevels from "./pages/AdminLevels";
import AdminQuestionsBulk from "./pages/AdminQuestionsBulk";
import AdminQuestionsManual from "./pages/AdminQuestionsManual";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-room" element={<CreateRoom />} />
          <Route path="/join-room" element={<JoinRoom />} />
          <Route path="/proximity-selection" element={<ProximitySelection />} />
          <Route path="/level-select" element={<LevelSelect />} />
          <Route path="/game" element={<Game />} />
          <Route path="/admin-panel-secret" element={<Admin />} />
          <Route path="/admin/levels" element={<AdminLevels />} />
          <Route path="/admin/questions-bulk" element={<AdminQuestionsBulk />} />
          <Route path="/admin/questions-manual" element={<AdminQuestionsManual />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
