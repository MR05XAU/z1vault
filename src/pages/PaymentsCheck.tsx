import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

function detectEnv(): "live" | "sandbox" | "missing" {
  if (!clientToken) return "missing";
  if (clientToken.startsWith("pk_live_")) return "live";
  if (clientToken.startsWith("pk_test_")) return "sandbox";
  return "missing";
}

type Entitlement = {
  user_id: string;
  has_access: boolean;
  source: string | null;
  granted_at: string | null;
  updated_at: string;
};

type Purchase = {
  id: string;
  stripe_payment_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
};

export default function PaymentsCheck() {
  const { user } = useAuth();
  const env = detectEnv();
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/payments-webhook?env=${env === "live" ? "live" : "sandbox"}`;

  const [ent, setEnt] = useState<Entitlement | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: e }, { data: p }] = await Promise.all([
      supabase.from("entitlements").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setEnt((e as Entitlement) ?? null);
    setPurchases((p as Purchase[]) ?? []);
    setLastChecked(new Date());
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [auto, refresh]);

  const pingWebhook = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      // Unsigned ping — webhook must respond 400 "Webhook error" (proves it's reachable & verifying).
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ping: true }),
      });
      const text = await res.text();
      if (res.status === 400 && /webhook/i.test(text)) {
        setPingResult(`OK — endpoint reachable and signature verification is active (HTTP 400 as expected for unsigned ping).`);
      } else {
        setPingResult(`Unexpected: HTTP ${res.status} — ${text.slice(0, 140)}`);
      }
    } catch (err: any) {
      setPingResult(`Network error: ${err.message}`);
    } finally {
      setPinging(false);
    }
  };

  const Pill = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-red-500/15 text-red-300 border border-red-500/30"
      }`}
    >
      <span className={`size-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
      {children}
    </span>
  );

  return (
    <div className="min-h-[100dvh] vault-bg text-foreground px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-24 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-gold">Webhook & Entitlement Check</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Live verification that one-time $197 unlock flips <code>has_access</code> to true.
          </p>
        </div>
        <Link to="/admin" className="text-xs text-gold/80 hover:text-gold">← Admin</Link>
      </div>

      {/* Environment */}
      <section className="glass-strong rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm uppercase tracking-wider text-gold/80">Stripe environment</h2>
          <Pill ok={env === "live"}>{env === "live" ? "LIVE" : env === "sandbox" ? "TEST" : "NOT CONFIGURED"}</Pill>
        </div>
        {env === "missing" && (
          <p className="text-sm text-red-300/90">
            No <code>VITE_PAYMENTS_CLIENT_TOKEN</code> — complete Stripe go-live in the Payments tab first.
          </p>
        )}
        {env === "sandbox" && (
          <p className="text-sm text-orange-200/90">
            Currently in TEST mode. Live $197 verification requires completing all 5 go-live steps in Stripe.
          </p>
        )}
        {env === "live" && (
          <p className="text-sm text-emerald-200/90">
            Live keys detected — real $197 charges will route through the webhook below.
          </p>
        )}
        <div className="mt-3 text-xs">
          <div className="text-muted-foreground mb-1">Webhook endpoint</div>
          <code className="block break-all bg-black/40 rounded px-2 py-1.5 border border-white/5">{webhookUrl}</code>
        </div>
      </section>

      {/* Webhook reachability */}
      <section className="glass-strong rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm uppercase tracking-wider text-gold/80">Webhook reachability</h2>
          <Button size="sm" onClick={pingWebhook} disabled={pinging}>
            {pinging ? "Pinging…" : "Test endpoint"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Sends an unsigned POST. A healthy endpoint replies <code>400</code> because the signature is invalid — proving
          the function is deployed AND verifying signatures.
        </p>
        {pingResult && <div className="text-xs mt-2 p-2 rounded bg-black/40 border border-white/5">{pingResult}</div>}
      </section>

      {/* Entitlement */}
      <section className="glass-strong rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm uppercase tracking-wider text-gold/80">Your entitlement</h2>
          <Pill ok={!!ent?.has_access}>{ent?.has_access ? "UNLOCKED" : "LOCKED"}</Pill>
        </div>
        <dl className="text-xs grid grid-cols-[120px_1fr] gap-y-1.5">
          <dt className="text-muted-foreground">user_id</dt>
          <dd className="font-mono break-all">{user?.id ?? "—"}</dd>
          <dt className="text-muted-foreground">has_access</dt>
          <dd className="font-mono">{String(ent?.has_access ?? false)}</dd>
          <dt className="text-muted-foreground">source</dt>
          <dd className="font-mono">{ent?.source ?? "—"}</dd>
          <dt className="text-muted-foreground">granted_at</dt>
          <dd className="font-mono">{ent?.granted_at ?? "—"}</dd>
          <dt className="text-muted-foreground">updated_at</dt>
          <dd className="font-mono">{ent?.updated_at ?? "—"}</dd>
        </dl>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs text-muted-foreground">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Auto-refresh every 4s
          </label>
          <span>{lastChecked ? `Updated ${lastChecked.toLocaleTimeString()}` : ""}</span>
        </div>
      </section>

      {/* Purchases */}
      <section className="glass-strong rounded-2xl p-5">
        <h2 className="font-display text-sm uppercase tracking-wider text-gold/80 mb-3">
          Recent purchases ({purchases.length})
        </h2>
        {purchases.length === 0 ? (
          <p className="text-xs text-muted-foreground">No purchase rows yet. After a successful Stripe checkout, the webhook should insert a row here AND set has_access = true.</p>
        ) : (
          <ul className="space-y-2">
            {purchases.map((p) => (
              <li key={p.id} className="text-xs bg-black/30 rounded-lg p-3 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gold">${(p.amount_cents / 100).toFixed(2)} {p.currency.toUpperCase()}</span>
                  <Pill ok={p.status === "completed"}>{p.status}</Pill>
                </div>
                <div className="font-mono text-muted-foreground break-all">{p.stripe_payment_id ?? "(no payment id)"}</div>
                <div className="text-muted-foreground mt-1">{new Date(p.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 text-xs text-muted-foreground space-y-2">
        <p className="font-medium text-gold/80">How end-to-end verification works:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Confirm environment shows <strong>LIVE</strong> above.</li>
          <li>Click <strong>Test endpoint</strong> — expect "OK — endpoint reachable".</li>
          <li>Complete a real $197 checkout from <Link to="/paywall" className="text-gold underline">/paywall</Link>.</li>
          <li>Watch this screen — within seconds the entitlement pill flips to <strong>UNLOCKED</strong> and a purchase row appears.</li>
        </ol>
      </section>
    </div>
  );
}