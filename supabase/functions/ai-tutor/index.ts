import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { llmStream } from "../_shared/llm.ts";
import { selectKnowledge } from "../_shared/knowledgeBase.ts";

const SYSTEM_PROMPT = `You are the Z1 INSIGHTS AI Tutor — an expert, in-depth trading mentor. You have deep knowledge of trading and markets, and you also have access to the student's Z1 INSIGHTS BOOK and a built-in TRADING KNOWLEDGE BASE provided in context.

HOW TO TEACH:

1. GO DEEP. Give thorough, genuinely educational answers — explain the WHY and the mechanics, not just a definition. Where useful, include: how it actually works, a concrete worked example with numbers, common mistakes/misconceptions, and how it connects to risk management and the trader's decision process. Aim to actually teach the concept, not just name it.
2. USE ALL YOUR KNOWLEDGE. Draw on your full understanding of trading (price action, market structure, indicators, order flow, risk, position sizing, psychology, market mechanics, strategy design, etc.) — you are not limited to the book. Explain established trading concepts fully even when the book doesn't cover them.
3. GROUND + CITE WHEN RELEVANT. The BOOK CONTEXT and KNOWLEDGE BASE below are the student's own materials. When your answer aligns with a chapter, reference it with [Ch.N] so they can read more — but you are NOT restricted to only what those sources say. If a CURRENT CHAPTER is in context, connect your answer to it.
4. BE ACCURATE. Teach well-established trading concepts. Do not invent fake indicators, fabricated statistics, or made-up history. If something is genuinely debated or uncertain, say so.
5. PERSONALIZE. If the student's TRADING STATS are provided in context, use them to make coaching concrete and specific to THEM — point out their biggest leak (weak hours, losing setups, low profit factor, negative expectancy), what's working, and the exact concept/chapter that addresses it. When they ask "how am I doing?" or "what should I work on?", answer from their real numbers.
6. GUARDRAILS: This is EDUCATION, not advice. Never predict specific prices, never tell the user to buy/sell a specific ticker right now, never give personalized financial or tax advice (reviewing their own past logged trades to teach is fine). Teach the concepts and frameworks so they can decide for themselves.
7. STAY ON TRADING. Politely redirect non-trading questions (politics, coding, celebrities, current events) back to a trading topic.
8. FORMAT for readability: short paragraphs, **bold** key terms, bullets and worked examples where they help. Match depth to the question — a quick term gets a tight but complete answer; "explain X" or "how does X work" gets a full breakdown. If the user says "like I'm new", drop jargon and use plain analogies.

If asked who you are: "I'm the Z1 INSIGHTS tutor — an in-depth trading mentor built around your Z1 book."`;

