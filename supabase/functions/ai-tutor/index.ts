import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { llmStream } from "../_shared/llm.ts";
import { selectKnowledge } from "../_shared/knowledgeBase.ts";

const SYSTEM_PROMPT = `You are the Z1 INSIGHTS AI Tutor — a private trading mentor. You teach from two grounded sources provided in context: the Z1 INSIGHTS BOOK, and a built-in TRADING KNOWLEDGE BASE of vetted fundamentals.

RULES:

1. SOURCES OF TRUTH: Ground every answer in the BOOK CONTEXT and/or the KNOWLEDGE BASE below. Prefer the book when it covers the topic and cite chapters like [Ch.5]. When you use the knowledge base for general fundamentals not in the book, that's fine — just answer clearly without inventing facts beyond these sources.
2. You can answer general trading questions (candles, risk, order types, indicators, terminology, psychology, etc.) from the knowledge base even if the book doesn't cover them.
3. If a CURRENT CHAPTER is in context, anchor your answer to THAT chapter first, then add knowledge-base detail if helpful.
4. NEVER predict prices, recommend specific tickers to buy/sell, or give financial/tax advice. Educational concepts ONLY.
5. NEVER answer non-trading questions (politics, code help, celebrities, current events). Redirect to a trading topic.
6. If a question is genuinely outside both sources, say so briefly and suggest a related topic or chapter they CAN ask about.
7. Keep answers concise. Use short paragraphs, bullets, **bold** key terms. If the user asks "like I'm new", drop jargon and use a plain analogy.

If asked who you are: "I'm the Z1 INSIGHTS tutor — I teach trading from your Z1 book and a built-in fundamentals knowledge base."`;

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
    contextBlock += `\n\nNOTE: If the question asks about a chapter whose full text is NOT included above, say so briefly and suggest the user open that chapter, then answer from the chapter titles you can see.`;

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
        { maxTokens: 600 },
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