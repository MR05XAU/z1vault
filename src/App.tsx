import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ReactNode, Suspense, lazy, useEffect } from "react";
import { initPushNotifications } from "@/lib/push";

import Splash from "./pages/Splash";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";

const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Account = lazy(() => import("./pages/Account"));
const Paywall = lazy(() => import("./pages/Paywall"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const Vault = lazy(() => import("./pages/Vault"));
const Library = lazy(() => import("./pages/Library"));
const Reader = lazy(() => import("./pages/Reader"));
const Tutor = lazy(() => import("./pages/Tutor"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Notebook = lazy(() => import("./pages/Notebook"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Admin = lazy(() => import("./pages/Admin"));
const Journal = lazy(() => import("./pages/Journal"));
const Calculators = lazy(() => import("./pages/Calculators"));
const Patterns = lazy(() => import("./pages/Patterns"));
const News = lazy(() => import("./pages/News"));
const OfflineSync = lazy(() => import("./pages/OfflineSync"));
const Legal = lazy(() => import("./pages/Legal"));
const PaymentsCheck = lazy(() => import("./pages/PaymentsCheck"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
  useEffect(() => { if (user) initPushNotifications(); }, [user]);
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
          <Suspense fallback={<GateLoading />}>
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
            <Route path="/patterns" element={<Protected><Patterns /></Protected>} />
            <Route path="/news" element={<Protected><News /></Protected>} />
            <Route path="/offline" element={<Protected><OfflineSync /></Protected>} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/admin" element={<AuthOnly><Admin /></AuthOnly>} />
            <Route path="/admin/payments-check" element={<AuthOnly><PaymentsCheck /></AuthOnly>} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;