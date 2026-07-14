import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Bookmark, Highlighter, Sparkles, ChevronLeft, ChevronRight, Trophy, X, Download, CheckCircle2, WifiOff, Headphones, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { downloadChapter, getOffline, isOnline, offlineAudioUrl, removeChapter, type DownloadProgress } from "@/lib/offline";
import { WordPopover } from "@/components/WordPopover";

// Chapter titles in the data are often authored as "Chapter N: Title" —
// redundant once we're already showing "Chapter N" as its own label above
// (in the header and the chapter-opener), so strip it for display.
function stripChapterPrefix(title: string): string {
  return title.replace(/^chapter\s+\d+\s*[:.\-–]\s*/i, "");
}

export default function Reader() {
  const { chapterId } = useParams();
  const [searchParams] = useSearchParams();
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
  const [downloaded, setDownloaded] = useState(false);
  const [dlProgress, setDlProgress] = useState<DownloadProgress | null>(null);
  const [online, setOnline] = useState<boolean>(isOnline());
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [wordLookup, setWordLookup] = useState<{ word: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!chapterId) return;
    (async () => {
      // Try network first; fall back to offline cache.
      let ch: any = null;
      try {
        const { data } = await supabase.from("book_chapters").select("*").eq("id", chapterId).maybeSingle();
        ch = data;
      } catch { /* offline */ }
      if (!ch) {
        const cached = await getOffline(chapterId);
        if (cached) ch = cached;
      }
      setChapter(ch);
      const local = await getOffline(chapterId);
      setDownloaded(!!local);
      if (local?.audio_cached && local.audio_url) {
        const u = await offlineAudioUrl(local.audio_url);
        if (u) setAudioBlobUrl(u);
      }
      if (ch) {
        try {
          const { data: all } = await supabase.from("book_chapters").select("id,chapter_number,title").order("order_index");
          const idx = (all ?? []).findIndex((c) => c.id === ch.id);
          setNeighbors({ prev: all?.[idx - 1], next: all?.[idx + 1] });
        } catch {}
      }
    })();
  }, [chapterId]);

  // Scroll restore: ?pos=PX or ?pct=NN from a bookmark, otherwise last_position from progress.
  useEffect(() => {
    if (!chapter || !scrollRef.current || !user) return;
    const el = scrollRef.current;
    const restore = async () => {
      const pos = searchParams.get("pos");
      const pct = searchParams.get("pct");
      if (pos) { el.scrollTop = Number(pos); return; }
      if (pct) {
        const max = el.scrollHeight - el.clientHeight;
        el.scrollTop = Math.max(0, (Number(pct) / 100) * max);
        return;
      }
      const { data } = await supabase
        .from("user_progress").select("last_position")
        .eq("user_id", user.id).eq("chapter_id", chapter.id).maybeSingle();
      if (data?.last_position) el.scrollTop = Number(data.last_position);
    };
    // wait for content to render
    const t = setTimeout(restore, 80);
    return () => clearTimeout(t);
  }, [chapter, user, searchParams]);

  // Selection on mobile: track selectionchange so the action bar appears reliably.
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection()?.toString().trim() ?? "";
      if (sel.length > 3 && scrollRef.current?.contains(window.getSelection()?.anchorNode ?? null)) {
        setSelectedText(sel);
      }
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const startDownload = async () => {
    if (!chapter) return;
    setDlProgress({ stage: "text", loaded: 0, total: chapter.audio_url ? 2 : 1 });
    try {
      await downloadChapter(chapter, (p) => setDlProgress(p));
      setDownloaded(true);
      if (chapter.audio_url) {
        const u = await offlineAudioUrl(chapter.audio_url);
        if (u) setAudioBlobUrl(u);
      }
      toast.success("Saved for offline reading.");
    } catch (e: any) {
      toast.error(e?.message || "Download failed");
    } finally {
      setTimeout(() => setDlProgress(null), 1000);
    }
  };

  const wipeDownload = async () => {
    if (!chapter) return;
    await removeChapter(chapter.id, chapter.audio_url);
    setDownloaded(false);
    setAudioBlobUrl(null);
    toast.success("Removed offline copy.");
  };

  // Persist progress on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !chapter || !user) return;

    // Mark as started immediately so progress isn't lost on short chapters / quick exits.
    (async () => {
      const { data: existing } = await supabase
        .from("user_progress")
        .select("progress_percentage,completed")
        .eq("user_id", user.id)
        .eq("chapter_id", chapter.id)
        .maybeSingle();
      if (!existing) {
        await supabase.from("user_progress").upsert(
          { user_id: user.id, chapter_id: chapter.id, progress_percentage: 5, last_position: 0, completed: false },
          { onConflict: "user_id,chapter_id" },
        );
      }
    })();

    let saveTimer: any;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 100;
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

  // Flush progress on unload so quick exits don't lose the last scroll position.
  useEffect(() => {
    if (!chapter || !user) return;
    const flush = () => {
      const el = scrollRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 100;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_progress?on_conflict=user_id,chapter_id`;
      const body = JSON.stringify({
        user_id: user.id, chapter_id: chapter.id,
        progress_percentage: pct, last_position: el.scrollTop, completed: pct >= 95,
      });
      try {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon?.(url, blob);
      } catch {}
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [chapter, user]);

  const onMouseUp = () => {
    const sel = window.getSelection()?.toString().trim() ?? "";
    setSelectedText(sel.length > 3 ? sel : "");
  };

  // Double-tap / double-click a single word -> definition popover
  const onDoubleClick = (e: React.MouseEvent | React.TouchEvent) => {
    const sel = window.getSelection()?.toString().trim() ?? "";
    // Single-word selection only (no spaces, alpha/hyphen, 2-30 chars)
    if (/^[A-Za-z][A-Za-z\-']{1,29}$/.test(sel)) {
      const touch = "touches" in e ? (e as any).changedTouches?.[0] : null;
      const x = touch?.clientX ?? (e as any).clientX ?? window.innerWidth / 2;
      const y = (touch?.clientY ?? (e as any).clientY ?? window.innerHeight / 2) - 12;
      setWordLookup({ word: sel, x, y });
      setSelectedText("");
    }
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
    else toast.success("Highlighted.");
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
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
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
        <div className="size-8 border-2 border-mint/30 border-t-mint rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] vault-bg flex justify-center">
      <div className="w-full max-w-md flex flex-col relative h-full">
        <header className="sticky top-0 z-20 glass-strong px-4 py-3 safe-top flex items-center gap-3 border-b border-border/60">
          <button onClick={() => nav("/library")} className="size-9 grid place-items-center rounded-full glass press">
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <div className="text-[10px] uppercase tracking-[0.32em] text-mint-bright">
              Chapter {chapter.chapter_number}
            </div>
            <div className="text-sm font-medium truncate">{stripChapterPrefix(chapter.title)}</div>
          </div>
          <button
            onClick={downloaded ? wipeDownload : startDownload}
            disabled={!!dlProgress}
            title={downloaded ? "Remove offline copy" : "Save for offline"}
            className="size-9 grid place-items-center rounded-full glass press"
          >
            {dlProgress ? <Loader2 className="size-4 animate-spin text-mint-bright" />
              : downloaded ? <CheckCircle2 className="size-4 text-success" />
              : <Download className="size-4" />}
          </button>
          <button onClick={addBookmark} className="size-9 grid place-items-center rounded-full glass press">
            <Bookmark className="size-4" />
          </button>
        </header>

        {!online && (
          <div className="px-4 py-1.5 text-[11px] text-center bg-surface-elevated border-b border-border/40 flex items-center justify-center gap-1.5 text-muted-foreground">
            <WifiOff className="size-3" /> Offline — reading saved copy.
          </div>
        )}
        {dlProgress && (
          <div className="px-4 py-2 bg-surface-elevated border-b border-border/40">
            <div className="text-[11px] text-muted-foreground mb-1 flex items-center justify-between">
              <span>{dlProgress.stage === "audio" ? "Downloading narration…" : dlProgress.stage === "text" ? "Caching chapter…" : "Done"}</span>
              <span>{dlProgress.loaded}/{dlProgress.total}</span>
            </div>
            <div className="h-1 bg-border-strong rounded-full overflow-hidden">
              <div className="h-full mint-fill transition-all" style={{ width: `${(dlProgress.loaded / Math.max(1, dlProgress.total)) * 100}%` }} />
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          onMouseUp={onMouseUp}
          onTouchEnd={onMouseUp}
          onDoubleClick={onDoubleClick}
          className="flex-1 overflow-y-auto px-6 py-8 pb-[max(env(safe-area-inset-bottom),2rem)] prose-z1"
        >
          {/* Chapter opener — a book's chapter-start page, not a small app label */}
          <div className="mb-10 text-center">
            <div className="mx-auto h-px w-8 bg-mint/50" />
            <div className="mt-4 text-[10px] uppercase tracking-[0.4em] text-mint-bright">
              {chapter.is_background ? "Appendix" : `Chapter ${chapter.chapter_number}`}
            </div>
            <h1 className="display mt-2 text-[28px] font-medium leading-tight">{stripChapterPrefix(chapter.title)}</h1>
            {chapter.subtitle && <p className="mt-2 text-sm italic text-muted-foreground">{chapter.subtitle}</p>}
            <div className="mx-auto mt-4 h-px w-8 bg-mint/50" />
          </div>
          {(audioBlobUrl || chapter.audio_url) && chapter.audio_url && (
            <div className="glass rounded-2xl p-3 mb-6 flex items-center gap-2">
              <Headphones className="size-4 text-mint-bright" />
              <audio controls src={audioBlobUrl ?? chapter.audio_url} className="flex-1 h-9" />
            </div>
          )}
          <ReactMarkdown>{chapter.content}</ReactMarkdown>

          {/* End-of-chapter ornament */}
          <div className="mt-10 flex items-center justify-center gap-2 text-mint/50">
            <span className="h-px w-6 bg-current" />
            <span className="size-1 rounded-full bg-current" />
            <span className="h-px w-6 bg-current" />
          </div>

          <div className="mt-8 pt-6 border-t border-border-strong">
            {chapter.is_background ? (
              <Button
                onClick={async () => {
                  if (user) {
                    await supabase.from("user_progress").upsert(
                      { user_id: user.id, chapter_id: chapter.id, progress_percentage: 100, last_position: scrollRef.current?.scrollTop ?? 0, completed: true },
                      { onConflict: "user_id,chapter_id" },
                    );
                  }
                  if (neighbors.next) nav(`/read/${neighbors.next.id}`);
                  else nav("/library");
                }}
                className="w-full h-14 rounded-2xl mint-fill font-medium shadow-glow press"
              >
                <CheckCircle2 className="size-4 mr-2" /> Mark complete & continue
              </Button>
            ) : (
            <Button
              onClick={async () => {
                if (user) {
                  await supabase.from("user_progress").upsert(
                    { user_id: user.id, chapter_id: chapter.id, progress_percentage: 100, last_position: scrollRef.current?.scrollTop ?? 0, completed: true },
                    { onConflict: "user_id,chapter_id" },
                  );
                }
                nav(`/quiz/${chapter.id}`);
              }}
              className="w-full h-14 rounded-2xl mint-fill font-medium shadow-glow press"
            >
              <Trophy className="size-4 mr-2" /> Take the chapter quiz
            </Button>
            )}
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
            <div className="glass-strong rounded-2xl px-2 py-2 flex items-center gap-1 shadow-lift mint-border">
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
              <SheetTitle className="display mint-text">Add a note</SheetTitle>
            </SheetHeader>
            <p className="text-xs text-muted-foreground mt-2 italic line-clamp-3">"{selectedText}"</p>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Your thought on this passage…"
              className="mt-3 min-h-24 bg-background/50 border-border-strong rounded-xl"
            />
            <Button onClick={() => saveHighlight(noteText)} className="mt-3 w-full mint-fill h-12 rounded-xl press">
              Save highlight + note
            </Button>
          </SheetContent>
        </Sheet>

        <Sheet open={actionSheet === "ask"} onOpenChange={(o) => !o && setActionSheet(null)}>
          <SheetContent side="bottom" className="bg-surface-elevated border-border-strong rounded-t-3xl max-h-[80dvh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="display mint-text flex items-center gap-2">
                <Sparkles className="size-4" /> AI Tutor
              </SheetTitle>
            </SheetHeader>
            <p className="text-xs text-muted-foreground italic mt-2 line-clamp-3">"{selectedText}"</p>
            <div className="mt-4 prose-z1 text-sm min-h-20">
              {asking && !askAnswer ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="size-2 rounded-full bg-mint animate-pulse" />
                  Thinking…
                </div>
              ) : (
                <ReactMarkdown>{askAnswer}</ReactMarkdown>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
      {wordLookup && (
        <WordPopover
          word={wordLookup.word}
          x={wordLookup.x}
          y={wordLookup.y}
          chapterId={chapter.id}
          onClose={() => setWordLookup(null)}
        />
      )}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl press hover:bg-foreground/5 text-foreground">
      <Icon className="size-4 text-mint-bright" />
      <span className="text-[10px] tracking-wide">{label}</span>
    </button>
  );
}