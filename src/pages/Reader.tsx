import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Bookmark, Highlighter, Sparkles, ChevronLeft, ChevronRight, Trophy, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export default function Reader() {
  const { chapterId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [chapter, setChapter] = useState<any>(null);
  const [neighbors, setNeighbors] = useState<{ prev?: any; next?: any }>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [actionSheet, setActionSheet] = useState<null | "highlight" | "ask" | "note">(null);
  const [noteText, setNoteText] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!chapterId) return;
    (async () => {
      const { data: ch } = await supabase.from("book_chapters").select("*").eq("id", chapterId).maybeSingle();
      setChapter(ch);
      if (ch) {
        const { data: all } = await supabase.from("book_chapters").select("id,chapter_number,title").order("order_index");
        const idx = (all ?? []).findIndex((c) => c.id === ch.id);
        setNeighbors({ prev: all?.[idx - 1], next: all?.[idx + 1] });
      }
    })();
  }, [chapterId]);

  // Persist progress on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !chapter) return;
    let saveTimer: any;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        await supabase.from("user_progress").upsert(
          {
            user_id: user!.id,
            chapter_id: chapter.id,
            progress_percentage: pct,
            last_position: el.scrollTop,
            completed: pct >= 95,
          },
          { onConflict: "user_id,chapter_id" }
        );
      }, 700);
    };
    el.addEventListener("scroll", onScroll);
    return () => { el.removeEventListener("scroll", onScroll); clearTimeout(saveTimer); };
  }, [chapter, user]);

  const onMouseUp = () => {
    const sel = window.getSelection()?.toString().trim() ?? "";
    setSelectedText(sel.length > 3 ? sel : "");
  };

  const saveHighlight = async (note?: string) => {
    if (!selectedText || !chapter) return;
    const { error } = await supabase.from("highlights").insert({
      user_id: user!.id,
      chapter_id: chapter.id,
      highlighted_text: selectedText,
      note: note ?? null,
    });
    if (error) toast.error(error.message);
    else toast.success("Highlighted in gold.");
    setSelectedText("");
    setActionSheet(null);
    setNoteText("");
  };

  const addBookmark = async () => {
    if (!chapter) return;
    const el = scrollRef.current;
    const pct = el ? Math.round((el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)) * 100) : 0;
    const { error } = await supabase.from("bookmarks").insert({
      user_id: user!.id,
      chapter_id: chapter.id,
      page_reference: `${pct}%`,
    });
    if (error) toast.error(error.message);
    else toast.success("Bookmark saved.");
  };

  const askAI = async () => {
    if (!selectedText || !chapter) return;
    setAsking(true);
    setAskAnswer("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          chapterId: chapter.id,
          highlightedText: selectedText,
          messages: [{ role: "user", content: `Explain this passage from the book in simple terms, and tell me why it matters for a trader.` }],
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "Tutor unavailable");
        setAsking(false);
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
            if (delta) { acc += delta; setAskAnswer(acc); }
          } catch {}
        }
      }
    } finally {
      setAsking(false);
    }
  };

  if (!chapter) {
    return (
      <div className="min-h-[100dvh] vault-bg grid place-items-center">
        <div className="size-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] vault-bg flex justify-center">
      <div className="w-full max-w-md flex flex-col relative">
        <header className="sticky top-0 z-20 glass-strong px-4 py-3 safe-top flex items-center gap-3 border-b border-border/60">
          <button onClick={() => nav("/library")} className="size-9 grid place-items-center rounded-full glass press">
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <div className="text-[10px] uppercase tracking-[0.32em] text-gold-bright">
              Chapter {chapter.chapter_number}
            </div>
            <div className="text-sm font-medium truncate">{chapter.title}</div>
          </div>
          <button onClick={addBookmark} className="size-9 grid place-items-center rounded-full glass press">
            <Bookmark className="size-4" />
          </button>
        </header>

        <div
          ref={scrollRef}
          onMouseUp={onMouseUp}
          onTouchEnd={onMouseUp}
          className="flex-1 overflow-y-auto px-6 py-8 pb-40 prose-z1"
        >
          <div className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground mb-2">
            {chapter.subtitle}
          </div>
          <ReactMarkdown>{chapter.content}</ReactMarkdown>

          <div className="mt-12 pt-6 border-t border-border-strong">
            <Button
              onClick={() => nav(`/quiz/${chapter.id}`)}
              className="w-full h-14 rounded-2xl gold-fill font-medium shadow-glow press"
            >
              <Trophy className="size-4 mr-2" /> Take the chapter quiz
            </Button>
            <div className="flex gap-2 mt-3">
              {neighbors.prev && (
                <Button variant="outline" onClick={() => nav(`/read/${neighbors.prev.id}`)} className="flex-1 h-12 rounded-xl border-border-strong">
                  <ChevronLeft className="size-4 mr-1" /> Previous
                </Button>
              )}
              {neighbors.next && (
                <Button onClick={() => nav(`/read/${neighbors.next.id}`)} className="flex-1 h-12 rounded-xl bg-secondary text-foreground hover:bg-secondary/80">
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {selectedText && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 animate-slide-up">
            <div className="glass-strong rounded-2xl px-2 py-2 flex items-center gap-1 shadow-lift gold-border">
              <ActionBtn icon={Highlighter} label="Highlight" onClick={() => saveHighlight()} />
              <ActionBtn icon={Bookmark} label="Note" onClick={() => { setActionSheet("note"); setNoteText(""); }} />
              <ActionBtn icon={Sparkles} label="Ask AI" onClick={() => { setActionSheet("ask"); setAskAnswer(""); askAI(); }} />
              <button onClick={() => setSelectedText("")} className="size-9 grid place-items-center rounded-xl text-muted-foreground press">
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        <Sheet open={actionSheet === "note"} onOpenChange={(o) => !o && setActionSheet(null)}>
          <SheetContent side="bottom" className="bg-surface-elevated border-border-strong rounded-t-3xl">
            <SheetHeader>
              <SheetTitle className="display gold-text">Add a note</SheetTitle>
            </SheetHeader>
            <p className="text-xs text-muted-foreground mt-2 italic line-clamp-3">"{selectedText}"</p>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Your thought on this passage…"
              className="mt-3 min-h-24 bg-background/50 border-border-strong rounded-xl"
            />
            <Button onClick={() => saveHighlight(noteText)} className="mt-3 w-full gold-fill h-12 rounded-xl press">
              Save highlight + note
            </Button>
          </SheetContent>
        </Sheet>

        <Sheet open={actionSheet === "ask"} onOpenChange={(o) => !o && setActionSheet(null)}>
          <SheetContent side="bottom" className="bg-surface-elevated border-border-strong rounded-t-3xl max-h-[80dvh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="display gold-text flex items-center gap-2">
                <Sparkles className="size-4" /> AI Tutor
              </SheetTitle>
            </SheetHeader>
            <p className="text-xs text-muted-foreground italic mt-2 line-clamp-3">"{selectedText}"</p>
            <div className="mt-4 prose-z1 text-sm min-h-20">
              {asking && !askAnswer ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="size-2 rounded-full bg-gold animate-pulse" />
                  Thinking…
                </div>
              ) : (
                <ReactMarkdown>{askAnswer}</ReactMarkdown>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl press hover:bg-foreground/5 text-foreground">
      <Icon className="size-4 text-gold-bright" />
      <span className="text-[10px] tracking-wide">{label}</span>
    </button>
  );
}