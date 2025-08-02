import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import ProximitySelection from "./pages/ProximitySelection";
import LevelSelect from "./pages/LevelSelect";
import Game from "./pages/Game";
import Auth from "./pages/Auth";
import PaymentSuccess from "./pages/PaymentSuccess";

import AdminDashboard from "./pages/AdminDashboard";
import AdminLevels from "./pages/AdminLevels";
import AdminQuestionsBulk from "./pages/AdminQuestionsBulk";
import AdminQuestionsManual from "./pages/AdminQuestionsManual";
import NotFound from "./pages/NotFound";

import { AuthProvider } from "./contexts/AuthContext";
import AdminGuard from "./components/auth/AdminGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ErrorBoundary>
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
            <Route path="/auth" element={<Auth />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/admin-panel-secret" element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            } />
            <Route path="/admin/levels" element={
              <AdminGuard>
                <AdminLevels />
              </AdminGuard>
            } />
            <Route path="/admin/questions-bulk" element={
              <AdminGuard>
                <AdminQuestionsBulk />
              </AdminGuard>
            } />
            <Route path="/admin/questions-manual" element={
              <AdminGuard>
                <AdminQuestionsManual />
              </AdminGuard>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
