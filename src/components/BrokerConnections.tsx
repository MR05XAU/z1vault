import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link2, RefreshCw, Unplug, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

type BrokerageAccount = {
  id: string;
  st_account_id: string;
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

export function BrokerConnections() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BrokerageAccount[]>([]);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

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

  const disconnect = async (accountId: string) => {
    setDisconnectingId(accountId);
    try {
      await invoke("broker-disconnect", { accountId });
      toast.success("Account disconnected.");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Could not disconnect");
    } finally {
      setDisconnectingId(null);
    }
  };

  if (loading) return <div className="grid place-items-center py-8"><Loader2 className="size-5 animate-spin text-gold" /></div>;

  return (
    <div className="space-y-4 mt-3 pb-6">
      <p className="text-xs text-muted-foreground">Connect a brokerage via SnapTrade to auto-import trades. Educational record-keeping only.</p>

      {accounts.length === 0 ? (
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-3">No accounts connected yet.</p>
          <Button onClick={connect} disabled={connecting} className="gold-fill rounded-xl">
            {connecting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Link2 className="size-4 mr-2" />}Connect broker
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="glass rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                  <CheckCircle2 className="size-3.5 text-success shrink-0" />
                  {a.brokerage_name ?? "Broker"}
                  <span className="text-[10px] text-muted-foreground font-normal truncate">{a.account_number_masked ?? a.account_name ?? ""}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {a.total_value != null ? `${a.currency ?? ""} ${Number(a.total_value).toLocaleString()}` : "—"}
                  {a.last_synced_at ? ` · synced ${new Date(a.last_synced_at).toLocaleDateString()}` : ""}
                </div>
              </div>
              <button onClick={() => disconnect(a.id)} disabled={disconnectingId === a.id}
                className="size-8 grid place-items-center rounded-lg press text-muted-foreground hover:text-danger shrink-0">
                {disconnectingId === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <Unplug className="size-3.5" />}
              </button>
            </div>
          ))}
          <Button onClick={connect} disabled={connecting} variant="outline" className="w-full rounded-xl">
            {connecting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Link2 className="size-4 mr-2" />}Connect another
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="text-[11px] text-muted-foreground">
          {lastSync?.finished_at
            ? `Last sync: ${new Date(lastSync.finished_at).toLocaleString()} · ${lastSync.status}${lastSync.trades_added ? ` · +${lastSync.trades_added}` : ""}`
            : "No syncs yet"}
        </div>
        <Button onClick={sync} disabled={syncing || accounts.length === 0} variant="outline" size="sm" className="rounded-xl shrink-0">
          <RefreshCw className={`size-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />Sync now
        </Button>
      </div>
    </div>
  );
}
