// Generates a daily trading tip + motivational line via Lovable AI.
// Mode shapes the tone: "daily" = general morning brief; "after-loss" / "after-quiz-fail" = recovery nudge.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODES = ["daily", "after-loss", "after-quiz-fail", "before-session"] as const;
type Mode = typeof MODES[number];

const SYSTEM = `You are the Z1 INSIGHTS mindset coach for serious traders.
Voice: short, sharp, premium. No corny gym-bro clichés. No "rise and grind".
Think Mark Douglas / Jesse Livermore meets a private-banking advisor.
Always return ONE concrete tactical TIP plus ONE motivational LINE.
Never break character. Never reference being an AI.`;

const PROMPTS: Record<Mode, string> = {
  "daily": "Give one trading tip for today (risk, psychology, discipline, or process) plus one short motivational line. Vary the topic — don't repeat 'stick to your plan'.",
  "after-loss": "The trader just took a loss. Give one constructive tip to reset and one short line reminding them losses are part of the edge. Reference 'one loss away from a win' or similar mindset, but make it fresh, not corny.",
  "after-quiz-fail": "The trader just failed a quiz. Give one study tip plus one short line reminding them mastery is iterative, not instant.",
  "before-session": "The trader is about to open their charts. Give one pre-market checklist tip plus one calm, focused line.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const mode: Mode = MODES.includes(body?.mode) ? body.mode : "daily";
    // Seed adds entropy so two same-day calls don't collide; client passes a date for caching parity.
    const seed = String(body?.seed ?? Date.now());

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `${PROMPTS[mode]}\n\nReturn STRICT JSON: {"tip": "...", "quote": "...", "tag": "Discipline|Risk|Psychology|Patience|Process|Recovery"}\nKeep tip under 140 chars. Keep quote under 90 chars. No emojis. No quotation marks inside values.\nVariation seed: ${seed}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.95,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: `AI ${res.status}`, detail: txt.slice(0, 300) }), {
        status: res.status === 402 || res.status === 429 ? res.status : 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { tip?: string; quote?: string; tag?: string } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    return new Response(JSON.stringify({
      tip: parsed.tip ?? "Risk first. Reward follows.",
      quote: parsed.quote ?? "You're one disciplined trade away from your edge.",
      tag: parsed.tag ?? "Discipline",
      mode,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});