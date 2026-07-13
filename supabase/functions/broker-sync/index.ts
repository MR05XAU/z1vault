import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { snaptradeRequest, decrypt, SNAPTRADE_PERSONAL_SECRET_SENTINEL } from "../_shared/snaptrade.ts";
import { listTradovateAccounts, listTradovateExecutions, getTradovateContracts, decryptTradovateCredentials } from "../_shared/tradovate.ts";

type StAccount = {
  id: string;
  name?: string;
  number?: string;
  institution_name?: string;
  balance?: { total?: { amount?: number; currency?: string }; cash?: { currency?: string } };
};
type StActivity = {
  id?: string;
  type: string;
  price?: number;
  units?: number;
  fee?: number;
  trade_date?: string;
  settlement_date?: string;
  symbol?: { symbol?: { symbol?: string }; raw_symbol?: string };
};

// Pulls this user's connected broker accounts (SnapTrade and/or Tradovate) +
// recent activity, and upserts them into brokerage_accounts / trades.
// Idempotent via the trades(user_id, external_id) unique index.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const userId = u.user.id;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [{ data: st }, { data: tradovate }] = await Promise.all([
      admin.from("snaptrade_users").select("st_user_id, st_user_secret_ciphertext").eq("user_id", userId).maybeSingle(),
      admin.from("tradovate_connections").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    if (!st && !tradovate) return json({ error: "not_registered" }, 400);

    const { data: log } = await admin.from("broker_sync_log").insert({ user_id: userId }).select().single();
    const logId = log?.id as string | undefined;
    const nowIso = new Date().toISOString();

    try {
      let synced = 0;
      let added = 0;

      if (st) {
        const userSecret = await decrypt(st.st_user_secret_ciphertext);
        const isPersonalKey = userSecret === SNAPTRADE_PERSONAL_SECRET_SENTINEL;

        const accounts = isPersonalKey
          ? await snaptradeRequest<StAccount[]>("/accounts")
          : await snaptradeRequest<StAccount[]>("/accounts", { query: { userId: st.st_user_id, userSecret } });
        synced += accounts.length;

        for (const a of accounts) {
          await admin.from("brokerage_accounts").upsert({
            user_id: userId,
            st_account_id: a.id,
            provider: "snaptrade",
            brokerage_name: a.institution_name ?? null,
            account_name: a.name ?? null,
            account_number_masked: a.number ?? null,
            currency: a.balance?.total?.currency ?? a.balance?.cash?.currency ?? null,
            total_value: a.balance?.total?.amount ?? null,
            last_synced_at: nowIso,
          }, { onConflict: "user_id,st_account_id" });
        }

        const startDate = new Date(Date.now() - 90 * 86400 * 1000).toISOString().slice(0, 10);
        const endDate = new Date().toISOString().slice(0, 10);

        const activityLists = await Promise.all(accounts.map(async (a) => {
          const q = isPersonalKey
            ? { startDate, endDate, limit: 1000 }
            : { userId: st.st_user_id, userSecret, startDate, endDate, limit: 1000 };
          const raw = await snaptradeRequest<StActivity[] | { data?: StActivity[] }>(
            `/accounts/${encodeURIComponent(a.id)}/activities`,
            { query: q },
          );
          const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
          return items.map((activity) => ({ activity, accountId: a.id }));
        }));

        const { data: acctRows } = await admin.from("brokerage_accounts").select("id, st_account_id").eq("user_id", userId);
        const acctMap = new Map((acctRows ?? []).map((r: { id: string; st_account_id: string }) => [r.st_account_id, r.id]));

        const trades = activityLists.flat()
          .filter(({ activity }) => activity.type === "BUY" || activity.type === "SELL")
          .map(({ activity, accountId }) => {
            const symbol = activity.symbol?.symbol?.symbol ?? activity.symbol?.raw_symbol ?? null;
            if (!symbol || activity.price == null || activity.units == null) return null;
            const externalId = activity.id
              ? `st:${activity.id}`
              : `st:${accountId}:${activity.type}:${activity.trade_date}:${symbol}:${activity.price}:${activity.units}`;
            return {
              user_id: userId,
              pair: symbol,
              direction: activity.type === "BUY" ? "long" as const : "short" as const,
              entry_price: Number(activity.price),
              exit_price: null,
              size: Math.abs(Number(activity.units)),
              fees: Math.abs(Number(activity.fee ?? 0)),
              pnl: null,
              strategy_id: null,
              notes: "Imported from broker sync",
              opened_at: activity.trade_date ?? activity.settlement_date ?? nowIso,
              closed_at: null,
              setup: null,
              tags: [],
              stop_loss: null,
              take_profit: null,
              source: "snaptrade",
              external_id: externalId,
              brokerage_account_id: acctMap.get(accountId) ?? null,
            };
          })
          .filter((t): t is NonNullable<typeof t> => t !== null);

        added += await insertFreshTrades(admin, userId, trades);
      }

      if (tradovate) {
        const credentials = await decryptTradovateCredentials(tradovate);
        const { token, accounts } = await listTradovateAccounts(credentials);
        synced += accounts.length;

        for (const a of accounts) {
          await admin.from("brokerage_accounts").upsert({
            user_id: userId,
            st_account_id: `tradovate:${a.id}`,
            provider: "tradovate",
            brokerage_name: "Tradovate",
            account_name: a.nickname ?? a.name ?? a.accountSpec ?? `Account ${a.id}`,
            account_number_masked: a.accountSpec ?? null,
            last_synced_at: nowIso,
          }, { onConflict: "user_id,st_account_id" });
        }

        const reports = (await Promise.all(accounts.map((a) => listTradovateExecutions(credentials, token, a.id)))).flat();
        const contracts = await getTradovateContracts(credentials, token, reports.map((r) => Number(r.contractId ?? 0)));

        const { data: acctRows } = await admin.from("brokerage_accounts").select("id, st_account_id").eq("user_id", userId).eq("provider", "tradovate");
        const acctMap = new Map((acctRows ?? []).map((r: { id: string; st_account_id: string }) => [r.st_account_id, r.id]));

        const trades = reports.map((report) => {
          const qty = Number(report.buyQty ?? report.sellQty ?? report.qty ?? 0);
          const price = Number(report.price ?? 0);
          if (!qty || !price) return null;
          const isBuy = Number(report.buyQty ?? 0) > 0 || /buy/i.test(`${report.side ?? report.action ?? ""}`);
          const contract = report.contractId ? contracts.get(report.contractId) : undefined;
          return {
            user_id: userId,
            pair: contract?.name ?? `Contract ${report.contractId ?? ""}`.trim(),
            direction: isBuy ? "long" as const : "short" as const,
            entry_price: price,
            exit_price: null,
            size: Math.abs(qty),
            fees: Math.abs(Number(report.commission ?? report.fees ?? 0)),
            pnl: null,
            strategy_id: null,
            notes: "Imported from Tradovate",
            opened_at: report.timestamp ?? report.tradeDate ?? nowIso,
            closed_at: null,
            setup: null,
            tags: [],
            stop_loss: null,
            take_profit: null,
            source: "tradovate",
            external_id: `tv:${report.id}`,
            brokerage_account_id: acctMap.get(`tradovate:${report.accountId}`) ?? null,
          };
        }).filter((t): t is NonNullable<typeof t> => t !== null);

        added += await insertFreshTrades(admin, userId, trades);
        await admin.from("tradovate_connections").update({ last_synced_at: nowIso }).eq("user_id", userId);
      }

      if (logId) {
        await admin.from("broker_sync_log").update({ finished_at: new Date().toISOString(), status: "success", trades_added: added }).eq("id", logId);
      }
      return json({ synced, added });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (logId) {
        await admin.from("broker_sync_log").update({ finished_at: new Date().toISOString(), status: "error", error: message }).eq("id", logId);
      }
      throw err;
    }
  } catch (e) {
    console.error("broker-sync error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function insertFreshTrades(admin: ReturnType<typeof createClient>, userId: string, trades: Array<Record<string, unknown> & { external_id: string }>): Promise<number> {
  if (!trades.length) return 0;
  const externalIds = trades.map((t) => t.external_id);
  const { data: existing } = await admin.from("trades").select("external_id").eq("user_id", userId).in("external_id", externalIds);
  const seen = new Set((existing ?? []).map((r: { external_id: string }) => r.external_id));
  const fresh = trades.filter((t) => !seen.has(t.external_id));
  if (fresh.length) {
    const { error } = await admin.from("trades").insert(fresh);
    if (error) throw error;
  }
  return fresh.length;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
