import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Upcoming economic events for the home-page countdown box. Source is the
// Forex Factory weekly calendar JSON (free, no key); cached in-module for
// 15 minutes so a busy home page doesn't hammer their feed.
type FFEvent = { title: string; country: string; date: string; impact: string; forecast?: string; previous?: string };

let cache: { at: number; events: FFEvent[] } | null = null;

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

    if (!cache || Date.now() - cache.at > 15 * 60_000) {
      const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!res.ok) return json({ error: `Feed returned ${res.status}`, events: cache?.events ?? [] }, cache ? 200 : 502);
      cache = { at: Date.now(), events: await res.json() };
    }

    // Only future events, soonest first, capped — the box shows a handful.
    const now = Date.now();
    const upcoming = cache.events
      .filter((e) => new Date(e.date).getTime() > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 12);

    return json({ events: upcoming });
  } catch (e) {
    console.error("econ-calendar error", e);
    return json({ error: (e as Error).message, events: [] }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
