import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, RefreshCw, Unplug, Loader2, CheckCircle2, Server } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

const EB = {
  primary: "oklch(0.78 0.18 155)",
  primaryForeground: "oklch(0.14 0.01 260)",
  mutedForeground: "oklch(0.65 0.02 260)",
  border: "oklch(0.28 0.015 260)",
  input: "oklch(0.24 0.015 260)",
  foreground: "oklch(0.97 0.005 260)",
  win: "oklch(0.78 0.18 155)",
};

type BrokerageAccount = {
  id: string;
  st_account_id: string;
  provider: string;
  brokerage_name: string | null;
  account_name: string | null;
  account_number_masked: string | null;
  currency: string | null;
  total_value: number | null;
  last_synced_at: string | null;
};
type SyncLog = { finished_at: string | null; status: string; trades_added: number; error: string | null };

async function invoke<T>(name: string, body: unknown): Promise<T> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

function fieldStyle(): React.CSSProperties { return { background: EB.input, borderColor: EB.border, color: EB.foreground }; }

export function BrokerConnections() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BrokerageAccount[]>([]);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [showTradovate, setShowTradovate] = useState(false);
  const [tradovateConnecting, setTradovateConnecting] = useState(false);
  const [tv, setTv] = useState({ environment: "live" as "live" | "demo", username: "", password: "", appId: "", appVersion: "1.0", cid: "", sec: "" });

  const refresh = async () => {
    if (!user) return;
    const [{ data: accts }, { data: logs }] = await Promise.all([
      sb.from("brokerage_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      sb.from("broker_sync_log").select("finished_at,status,trades_added,error").eq("user_id", user.id).order("started_at", { ascending: false }).limit(1),
    ]);
    setAccounts(accts ?? []);
    setLastSync(logs?.[0] ?? null);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [user]);

  const connect = async () => {
    setConnecting(true);
    try {
      const res = await invoke<{ url: string }>("broker-connect", { returnUrl: window.location.href });
      window.location.href = res.url;
    } catch (e: any) {
      toast.error(e.message || "Could not open broker connection portal");
      setConnecting(false);
    }
  };

  const connectTradovate = async () => {
    if (!tv.username || !tv.password || !tv.appId || !tv.cid || !tv.sec) {
      toast.error("Fill in every Tradovate field before connecting.");
      return;
    }
    setTradovateConnecting(true);
    try {
      const res = await invoke<{ accounts: number }>("tradovate-connect", tv);
      toast.success(`Tradovate connected: ${res.accounts} account(s)`);
      setShowTradovate(false);
      setTv({ environment: "live", username: "", password: "", appId: "", appVersion: "1.0", cid: "", sec: "" });
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Could not connect Tradovate");
    } finally {
      setTradovateConnecting(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await invoke<{ synced: number; added: number }>("broker-sync", {});
      toast.success(`Synced ${res.synced} account(s), ${res.added} new trade(s).`);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async (account: BrokerageAccount) => {
    setDisconnectingId(account.id);
    try {
      if (account.provider === "tradovate") await invoke("tradovate-disconnect", {});
      else await invoke("broker-disconnect", { accountId: account.id });
      toast.success("Account disconnected.");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Could not disconnect");
    } finally {
      setDisconnectingId(null);
    }
  };

  if (loading) return <div className="grid place-items-center py-8"><Loader2 className="size-5 animate-spin" style={{ color: EB.primary }} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs" style={{ color: EB.mutedForeground }}>Connect Tradovate directly, or use SnapTrade for supported brokerages.</p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button onClick={() => setShowTradovate((v) => !v)} variant="outline" size="sm" className="gap-1.5"><Server className="size-3.5" /> Tradovate</Button>
          <Button onClick={connect} disabled={connecting} size="sm" className="gap-1.5" style={{ background: EB.primary, color: EB.primaryForeground }}>
            {connecting ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />} SnapTrade
          </Button>
        </div>
      </div>

      {showTradovate && (
        <div className="grid gap-3 rounded-md p-4 md:grid-cols-2" style={{ border: `1px solid ${EB.border}` }}>
          <div>
            <div className="mb-1.5 text-xs" style={{ color: EB.mutedForeground }}>Environment</div>
            <select value={tv.environment} onChange={(e) => setTv({ ...tv, environment: e.target.value as "live" | "demo" })}
              className="h-10 w-full rounded-md px-2 text-sm" style={fieldStyle()}>
              <option value="live">Live</option><option value="demo">Demo</option>
            </select>
          </div>
          {(["username", "password", "appId", "appVersion", "cid", "sec"] as const).map((field) => (
            <div key={field}>
              <div className="mb-1.5 text-xs" style={{ color: EB.mutedForeground }}>{field === "cid" ? "Client ID" : field === "sec" ? "Secret" : field}</div>
              <Input
                type={field === "password" || field === "sec" ? "password" : "text"}
                value={tv[field]}
                onChange={(e) => setTv({ ...tv, [field]: e.target.value })}
                style={fieldStyle()}
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <Button onClick={connectTradovate} disabled={tradovateConnecting} className="gap-1.5" style={{ background: EB.primary, color: EB.primaryForeground }}>
              {tradovateConnecting ? <Loader2 className="size-3.5 animate-spin" /> : <Server className="size-3.5" />}
              {tradovateConnecting ? "Connecting…" : "Connect Tradovate"}
            </Button>
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="rounded-md p-4 text-sm" style={{ border: `1px dashed ${EB.border}`, color: EB.mutedForeground }}>
          No accounts connected yet.
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md p-3" style={{ border: `1px solid ${EB.border}` }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="size-4 shrink-0" style={{ color: EB.win }} />
                  <span className="truncate">{a.brokerage_name ?? "Broker"}</span>
                  <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ border: `1px solid ${EB.border}`, color: EB.mutedForeground }}>{a.account_number_masked ?? a.account_name ?? "account"}</span>
                </div>
                <div className="mt-1 text-xs" style={{ color: EB.mutedForeground }}>
                  {a.total_value != null ? `${a.currency ?? ""} ${Number(a.total_value).toLocaleString()}` : "—"}
                  {a.last_synced_at ? ` · synced ${new Date(a.last_synced_at).toLocaleString()}` : ""}
                </div>
              </div>
              <button onClick={() => disconnect(a)} disabled={disconnectingId === a.id}
                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs" style={{ color: EB.mutedForeground }}>
                {disconnectingId === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <Unplug className="size-3.5" />} Disconnect
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-3" style={{ borderTop: `1px solid ${EB.border}` }}>
        <div className="text-xs" style={{ color: EB.mutedForeground }}>
          {lastSync?.finished_at ? `Last sync: ${new Date(lastSync.finished_at).toLocaleString()} · ${lastSync.status}${lastSync.trades_added ? ` · +${lastSync.trades_added} trades` : ""}` : "No syncs yet"}
        </div>
        <Button variant="outline" size="sm" onClick={sync} disabled={syncing || accounts.length === 0} className="gap-1.5">
          <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} /> Refresh now
        </Button>
      </div>
    </div>
  );
}
