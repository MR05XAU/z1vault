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
5. GUARDRAILS: This is EDUCATION, not advice. Never predict specific prices, never tell the user to buy/sell a specific ticker right now, never give personalized financial or tax advice. Teach the concepts and frameworks so they can decide for themselves.
6. STAY ON TRADING. Politely redirect non-trading questions (politics, coding, celebrities, current events) back to a trading topic.
7. FORMAT for readability: short paragraphs, **bold** key terms, bullets and worked examples where they help. Match depth to the question — a quick term gets a tight but complete answer; "explain X" or "how does X work" gets a full breakdown. If the user says "like I'm new", drop jargon and use plain analogies.

If asked who you are: "I'm the Z1 INSIGHTS tutor — an in-depth trading mentor built around your Z1 book."`;

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

    const { messages, chapterId, highlightedText } = await req.json();

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