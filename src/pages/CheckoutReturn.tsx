import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Z1Logo } from "@/components/Z1Logo";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

export default function CheckoutReturn() {
  const [sp] = useSearchParams();
  const sessionId = sp.get("session_id");
  const nav = useNavigate();
  const { refreshAccess, hasAccess } = useAuth();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const poll = async () => {
      for (let i = 0; i < 12 && !cancelled; i++) {
        await refreshAccess();
        setTries(i + 1);
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 1500));
      }
    };
    poll();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="min-h-[100dvh] vault-bg grid place-items-center px-6">
      <div className="text-center max-w-sm animate-fade-up">
        <div className="flex justify-center mb-6 relative">
          <div className="absolute inset-0 rounded-full bg-gold/20 blur-3xl animate-gold-pulse" />
          {hasAccess ? (
            <div className="size-20 grid place-items-center rounded-full gold-fill shadow-glow-strong relative">
              <Check className="size-10" strokeWidth={3} />
            </div>
          ) : (
            <Z1Logo size={80} className="relative animate-vault-reveal" />
          )}
        </div>
        <div className="text-[10px] uppercase tracking-[0.32em] text-gold-bright">
          {hasAccess ? "Access granted" : "Confirming payment"}
        </div>
        <h1 className="display text-3xl font-medium mt-3">
          {hasAccess ? "Welcome to the vault." : "Unlocking..."}
        </h1>
        <p className="text-sm text-muted-foreground mt-3">
          {hasAccess
            ? "Lifetime access is yours. The vault is open."
            : "Hang tight — we're activating your lifetime access."}
        </p>
        {!hasAccess && (
          <div className="mt-6 flex justify-center">
            <Loader2 className="size-5 animate-spin text-gold" />
          </div>
        )}
        {hasAccess && (
          <Button
            onClick={() => nav("/vault")}
            className="mt-8 h-12 px-8 rounded-xl gold-fill font-medium shadow-glow press"
          >
            Enter the vault
          </Button>
        )}
        {!hasAccess && tries >= 12 && (
          <Button
            onClick={() => nav("/paywall")}
            variant="outline"
            className="mt-6"
          >
            Still not active? Try again
          </Button>
        )}
      </div>
    </div>
  );
}