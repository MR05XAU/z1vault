import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Z1Logo } from "@/components/Z1Logo";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Z1_PRICE_ID, Z1_PRICE_DISPLAY } from "@/lib/stripe";
import { Check, LogOut, Loader2 } from "lucide-react";

const perks = [
  "Interactive trading book — every chapter",
  "AI tutor restricted to book content",
  "End-of-chapter quizzes with feedback",
  "Highlights, notes, bookmarks",
  "Progress and performance analytics",
  "Free updates — forever",
];

export default function Paywall() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [checkout, setCheckout] = useState(false);

  return (
    <div className="min-h-[100dvh] vault-bg flex flex-col items-center">
      <PaymentTestModeBanner />
      <div className="w-full max-w-md flex flex-col px-6 safe-top pb-10">
        <div className="flex justify-between items-center mt-2">
          <Z1Logo size={36} />
          <button
            onClick={() => { signOut(); nav("/auth"); }}
            className="text-xs text-muted-foreground flex items-center gap-1.5 press"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>

        {!checkout ? (
          <div className="flex-1 flex flex-col mt-8 animate-fade-up">
            <div className="text-[10px] uppercase tracking-[0.32em] text-gold-bright text-center">
              Lifetime access
            </div>
            <h1 className="display text-4xl font-medium text-center mt-3 leading-tight">
              The vault, <br />unlocked forever.
            </h1>

            <div className="glass-strong rounded-3xl p-6 mt-8 gold-border">
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-[0.24em]">
                  One-time payment
                </div>
                <div className="flex items-baseline justify-center gap-2 mt-2">
                  <span className="display gold-text text-6xl font-medium leading-none">
                    {Z1_PRICE_DISPLAY}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  No subscription. No renewal. Yours.
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-border-strong pt-5">
                {perks.map((p, i) => (
                  <div
                    key={p}
                    className="flex items-start gap-3 animate-fade-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="size-5 rounded-full grid place-items-center bg-gold/15 text-gold-bright shrink-0 mt-0.5">
                      <Check className="size-3" strokeWidth={3} />
                    </div>
                    <div className="text-sm text-foreground/85">{p}</div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setCheckout(true)}
              className="mt-8 h-14 rounded-2xl gold-fill text-base font-medium shadow-glow press hover:shadow-glow-strong"
            >
              Unlock the vault
            </Button>

            <p className="text-[11px] text-center text-muted-foreground/70 mt-4">
              Signed in as {user?.email}
            </p>
          </div>
        ) : (
          <div className="flex-1 mt-6 animate-fade-up">
            <div className="text-xs text-muted-foreground mb-4 text-center">
              Secure checkout
            </div>
            <StripeEmbeddedCheckout
              priceId={Z1_PRICE_ID}
              customerEmail={user?.email ?? undefined}
              userId={user?.id}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
            <button
              onClick={() => setCheckout(false)}
              className="mt-4 mx-auto block text-xs text-muted-foreground press"
            >
              ← back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}