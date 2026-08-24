import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { page } from "@/lib/analytics";
import Home from "./pages/Home";

// Route-level code splitting: everything except Home is lazy-loaded.
const CreateRoom = lazy(() => import("./pages/CreateRoom"));
const JoinRoom = lazy(() => import("./pages/JoinRoom"));
const ProximitySelection = lazy(() => import("./pages/ProximitySelection"));
const LevelSelect = lazy(() => import("./pages/LevelSelect"));
const Game = lazy(() => import("./pages/Game"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminIntelligence = lazy(() => import("./pages/AdminIntelligence"));
const AdminLevels = lazy(() => import("./pages/AdminLevels"));
const AdminQuestionsBulk = lazy(() => import("./pages/AdminQuestionsBulk"));
const AdminQuestionsManual = lazy(() => import("./pages/AdminQuestionsManual"));
const ConnectionInsights = lazy(() => import("./pages/ConnectionInsights"));
const FullAnalysis = lazy(() => import("./pages/FullAnalysis"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Refund = lazy(() => import("./pages/legal/Refund"));
const NotFound = lazy(() => import("./pages/NotFound"));

import { AuthProvider } from "./contexts/AuthContext";
import AdminGuard from "./components/auth/AdminGuard";
import { AppHeader } from "./components/navigation/AppHeader";

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-sm text-muted-foreground font-medium">Let's Get Close</p>
    </div>
  </div>
);

const AppContent = () => {
  const location = useLocation();

  // Record a pageview on every route change (no-op without VITE_POSTHOG_KEY)
  useEffect(() => {
    page();
  }, [location.pathname]);

  // Pages that shouldn't show the header
  const noHeaderPages = ['/game', '/admin-panel-secret', '/admin/levels', '/admin/questions-bulk', '/admin/questions-manual'];
  const showHeader = !noHeaderPages.includes(location.pathname);

  return (
    <div className="min-h-screen">
      {showHeader && <AppHeader onAuthClick={location.pathname === '/' ? () => window.dispatchEvent(new CustomEvent('home-auth-modal')) : undefined} />}
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-room" element={<CreateRoom />} />
          <Route path="/join-room" element={<JoinRoom />} />
          <Route path="/proximity-selection" element={<ProximitySelection />} />
          <Route path="/level-select" element={<LevelSelect />} />
          <Route path="/game" element={<Game />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/admin-panel-secret" element={
            <AdminGuard>
              <AdminDashboard />
            </AdminGuard>
          } />
          <Route path="/admin/intelligence" element={
            <AdminGuard>
              <AdminIntelligence />
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
          <Route path="/insights" element={<ConnectionInsights />} />
          <Route path="/analysis/:roomCode" element={<FullAnalysis />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
