import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Z1Logo } from "@/components/Z1Logo";
import { Loader2, Check, X } from "lucide-react";

type State = "validating" | "confirm" | "already" | "invalid" | "submitting" | "done";

export default function Unsubscribe() {
  const [sp] = useSearchParams();
  const token = sp.get("token") ?? "";
  const [state, setState] = useState<State>("validating");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string } })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.valid) { setEmail(j.email ?? null); setState("confirm"); }
        else if (j.alreadyUnsubscribed) { setEmail(j.email ?? null); setState("already"); }
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setState(error ? "invalid" : "done");
  };

  return (
    <div className="min-h-[100dvh] vault-bg grid place-items-center px-6">
      <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center mint-border">
        <Z1Logo size={48} className="mx-auto mb-4" />
        <div className="text-[10px] uppercase tracking-[0.32em] text-mint-bright">Email preferences</div>

        {state === "validating" && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-mint" />
            <p className="text-sm text-muted-foreground">Validating link…</p>
          </div>
        )}

        {state === "confirm" && (
          <>
            <h1 className="display text-2xl font-medium mt-3">Unsubscribe?</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {email ? <>Stop sending emails to <strong className="text-foreground">{email}</strong>?</> : "Confirm to stop receiving emails."}
            </p>
            <Button onClick={confirm} className="mt-6 w-full h-12 rounded-xl mint-fill">
              Confirm unsubscribe
            </Button>
          </>
        )}

        {state === "submitting" && (
          <div className="mt-6"><Loader2 className="size-6 animate-spin text-mint mx-auto" /></div>
        )}

        {state === "done" && (
          <>
            <div className="size-12 rounded-full bg-success/15 grid place-items-center mx-auto mt-4"><Check className="size-6 text-success" /></div>
            <h1 className="display text-2xl font-medium mt-3">Unsubscribed</h1>
            <p className="text-sm text-muted-foreground mt-2">You won't receive further emails from us.</p>
          </>
        )}

        {state === "already" && (
          <>
            <h1 className="display text-2xl font-medium mt-3">Already unsubscribed</h1>
            <p className="text-sm text-muted-foreground mt-2">{email ?? "This address"} is already opted out.</p>
          </>
        )}

        {state === "invalid" && (
          <>
            <div className="size-12 rounded-full bg-danger/15 grid place-items-center mx-auto mt-4"><X className="size-6 text-danger" /></div>
            <h1 className="display text-2xl font-medium mt-3">Link invalid</h1>
            <p className="text-sm text-muted-foreground mt-2">This unsubscribe link is expired or has already been used.</p>
          </>
        )}
      </div>
    </div>
  );
}