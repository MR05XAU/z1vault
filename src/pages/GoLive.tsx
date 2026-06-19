import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

type CheckStatus = "pending" | "pass" | "fail" | "manual";

type Check = {
  id: string;
  group: "Stripe" | "Backend" | "Content" | "Publish";
  title: string;
  detail: string;
  status: CheckStatus;
  manual?: boolean;
  evidence?: string;
  action?: { label: string; href: string; external?: boolean };
};

const STORAGE_KEY = "z1_golive_manual_v1";

function loadManual(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveManual(m: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
}

export default function GoLive() {
  const { user } = useAuth();
  const [manual, setManual] = useState<Record<string, boolean>>(loadManual);
  const [auto, setAuto] = useState<Record<string, { status: CheckStatus; evidence?: string }>>({});
  const [running, setRunning] = useState(false);

  const env = useMemo<"live" | "sandbox" | "missing">(() => {
    if (!clientToken) return "missing";
    if (clientToken.startsWith("pk_live_")) return "live";
    if (clientToken.startsWith("pk_test_")) return "sandbox";
    return "missing";
  }, []);

  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/payments-webhook?env=${env === "live" ? "live" : "sandbox"}`;

  const runAuto = useCallback(async () => {
    setRunning(true);
    const next: typeof auto = {};

    // Stripe env
    next["stripe_live_token"] = env === "live"
      ? { status: "pass", evidence: `Token prefix pk_live_…` }
      : { status: "fail", evidence: env === "sandbox" ? "Test token (pk_test_…) — finish go-live in Stripe" : "No VITE_PAYMENTS_CLIENT_TOKEN" };

    // Webhook reachability
    try {
      const r = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const t = await r.text();
      next["webhook_reachable"] = (r.status === 400 && /webhook/i.test(t))
        ? { status: "pass", evidence: `HTTP 400 (signature verification active)` }
        : { status: "fail", evidence: `HTTP ${r.status}: ${t.slice(0, 80)}` };
    } catch (e: any) {
      next["webhook_reachable"] = { status: "fail", evidence: e.message };
    }

    // Entitlement row exists
    if (user) {
      const { data, error } = await supabase.from("entitlements").select("user_id,has_access").eq("user_id", user.id).maybeSingle();
      next["entitlement_row"] = error
        ? { status: "fail", evidence: error.message }
        : data ? { status: "pass", evidence: `has_access=${data.has_access}` } : { status: "fail", evidence: "Row missing" };
    } else {
      next["entitlement_row"] = { status: "fail", evidence: "Not signed in" };
    }

    // Chapters published
    const { count, error: chErr } = await supabase.from("book_chapters").select("id", { count: "exact", head: true });
    next["chapters_seeded"] = chErr
      ? { status: "fail", evidence: chErr.message }
      : (count ?? 0) >= 1
      ? { status: "pass", evidence: `${count} chapter(s)` }
      : { status: "fail", evidence: "0 chapters — visit /admin and reseed" };

    // Admin role (depends on migration)
    try {
      const { data, error } = await (supabase.rpc as any)("has_role", { _user_id: user?.id, _role: "admin" });
      next["admin_claimed"] = error
        ? { status: "fail", evidence: error.message.includes("function") ? "Migration not approved yet" : error.message }
        : data
        ? { status: "pass", evidence: "You hold the admin role" }
        : { status: "fail", evidence: "Visit /admin → Claim first-admin role" };
    } catch (e: any) {
      next["admin_claimed"] = { status: "fail", evidence: e.message };
    }

    setAuto(next);
    setRunning(false);
  }, [env, webhookUrl, user]);

  useEffect(() => {
    runAuto();
  }, [runAuto]);

  const checks: Check[] = useMemo(() => {
    const a = (id: string): { status: CheckStatus; evidence?: string } => auto[id] ?? { status: "pending" };
    const m = (id: string): CheckStatus => (manual[id] ? "pass" : "manual");
    return [
      { id: "claim_sandbox", group: "Stripe", title: "1. Claim Stripe sandbox", detail: "Connect to a new or existing Stripe account.", status: m("claim_sandbox"), manual: true, action: { label: "Open Payments tab", href: "#payments" } },
      { id: "stripe_activate", group: "Stripe", title: "2. Complete Stripe activation form", detail: "Business details, bank account, identity verification in the Stripe dashboard.", status: m("stripe_activate"), manual: true, action: { label: "Open Payments tab", href: "#payments" } },
      { id: "install_app", group: "Stripe", title: "3. Install Lovable app on LIVE account", detail: "Or copy from sandbox in step 2.", status: m("install_app"), manual: true, action: { label: "Open Payments tab", href: "#payments" } },
      { id: "live_keys", group: "Stripe", title: "4. Live API keys provisioned (auto)", detail: "Lovable auto-provisions live keys & webhook signing secret.", status: a("stripe_live_token").status, evidence: a("stripe_live_token").evidence },
      { id: "readiness", group: "Stripe", title: "5. Stripe readiness check passes", detail: "Run in the Payments tab once steps 1-4 complete.", status: m("readiness"), manual: true, action: { label: "Open Payments tab", href: "#payments" } },

      { id: "migration", group: "Backend", title: "Database migration approved", detail: "user_roles, notebook_pages, chapter_versions, audio_url, version columns.", status: a("admin_claimed").evidence === "Migration not approved yet" ? "fail" : "pass", evidence: a("admin_claimed").evidence },
      { id: "webhook_reachable", group: "Backend", title: "Payments webhook reachable", detail: "Unsigned ping returns HTTP 400 (proves signature verification).", status: a("webhook_reachable").status, evidence: a("webhook_reachable").evidence },
      { id: "entitlement_row", group: "Backend", title: "Your entitlement row exists", detail: "Auto-created by handle_new_user() trigger on signup.", status: a("entitlement_row").status, evidence: a("entitlement_row").evidence },
      { id: "admin_claimed", group: "Backend", title: "Admin role claimed", detail: "First user to claim becomes admin (one-time).", status: a("admin_claimed").status, evidence: a("admin_claimed").evidence, action: { label: "Go to /admin", href: "/admin" } },

      { id: "chapters_seeded", group: "Content", title: "Book chapters seeded", detail: "23 chapters from the source PDF, parsed and stored.", status: a("chapters_seeded").status, evidence: a("chapters_seeded").evidence, action: { label: "Go to /admin", href: "/admin" } },
      { id: "content_reviewed", group: "Content", title: "Content reviewed in production preview", detail: "Open Reader, Quiz, Notebook, Tutor and confirm rendering on mobile width.", status: m("content_reviewed"), manual: true },

      { id: "frontend_published", group: "Publish", title: "Frontend published", detail: "Click Publish → Update to push current build to your *.lovable.app domain.", status: m("frontend_published"), manual: true },
      { id: "domain_set", group: "Publish", title: "Custom domain connected (optional)", detail: "Project Settings → Domains. Skip if using the default lovable.app subdomain.", status: m("domain_set"), manual: true },
    ];
  }, [auto, manual]);

  const passCount = checks.filter((c) => c.status === "pass").length;
  const total = checks.length;
  const allGreen = passCount === total;

  const toggleManual = (id: string) => {
    const next = { ...manual, [id]: !manual[id] };
    setManual(next);
    saveManual(next);
  };

  const exportReport = () => {
    const lines: string[] = [];
    lines.push("Z1 INSIGHTS — Go-Live Readiness Report");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`User: ${user?.email ?? "—"} (${user?.id ?? "—"})`);
    lines.push(`Stripe environment: ${env.toUpperCase()}`);
    lines.push(`Webhook URL: ${webhookUrl}`);
    lines.push(`Result: ${passCount}/${total} checks passing — ${allGreen ? "READY FOR LIVE" : "NOT READY"}`);
    lines.push("");
    const groups = ["Stripe", "Backend", "Content", "Publish"] as const;
    for (const g of groups) {
      lines.push(`## ${g}`);
      for (const c of checks.filter((x) => x.group === g)) {
        const mark = c.status === "pass" ? "[x]" : c.status === "fail" ? "[ ] FAIL" : "[ ]";
        lines.push(`${mark} ${c.title}`);
        lines.push(`     ${c.detail}`);
        if (c.evidence) lines.push(`     evidence: ${c.evidence}`);
      }
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `z1-go-live-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Dot = ({ s }: { s: CheckStatus }) => (
    <span
      className={`inline-block size-3 rounded-full shrink-0 mt-1.5 ${
        s === "pass" ? "bg-emerald-400" : s === "fail" ? "bg-red-400" : s === "manual" ? "bg-zinc-500" : "bg-zinc-700 animate-pulse"
      }`}
    />
  );

  const groups = ["Stripe", "Backend", "Content", "Publish"] as const;

  return (
    <div className="min-h-[100dvh] vault-bg text-foreground px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-nav max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-gold">Go-Live Readiness</h1>
          <p className="text-xs text-muted-foreground mt-1">Complete every check before pointing real customers at the app.</p>
        </div>
        <Link to="/admin" className="text-xs text-gold/80 hover:text-gold">← Admin</Link>
      </div>

      {/* Progress */}
      <div className="glass-strong rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-display text-xl text-gold">{passCount} / {total}</div>
            <div className="text-xs text-muted-foreground">{allGreen ? "All systems green — ready for live customers." : "Outstanding items below."}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={runAuto} disabled={running}>
              {running ? "Checking…" : "Re-run checks"}
            </Button>
            <Button size="sm" disabled={!allGreen} onClick={exportReport}>
              Export report
            </Button>
          </div>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-gold-bright transition-all"
            style={{ width: `${(passCount / total) * 100}%` }}
          />
        </div>
      </div>

      {groups.map((g) => (
        <section key={g} className="glass-strong rounded-2xl p-5 mb-4">
          <h2 className="font-display text-sm uppercase tracking-wider text-gold/80 mb-3">{g}</h2>
          <ul className="space-y-3">
            {checks
              .filter((c) => c.group === g)
              .map((c) => (
                <li key={c.id} className="flex gap-3">
                  <Dot s={c.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{c.title}</div>
                      {c.manual && (
                        <label className="text-xs flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!manual[c.id]}
                            onChange={() => toggleManual(c.id)}
                          />
                          done
                        </label>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.detail}</div>
                    {c.evidence && (
                      <div className="text-[11px] font-mono text-muted-foreground/80 mt-1 break-all">↳ {c.evidence}</div>
                    )}
                    {c.action && c.action.href.startsWith("/") && (
                      <Link to={c.action.href} className="text-xs text-gold underline mt-1 inline-block">{c.action.label}</Link>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <p className="text-xs text-muted-foreground mt-4">
        The Export button unlocks once every check is green and produces a timestamped readiness report you can save with your launch records.
      </p>
    </div>
  );
}