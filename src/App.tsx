import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";

import Splash from "./pages/Splash";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import Paywall from "./pages/Paywall";
import CheckoutReturn from "./pages/CheckoutReturn";
import Vault from "./pages/Vault";
import Library from "./pages/Library";
import Reader from "./pages/Reader";
import Tutor from "./pages/Tutor";
import Quiz from "./pages/Quiz";
import Notebook from "./pages/Notebook";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import Journal from "./pages/Journal";
import Calculators from "./pages/Calculators";
import PaymentsCheck from "./pages/PaymentsCheck";
import GoLive from "./pages/GoLive";
import Unsubscribe from "./pages/Unsubscribe";
import NotFound from "./pages/NotFound";

function GateLoading() {
  return (
    <div className="min-h-[100dvh] vault-bg grid place-items-center">
      <div className="size-10 rounded-full border-2 border-gold/30 border-t-gold-bright animate-spin" />
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading, hasAccess, accessLoading } = useAuth();
  const loc = useLocation();
  if (loading || accessLoading) return <GateLoading />;
  if (!user) return <Navigate to="/auth" state={{ from: loc.pathname }} replace />;
  if (!hasAccess) return <Navigate to="/paywall" replace />;
  return <>{children}</>;
}

function AuthOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <GateLoading />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/account" element={<AuthOnly><Account /></AuthOnly>} />
            <Route path="/paywall" element={<AuthOnly><Paywall /></AuthOnly>} />
            <Route path="/checkout/return" element={<AuthOnly><CheckoutReturn /></AuthOnly>} />
            <Route path="/vault" element={<Protected><Vault /></Protected>} />
            <Route path="/library" element={<Protected><Library /></Protected>} />
            <Route path="/read/:chapterId" element={<Protected><Reader /></Protected>} />
            <Route path="/tutor" element={<Protected><Tutor /></Protected>} />
            <Route path="/quiz/:chapterId" element={<Protected><Quiz /></Protected>} />
            <Route path="/notebook" element={<Protected><Notebook /></Protected>} />
            <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
            <Route path="/journal" element={<Protected><Journal /></Protected>} />
            <Route path="/calculators" element={<Protected><Calculators /></Protected>} />
            <Route path="/admin" element={<AuthOnly><Admin /></AuthOnly>} />
            <Route path="/admin/payments-check" element={<AuthOnly><PaymentsCheck /></AuthOnly>} />
            <Route path="/admin/go-live" element={<AuthOnly><GoLive /></AuthOnly>} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;