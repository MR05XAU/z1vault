import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Sparkles, Send, BookOpen, Loader2, RotateCcw, CandlestickChart, Shield, Brain, LineChart, Layers, Wallet } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

// Starter questions grouped by topic so an empty tutor offers real variety
// across everything it can teach in depth.
const STARTER_CATEGORIES: { title: string; icon: any; questions: string[] }[] = [
  {
    title: "Charts & price action",
    icon: CandlestickChart,
    questions: [
      "How do I actually read a candlestick?",
      "What is market structure and how do I spot a trend change?",
      "How do support and resistance zones really work?",
      "Explain order blocks and fair value gaps.",
    ],
  },
  {
    title: "Risk & money management",
    icon: Shield,
    questions: [
      "How do I size a position using the 1% rule?",
      "What is R-multiple and how do I use it?",
      "Why does win rate matter less than expectancy?",
      "Where should I actually place my stop loss?",
    ],
  },
  {
    title: "Strategy & setups",
    icon: Layers,
    questions: [
      "What makes a trading setup have an edge?",
      "Scalping vs day trading vs swing trading — which suits me?",
      "How do I build and backtest a trading plan?",
      "How should I use multiple timeframes together?",
    ],
  },
  {
    title: "Indicators & tools",
    icon: LineChart,
    questions: [
      "How does RSI work and when does it mislead?",
      "Explain VWAP and why intraday traders watch it.",
      "What do moving averages actually tell me?",
      "MACD explained — what is it really showing?",
    ],
  },
  {
    title: "Psychology & discipline",
    icon: Brain,
    questions: [
      "How do I stop revenge trading after a loss?",
      "How do I deal with FOMO and chasing moves?",
      "How do I build discipline and stick to my plan?",
      "Why do I keep cutting winners early?",
    ],
  },
  {
    title: "Markets & mechanics",
    icon: Wallet,
    questions: [
      "How does leverage really work and why is it dangerous?",
      "Futures vs forex vs stocks — what's the difference?",
      "What are the bid, ask and spread?",
      "Market orders vs limit orders — when to use each?",
    ],
  },
];

export default function Tutor() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [chapterByNum, setChapterByNum] = useState<Record<number, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Chapter-number -> id map so [Ch.N] citations become tappable.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("book_chapters").select("id,chapter_number").order("order_index");
      const map: Record<number, string> = {};
      for (const c of data ?? []) map[c.chapter_number] = c.id;
      setChapterByNum(map);
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || streaming) return;
    setInput("");
    const history = [...messages, { role: "user" as const, content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: j.error || "The tutor is unavailable right now — try again in a moment." }; return c; });
        setStreaming(false);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "", buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const p = t.slice(5).trim();
          if (p === "[DONE]") continue;
          try {
            const delta = JSON.parse(p).choices?.[0]?.delta?.content;
            if (delta) { acc += delta; setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: acc }; return c; }); }
          } catch { /* skip partial chunk */ }
        }
      }
    } catch {
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: "Connection error — check your network and try again." }; return c; });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <MobileShell
      noPadding
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 pb-3 safe-top flex items-center gap-3 border-b border-border/40">
          <div className="size-10 rounded-2xl mint-fill grid place-items-center shadow-glow">
            <Sparkles className="size-5" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-mint-bright">AI Tutor</div>
            <div className="text-sm font-medium">Ask anything about trading</div>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="size-9 grid place-items-center rounded-full glass press text-muted-foreground" title="New chat">
              <RotateCcw className="size-4" />
            </button>
          )}
        </header>
      }
    >
      <div ref={scrollRef} className="h-[calc(100dvh-13rem)] overflow-y-auto px-4 pt-4 pb-4">
        {messages.length === 0 ? (
          <div className="animate-fade-up pt-4">
            <div className="text-center">
              <div className="size-14 rounded-2xl mint-fill grid place-items-center mx-auto mb-3 shadow-glow">
                <BookOpen className="size-6" />
              </div>
              <h2 className="display text-xl font-medium">Your private trading mentor.</h2>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">
                Grounded in your Z1 book and a built-in trading knowledge base. Ask a question or tap one below.
              </p>
            </div>
            <div className="mt-7 space-y-5">
              {STARTER_CATEGORIES.map((cat) => (
                <div key={cat.title}>
                  <div className="mb-2 flex items-center gap-2">
                    <cat.icon className="size-3.5 text-mint-bright" />
                    <span className="text-[10px] uppercase tracking-[0.24em] text-mint-bright">{cat.title}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {cat.questions.map((q) => (
                      <button key={q} onClick={() => send(q)} className="text-left glass rounded-xl px-3.5 py-2.5 press hover:shadow-glow">
                        <div className="text-[13px] font-medium leading-snug">{q}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-mint/15 border border-mint/25 px-4 py-2.5 text-sm">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[92%]">
                    {m.content === "" && streaming ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm py-1">
                        <div className="size-2 rounded-full bg-mint animate-pulse" /> Thinking…
                      </div>
                    ) : (
                      <>
                        <div className="prose-z1 text-sm">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                        <CitationChips content={m.content} chapterByNum={chapterByNum} onOpen={(id) => nav(`/read/${id}`)} />
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] px-4">
        <div className="mx-auto max-w-2xl glass-strong rounded-2xl flex items-end gap-2 p-2 shadow-lift">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={1}
            placeholder="Ask the tutor…"
            className="flex-1 resize-none bg-transparent outline-none text-sm px-2 py-2 max-h-28 placeholder:text-muted-foreground"
          />
          <button
            onClick={() => send(input)}
            disabled={streaming || !input.trim()}
            className="size-9 shrink-0 grid place-items-center rounded-xl mint-fill press disabled:opacity-40"
          >
            {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}

// Renders tappable chapter chips for any [Ch.N] citations in an answer.
function CitationChips({ content, chapterByNum, onOpen }: { content: string; chapterByNum: Record<number, string>; onOpen: (id: string) => void }) {
  const nums = useMemo(() => {
    const set = new Set<number>();
    for (const m of content.matchAll(/\[Ch\.?\s*(\d+)/gi)) set.add(Number(m[1]));
    return Array.from(set).filter((n) => chapterByNum[n]);
  }, [content, chapterByNum]);
  if (nums.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {nums.map((n) => (
        <button key={n} onClick={() => onOpen(chapterByNum[n])} className="flex items-center gap-1 rounded-full glass px-2.5 py-1 text-[11px] mint-text press">
          <BookOpen className="size-3" /> Chapter {n}
        </button>
      ))}
    </div>
  );
}
