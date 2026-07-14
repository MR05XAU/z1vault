import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Z1Logo } from "@/components/Z1Logo";

export default function Splash() {
  const nav = useNavigate();
  const { loading, user, hasAccess, accessLoading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (!user) {
        const seen = (() => { try { return localStorage.getItem("z1.onboardingDone") === "1"; } catch { return false; } })();
        return nav(seen ? "/auth" : "/onboarding", { replace: true });
      }
      if (accessLoading) return;
      if (!hasAccess) return nav("/paywall", { replace: true });
      nav("/vault", { replace: true });
    }, 1100);
    return () => clearTimeout(t);
  }, [loading, user, hasAccess, accessLoading, nav]);

  return (
    <div className="min-h-[100dvh] vault-bg grid place-items-center overflow-hidden">
      <div className="relative animate-vault-reveal">
        <div className="absolute inset-0 -m-12 rounded-full bg-mint/15 blur-3xl animate-mint-pulse" />
        <Z1Logo size={96} className="relative" />
        <div className="mt-8 text-center animate-fade-in">
          <div className="display text-2xl font-medium tracking-[0.22em] text-foreground">
            Z1 INSIGHTS
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.42em] text-muted-foreground">
            Private Trading Vault
          </div>
        </div>
      </div>
    </div>
  );
}