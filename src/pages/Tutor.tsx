import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Z1Logo } from "@/components/Z1Logo";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string }

const STARTERS = [
  "Explain the 1% rule like I'm new",
  "Summarize Chapter 1",
  "What's the difference between trending and ranging markets?",
  "Why does process matter more than outcome?",
];

export default function Tutor() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);

    const placeholder: Msg = { role: "assistant", content: "" };
    setMessages((m) => [...m, placeholder]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "Tutor unavailable");
        setMessages((m) => m.slice(0, -1));
        setBusy(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {}
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell
      noPadding
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 pb-3 safe-top flex items-center gap-3 border-b border-border/40">
          <Z1Logo size={40} />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold-bright">AI Tutor</div>
            <div className="text-sm font-medium">Restricted to the book.</div>
          </div>
          <div className="size-2 rounded-full bg-success animate-pulse" />
        </header>
      }
    >
      <div ref={scrollRef} className="px-5 py-6 pb-44 overflow-y-auto h-[calc(100dvh-12rem)]">
        {messages.length === 0 ? (
          <div className="text-center pt-10 animate-fade-up">
            <div className="size-16 rounded-2xl gold-fill grid place-items-center mx-auto mb-4 shadow-glow">
              <Sparkles className="size-7" />
            </div>
            <h2 className="display text-2xl font-medium">Ask anything about the book.</h2>
            <p className="text-sm text-muted-foreground mt-2">
              The tutor only answers trading questions grounded in your Z1 chapters.
            </p>
            <div className="mt-6 space-y-2">
              {STARTERS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full glass rounded-2xl px-4 py-3 text-sm text-left press hover:shadow-glow animate-fade-up"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-secondary text-foreground text-sm">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[92%] prose-z1 text-sm">
                    {m.content ? (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="size-2 rounded-full bg-gold animate-pulse" />
                        <span className="text-xs">Thinking…</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-30 safe-bottom">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="glass-strong rounded-2xl flex items-center gap-2 p-2 shadow-lift"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the tutor…"
            className="flex-1 bg-transparent outline-none text-sm px-3 py-2 placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="size-10 rounded-xl gold-fill grid place-items-center press disabled:opacity-50 shadow-glow"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
      </div>
    </MobileShell>
  );
}