// Compact, tutor-ready summary of the student's recent trades. Returns "" if
// they have no closed trades yet (tutor then just teaches generically).
async function buildTradeStats(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from("trades")
    .select("pnl, direction, pair, setup, opened_at, closed_at, stop_loss, entry_price, exit_price")
    .eq("user_id", userId)
    .not("pnl", "is", null)
    .order("opened_at", { ascending: false })
    .limit(200);
  const trades = data ?? [];
  if (trades.length === 0) return "";

  const n = trades.length;
  const wins = trades.filter((t: any) => Number(t.pnl) > 0);
  const net = trades.reduce((s: number, t: any) => s + Number(t.pnl), 0);
  const grossW = wins.reduce((s: number, t: any) => s + Number(t.pnl), 0);
  const grossL = Math.abs(trades.filter((t: any) => Number(t.pnl) < 0).reduce((s: number, t: any) => s + Number(t.pnl), 0));
  const pf = grossL > 0 ? grossW / grossL : wins.length ? Infinity : 0;

  // Expectancy in R where a stop is present.
  const rs = trades
    .map((t: any) => {
      if (t.stop_loss == null || t.exit_price == null) return null;
      const risk = Math.abs(Number(t.entry_price) - Number(t.stop_loss));
      if (!risk) return null;
      const move = t.direction === "long" ? Number(t.exit_price) - Number(t.entry_price) : Number(t.entry_price) - Number(t.exit_price);
      return move / risk;
    })
    .filter((r: number | null): r is number => r != null);
  const avgR = rs.length ? rs.reduce((a: number, b: number) => a + b, 0) / rs.length : null;

  // P&L by hour-of-day (opened) and by setup — surface leaks.
  const byHour = new Map<number, { pnl: number; n: number }>();
  const bySetup = new Map<string, { pnl: number; n: number; w: number }>();
  for (const t of trades) {
    const h = new Date(t.opened_at).getUTCHours();
    const hr = byHour.get(h) ?? { pnl: 0, n: 0 };
    hr.pnl += Number(t.pnl); hr.n += 1; byHour.set(h, hr);
    const key = t.setup || "untagged";
    const sr = bySetup.get(key) ?? { pnl: 0, n: 0, w: 0 };
    sr.pnl += Number(t.pnl); sr.n += 1; if (Number(t.pnl) > 0) sr.w += 1; bySetup.set(key, sr);
  }
  const worstHours = Array.from(byHour.entries()).filter(([, v]) => v.n >= 2).sort((a, b) => a[1].pnl - b[1].pnl).slice(0, 2)
    .map(([h, v]) => `${h}:00 UTC (${v.n} trades, net ${v.pnl >= 0 ? "+" : ""}${Math.round(v.pnl)})`);
  const setupLines = Array.from(bySetup.entries()).sort((a, b) => b[1].pnl - a[1].pnl)
    .map(([k, v]) => `  - ${k}: ${v.n} trades, ${Math.round((v.w / v.n) * 100)}% win, net ${v.pnl >= 0 ? "+" : ""}${Math.round(v.pnl)}`);

  return `\n=== THIS STUDENT'S TRADING STATS (their real logged trades — use for personalized coaching when relevant) ===
Closed trades: ${n} | Win rate: ${Math.round((wins.length / n) * 100)}% | Net P&L: ${net >= 0 ? "+" : ""}${Math.round(net)} | Profit factor: ${pf === Infinity ? "∞" : pf.toFixed(2)}${avgR != null ? ` | Avg R: ${avgR.toFixed(2)}` : ""}
Weakest hours: ${worstHours.join("; ") || "n/a"}
By setup:\n${setupLines.join("\n")}
=== END STUDENT STATS ===\n`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: ent } = await supabase
      .from("entitlements")
      .select("has_access")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!ent?.has_access) {
      return new Response(JSON.stringify({ error: "No active access" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, chapterId, highlightedText, persona } = await req.json();

    // Persona flavors the mentor's voice without loosening the guardrails.
    const PERSONAS: Record<string, string> = {
      mentor: "", // default voice, no extra styling
      stoic: "\n\nVOICE: You are a calm, Stoic mentor. Emphasize discipline, patience, process over outcome, and emotional control. Measured and unhurried. Occasionally frame lessons in terms of what is and isn't within the trader's control.",
      quant: "\n\nVOICE: You are a rigorous quant coach. Be precise and data-first — lead with numbers, probabilities, expectancy, and edge. Prefer concrete formulas and worked calculations over vibes. No fluff.",
      devil: "\n\nVOICE: You are a sharp devil's advocate. Pressure-test the student's assumptions, point out where their thinking could blow up an account, and ask a pointed challenging question. Blunt but constructive — the goal is to toughen their process, not to discourage.",
    };
    const personaStyle = PERSONAS[persona] ?? "";

    // The student's own trading stats — so the tutor can give personalized,
    // data-grounded coaching ("your biggest leak is trades after 2pm"),
    // not just generic theory. Compact summary, kept cheap.
    const tradeStats = await buildTradeStats(supabase, user.id);

    // Build BOOK CONTEXT — chapter titles always shown for routing; FULL TEXT
    // only for the current chapter and the top-N chapters scored by keyword
    // overlap with the latest user message. Cuts token usage ~90% vs whole book.
    const { data: allChapters } = await supabase
      .from("book_chapters")
      .select("id, chapter_number, title, subtitle, content")
      .order("order_index");

    const chapters = allChapters ?? [];
    const currentChap = chapterId ? chapters.find((c) => c.id === chapterId) : null;
    const latestUserMsg: string =
      [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";
    const query = `${latestUserMsg} ${highlightedText ?? ""}`.toLowerCase();

    const STOP = new Set([
      "the","a","an","and","or","but","is","are","was","were","be","been","being","of","to","in","on",
      "at","by","for","with","from","as","it","its","this","that","these","those","i","you","we","they",
      "me","my","your","our","their","do","does","did","what","why","how","when","where","which","who",
      "can","could","should","would","will","just","like","about","into","over","than","then","so","not",
      "no","yes","more","most","some","any","all","one","two","very","really","mean","explain","tell",
    ]);
    const tokens = Array.from(
      new Set(
        query
          .replace(/[^a-z0-9\s']/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2 && !STOP.has(w)),
      ),
    );

    // Score chapters: keyword hits in title (x5) + body (x1).
    const scored = chapters.map((c) => {
      const titleLc = (c.title + " " + (c.subtitle ?? "")).toLowerCase();
      const bodyLc = (c.content ?? "").toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (titleLc.includes(t)) score += 5;
        const m = bodyLc.match(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"));
        if (m) score += m.length;
      }
      return { c, score };
    });

    // Selection: current chapter (if any) + top 2 scored chapters (excluding current).
    const picked = new Map<string, any>();
    if (currentChap) picked.set(currentChap.id, currentChap);
    scored
      .filter((s) => s.score > 0 && !picked.has(s.c.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .forEach((s) => picked.set(s.c.id, s.c));

    // Fallback: if nothing matched and no current chapter, include first 2 chapters
    // so the tutor isn't blind.
    if (picked.size === 0) {
      chapters.slice(0, 2).forEach((c) => picked.set(c.id, c));
    }

    let contextBlock = "\n\n=== BOOK CHAPTERS (titles only — full text below for selected) ===\n";
    for (const c of chapters) {
      contextBlock += `Ch ${c.chapter_number}: ${c.title}${c.subtitle ? ` — ${c.subtitle}` : ""}\n`;
    }
    contextBlock += "\n=== RELEVANT CHAPTER TEXT ===\n";
    for (const c of picked.values()) {
      contextBlock += `\n--- Ch ${c.chapter_number}: ${c.title} ---\n${c.content || ""}\n`;
    }
    contextBlock += "\n=== END BOOK CONTEXT ===\n";

    // Built-in knowledge base — general trading fundamentals selected by the
    // same query, so the tutor can answer beyond what the book spells out.
    const kb = selectKnowledge(query, 4);
    if (kb.length) {
      contextBlock += "\n=== TRADING KNOWLEDGE BASE (vetted fundamentals) ===\n";
      for (const e of kb) contextBlock += `\n[${e.title}]\n${e.body}\n`;
      contextBlock += "\n=== END KNOWLEDGE BASE ===\n";
    }

    contextBlock += tradeStats;
    contextBlock += personaStyle;

    if (currentChap) {
      contextBlock += `\nThe reader is currently on Ch ${currentChap.chapter_number} — ${currentChap.title}. Anchor your answer there first.`;
    }
    if (highlightedText) {
      contextBlock += `\n\nUSER HIGHLIGHTED THIS PASSAGE FROM THE CURRENT CHAPTER:\n"""${highlightedText}"""\nExplain this passage using only the book context above.`;
    }
    contextBlock += `\n\nNOTE: The book/KB above are reference material to ground and cite — not a boundary. Answer the question fully from your own trading expertise, and cite [Ch.N] where the book supports a point. If a chapter's full text isn't included, you can still teach the concept and point the student to that chapter to read more.`;

    // Slim the conversation: only keep the last 6 turns so the prompt stays small.
    const trimmedMessages = messages.slice(-6);
    let aiRes: Response;
    try {
      // llmStream tries every configured provider in turn — if the primary
      // model is rate-limited/busy, it silently falls through to a backup.
      aiRes = await llmStream(
        [
          { role: "system", content: SYSTEM_PROMPT + contextBlock + "\n\nIMPORTANT: When you reference a chapter, format the citation EXACTLY as [Ch.N] (e.g. [Ch.3]) so the UI can render it as a tappable link." },
          ...trimmedMessages,
        ],
        { maxTokens: 1200 },
      );
    } catch (e) {
      return new Response(JSON.stringify({ error: "The tutor is busy right now — try again in a moment." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiRes.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("ai-tutor error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});