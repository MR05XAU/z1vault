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

// Chapter bodies are often authored with their own leading "# Chapter N:
// Title" line — the opener already presents the title in full, so strip a
// leading H1 from the markdown to avoid rendering it twice.
function stripLeadingH1(content: string): string {
  return content.replace(/^\s*#\s+.+\r?\n+/, "");
}

// Splits chapter markdown into block-level units (paragraphs, headings,
// lists). Pages are then packed from consecutive blocks based on *measured*
// heights against the real page height — so a page never holds more text
// than fits on screen and never needs internal scrolling.
function splitIntoBlocks(markdown: string): string[] {
  const trimmed = markdown.trim();
  if (!trimmed) return [];
  return trimmed.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
}

// Overrides the design-system's color variables to a warm paper palette,
// scoped to this element and its children — every existing text-foreground /
// text-muted-foreground / mint-text / border-border class automatically
// re-themes since they all read from these same CSS variables.
const PAPER_VARS = {
  "--background": "42 38% 93%",
  "--foreground": "30 25% 50%",
  "--card": "42 38% 93%",
  "--card-foreground": "30 25% 50%",
  "--popover": "42 38% 93%",
  "--popover-foreground": "30 25% 50%",
  "--muted": "38 22% 84%",
  "--muted-foreground": "30 14% 62%",
  "--secondary": "38 22% 84%",
  "--secondary-foreground": "30 25% 50%",
  "--accent": "38 22% 84%",
  "--accent-foreground": "30 25% 50%",
  "--border": "30 18% 72% / 0.6",
  "--border-strong": "30 20% 60% / 0.7",
  "--mint": "38 65% 38%",
  "--mint-bright": "38 70% 32%",
  "--mint-deep": "38 60% 25%",
  "--mint-foreground": "42 38% 96%",
  "--primary": "38 65% 38%",
  "--primary-foreground": "42 38% 96%",
  "--gradient-mint": "linear-gradient(135deg, hsl(38 75% 45%) 0%, hsl(38 65% 38%) 45%, hsl(38 60% 28%) 100%)",
} as React.CSSProperties;

export default function Reader() {
  const { chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [chapter, setChapter] = useState<any>(null);
  const [neighbors, setNeighbors] = useState<{ prev?: any; next?: any }>({});
  const pageRef = useRef<HTMLDivElement>(null);
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

  const [pageIndex, setPageIndex] = useState(0);
  const [turnDir, setTurnDir] = useState<"next" | "prev">("next");
  const [turnKey, setTurnKey] = useState(0);
  const [isWide, setIsWide] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Measurement-driven pagination: blocks are measured off-screen at the real
  // page width, then greedily packed into pages that fit the real page height.
  const stageRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const openerMeasureRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [pageMap, setPageMap] = useState<number[][]>([]);
  const restoredRef = useRef<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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
      setPageIndex(0);
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

  const blocks = useMemo(() => (chapter ? splitIntoBlocks(stripLeadingH1(chapter.content)) : []), [chapter]);
  const pagesPerView = isWide ? 2 : 1;

  // Track the live size of the page stage so pagination follows the viewport.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setStageSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [chapter]);

  // Pack measured blocks into pages that fit the page height exactly —
  // no internal scrolling. Page 0 reserves space for the chapter opener.
  useEffect(() => {
    if (!measureRef.current || blocks.length === 0 || stageSize.h < 100 || stageSize.w < 100) return;
    const el = measureRef.current;
    const cs = getComputedStyle(el);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const footerReserve = 44; // page-number line + its top margin
    // 8px slack absorbs sub-pixel/rounding drift between measure and render
    // so the last block on a page can never be clipped by the page edge.
    const capacity = Math.max(120, stageSize.h - padY - footerReserve - 8);
    const openerH = openerMeasureRef.current?.offsetHeight ?? 0;
    const blockEls = Array.from(el.querySelectorAll("[data-block]")) as HTMLElement[];
    const out: number[][] = [];
    let cur: number[] = [];
    let used = openerH;
    blockEls.forEach((be, i) => {
      const h = be.offsetHeight;
      if (cur.length > 0 && used + h > capacity) { out.push(cur); cur = []; used = 0; }
      cur.push(i);
      used += h;
    });
    if (cur.length) out.push(cur);
    // Orphan control: never leave a heading stranded as the last line of a
    // page — carry it over to open the next page with its section instead.
    for (let p = 0; p < out.length - 1; p++) {
      const page = out[p];
      while (page.length > 1 && /^#{1,6}\s/.test(blocks[page[page.length - 1]] ?? "")) {
        out[p + 1].unshift(page.pop()!);
      }
    }
    setPageMap(out);
  }, [blocks, stageSize, pagesPerView]);

  const totalPages = pageMap.length;
  const visibleSpecs = pageMap.slice(pageIndex, pageIndex + pagesPerView);
  const isLastPage = totalPages > 0 && pageIndex + pagesPerView >= totalPages;

  // Restore reading position once per chapter — by percentage, not raw page
  // index, since page counts differ per device/viewport under measured
  // pagination (a phone has more, smaller pages than a desktop spread).
  useEffect(() => {
    if (!chapter || !user || totalPages === 0 || restoredRef.current === chapter.id) return;
    restoredRef.current = chapter.id;
    (async () => {
      const toPage = (pct: number) => Math.min(totalPages - 1, Math.max(0, Math.floor((pct / 100) * totalPages)));
      const pct = searchParams.get("pct");
      if (pct) { setPageIndex(toPage(Number(pct))); return; }
      const { data } = await supabase
        .from("user_progress").select("progress_percentage,completed")
        .eq("user_id", user.id).eq("chapter_id", chapter.id).maybeSingle();
      if (data && !data.completed && data.progress_percentage != null && Number(data.progress_percentage) < 100) {
        setPageIndex(toPage(Number(data.progress_percentage)));
      }
    })();
  }, [chapter, user, totalPages, searchParams]);

  // Keep pageIndex valid when repagination shrinks the page count (resize).
  useEffect(() => {
    if (totalPages > 0 && pageIndex >= totalPages) setPageIndex(totalPages - 1);
  }, [totalPages, pageIndex]);

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

  const saveProgress = async (newIndex: number) => {
    if (!user || !chapter || totalPages === 0) return;
    const pct = Math.min(100, Math.round(((newIndex + pagesPerView) / totalPages) * 100));
    await supabase.from("user_progress").upsert(
      { user_id: user.id, chapter_id: chapter.id, progress_percentage: pct, last_position: newIndex, completed: pct >= 100 },
      { onConflict: "user_id,chapter_id" },
    );
  };

  // Flush progress on unload so quick exits don't lose the current page.
  useEffect(() => {
    if (!chapter || !user) return;
    const flush = () => {
      const pct = totalPages ? Math.min(100, Math.round(((pageIndex + pagesPerView) / totalPages) * 100)) : 0;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_progress?on_conflict=user_id,chapter_id`;
      const body = JSON.stringify({
        user_id: user.id, chapter_id: chapter.id,
        progress_percentage: pct, last_position: pageIndex, completed: pct >= 100,
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
  }, [chapter, user, pageIndex, totalPages, pagesPerView]);

  const goToPage = (newIndex: number, dir: "next" | "prev") => {
    const clamped = Math.max(0, Math.min(newIndex, Math.max(0, totalPages - 1)));
    if (clamped === pageIndex) return;
    setTurnDir(dir);
    setPageIndex(clamped);
    setTurnKey((k) => k + 1);
    saveProgress(clamped);
  };
  const nextPage = () => goToPage(pageIndex + pagesPerView, "next");
  const prevPage = () => goToPage(pageIndex - pagesPerView, "prev");

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0]?.clientX ?? null; };
  const onTouchEndSwipe = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 60) return;
    if (dx < 0) nextPage(); else prevPage();
  };

  // Desktop: turn pages with the arrow keys (unless a sheet/input has focus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (actionSheet) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") nextPage();
      else if (e.key === "ArrowLeft") prevPage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onMouseUp = () => {
    const sel = window.getSelection()?.toString().trim() ?? "";
    setSelectedText(sel.length > 3 ? sel : "");
  };

  // Double-tap / double-click a single word -> definition popover
  const onDoubleClick = (e: React.MouseEvent | React.TouchEvent) => {
    const sel = window.getSelection()?.toString().trim() ?? "";
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
    const pct = totalPages ? Math.round(((pageIndex + pagesPerView) / totalPages) * 100) : 0;
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

  const completeChapter = async (goTo: () => void) => {
    if (user && chapter) {
      await supabase.from("user_progress").upsert(
        { user_id: user.id, chapter_id: chapter.id, progress_percentage: 100, last_position: Math.max(0, totalPages - 1), completed: true },
        { onConflict: "user_id,chapter_id" },
      );
    }
    goTo();
  };

  if (!chapter) {
    return (
      <div className="min-h-[100dvh] vault-bg grid place-items-center">
        <div className="size-8 border-2 border-mint/30 border-t-mint rounded-full animate-spin" />
      </div>
    );
  }

  // Chapter opener — rendered on page 0 and (identically) in the hidden
  // measurer so pagination accounts for its exact height.
  const opener = (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto h-px w-8 bg-mint/50" />
        <div className="mt-4 text-[10px] uppercase tracking-[0.4em] text-mint-bright">
          {chapter.is_background ? "Appendix" : `Chapter ${chapter.chapter_number}`}
        </div>
        <h1 className="display mt-2 text-[26px] font-medium leading-tight text-foreground">{stripChapterPrefix(chapter.title)}</h1>
        {chapter.subtitle && <p className="mt-2 text-sm italic text-muted-foreground">{chapter.subtitle}</p>}
        <div className="mx-auto mt-4 h-px w-8 bg-mint/50" />
      </div>
      {(audioBlobUrl || chapter.audio_url) && chapter.audio_url && (
        <div className="rounded-2xl border border-border p-3 mb-6 flex items-center gap-2 bg-black/5">
          <Headphones className="size-4 text-mint-bright" />
          <audio controls src={audioBlobUrl ?? chapter.audio_url} className="flex-1 h-9" />
        </div>
      )}
    </>
  );

  // The measure page width mirrors one page of the spread: stage width,
  // halved (minus the 2px gap) when showing two pages.
  const measureW = pagesPerView === 2 ? Math.floor((stageSize.w - 2) / 2) : stageSize.w;

  return (
    <div className="h-[100dvh] vault-bg flex flex-col items-center">
      <div className="w-full max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl flex flex-col relative h-full">
        <header className="sticky top-0 z-20 glass-strong px-4 py-3 safe-top flex items-center gap-3 border-b border-border/60">
          <button onClick={() => nav("/library")} className="size-9 grid place-items-center rounded-full glass press">
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex-1 min-w-0 text-center text-xs text-muted-foreground truncate">
            {stripChapterPrefix(chapter.title)}
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

        {/* The book itself — one paper leaf on mobile, a two-page spread on desktop */}
        <div ref={stageRef} className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 overflow-hidden px-3 py-4 md:px-6">
          {/* Hidden measurer: same width, typography, and padding as one real
              page, used to compute how many blocks fit per page. */}
          {measureW > 100 && (
            <div
              ref={measureRef}
              aria-hidden
              style={{ ...PAPER_VARS, position: "fixed", left: -99999, top: 0, width: measureW, visibility: "hidden", pointerEvents: "none" }}
              className="px-6 py-8 md:px-10 md:py-10 prose-z1"
            >
              <div ref={openerMeasureRef} style={{ display: "flow-root" }}>{opener}</div>
              {blocks.map((b, i) => (
                <div key={i} data-block className={i === 0 ? "drop-cap" : undefined} style={{ display: "flow-root" }}>
                  <ReactMarkdown>{b}</ReactMarkdown>
                </div>
              ))}
            </div>
          )}

          {totalPages === 0 ? (
            <div className="size-8 border-2 border-mint/30 border-t-mint rounded-full animate-spin" />
          ) : (
            <div
              key={turnKey}
              ref={pageRef}
              onMouseUp={onMouseUp}
              onDoubleClick={onDoubleClick}
              onTouchStart={onTouchStart}
              onTouchEnd={(e) => { onMouseUp(); onTouchEndSwipe(e); }}
              className={`relative flex w-full min-h-0 flex-1 gap-[2px] ${turnDir === "next" ? "animate-page-turn-next" : "animate-page-turn-prev"}`}
            >
              {visibleSpecs.map((blockIdxs, i) => {
                const absoluteIndex = pageIndex + i;
                const isFirstOfSpread = i === 0;
                return (
                  <div
                    key={absoluteIndex}
                    style={PAPER_VARS}
                    className={[
                      "relative flex-1 min-w-0 overflow-hidden px-6 py-8 md:px-10 md:py-10 prose-z1",
                      "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.65)]",
                      isFirstOfSpread ? "rounded-l-md rounded-r-[2px]" : "rounded-r-md rounded-l-[2px]",
                    ].join(" ")}
                  >
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/10 to-transparent" />
                    {absoluteIndex === 0 && opener}
                    {/* Blocks are wrapped exactly like the measurer's, so the
                        rendered height always matches the measured height —
                        joined rendering collapsed margins differently and
                        clipped the tail of the page. */}
                    {blockIdxs.map((bi) => (
                      <div key={bi} className={bi === 0 ? "drop-cap" : undefined} style={{ display: "flow-root" }}>
                        <ReactMarkdown>{blocks[bi]}</ReactMarkdown>
                      </div>
                    ))}
                    <div className="absolute inset-x-0 bottom-3 text-center text-[11px] text-muted-foreground/70 tabular-nums">{absoluteIndex + 1}</div>
                  </div>
                );
              })}
              {/* Binding shadow between two facing pages */}
              {visibleSpecs.length === 2 && (
                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-gradient-to-r from-black/25 via-black/10 to-black/25" />
              )}
            </div>
          )}

          {/* Page-turn controls */}
          <div className="flex w-full max-w-sm items-center justify-between px-2">
            <button
              onClick={prevPage}
              disabled={pageIndex === 0}
              className="size-10 grid place-items-center rounded-full glass press disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {totalPages === 0 ? "…" : `${pageIndex + 1}${visibleSpecs.length === 2 ? `–${pageIndex + 2}` : ""} of ${totalPages}`}
            </span>
            <button
              onClick={nextPage}
              disabled={isLastPage || totalPages === 0}
              className="size-10 grid place-items-center rounded-full glass press disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {isLastPage && (
            <div className="w-full max-w-sm pb-[max(env(safe-area-inset-bottom),0.5rem)]">
              {/* End-of-chapter ornament */}
              <div className="mb-4 flex items-center justify-center gap-2 text-mint/50">
                <span className="h-px w-6 bg-current" />
                <span className="size-1 rounded-full bg-current" />
                <span className="h-px w-6 bg-current" />
              </div>
              {chapter.is_background ? (
                <Button
                  onClick={() => completeChapter(() => neighbors.next ? nav(`/read/${neighbors.next.id}`) : nav("/library"))}
                  className="w-full h-14 rounded-2xl mint-fill font-medium shadow-glow press"
                >
                  <CheckCircle2 className="size-4 mr-2" /> Mark complete & continue
                </Button>
              ) : (
                <Button
                  onClick={() => completeChapter(() => nav(`/quiz/${chapter.id}`))}
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
          )}
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
