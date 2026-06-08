import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Bookmark, Highlighter, NotebookPen, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Notebook() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "highlights";
  const [q, setQ] = useState("");
  const [highlights, setHighlights] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [chapters, setChapters] = useState<Record<string, any>>({});

  const refresh = async () => {
    const [h, b, c] = await Promise.all([
      supabase.from("highlights").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("bookmarks").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("book_chapters").select("id,chapter_number,title"),
    ]);
    setHighlights(h.data ?? []);
    setBookmarks(b.data ?? []);
    const map: Record<string, any> = {};
    (c.data ?? []).forEach((x: any) => (map[x.id] = x));
    setChapters(map);
  };

  useEffect(() => { refresh(); }, [user]);

  const notes = highlights.filter((h) => h.note);
  const filter = (arr: any[]) =>
    arr.filter((x) => {
      if (!q) return true;
      const t = (x.highlighted_text || "") + " " + (x.note || "") + " " + (chapters[x.chapter_id]?.title || "");
      return t.toLowerCase().includes(q.toLowerCase());
    });

  const del = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); refresh(); }
  };

  return (
    <MobileShell
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 safe-top">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold-bright">Notebook</div>
          <h1 className="display text-3xl font-medium mt-1">Your vault notes.</h1>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search notes, highlights, bookmarks…"
              className="pl-10 h-11 rounded-xl bg-surface-elevated/60 border-border-strong"
            />
          </div>
        </header>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setSp({ tab: v })} className="mt-5">
        <TabsList className="w-full bg-surface-elevated/60 rounded-xl p-1 h-11">
          <TabsTrigger value="highlights" className="flex-1 rounded-lg data-[state=active]:bg-gold data-[state=active]:text-gold-foreground text-xs gap-1.5">
            <Highlighter className="size-3.5" /> Highlights
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 rounded-lg data-[state=active]:bg-gold data-[state=active]:text-gold-foreground text-xs gap-1.5">
            <NotebookPen className="size-3.5" /> Notes
          </TabsTrigger>
          <TabsTrigger value="bookmarks" className="flex-1 rounded-lg data-[state=active]:bg-gold data-[state=active]:text-gold-foreground text-xs gap-1.5">
            <Bookmark className="size-3.5" /> Marks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="highlights" className="mt-4 space-y-3">
          {filter(highlights).length === 0 && <Empty label="No highlights yet. Long-press text in a chapter to highlight." />}
          {filter(highlights).map((h) => (
            <Card key={h.id} chapter={chapters[h.chapter_id]} onOpen={() => nav(`/read/${h.chapter_id}`)} onDelete={() => del("highlights", h.id)}>
              <p className="text-sm text-foreground/90 italic leading-relaxed">"{h.highlighted_text}"</p>
              {h.note && <p className="text-xs text-muted-foreground mt-2">— {h.note}</p>}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-3">
          {filter(notes).length === 0 && <Empty label="No notes yet. Highlight a passage and add a note." />}
          {filter(notes).map((h) => (
            <Card key={h.id} chapter={chapters[h.chapter_id]} onOpen={() => nav(`/read/${h.chapter_id}`)} onDelete={() => del("highlights", h.id)}>
              <p className="text-sm text-foreground/90 leading-relaxed">{h.note}</p>
              <p className="text-xs text-muted-foreground italic mt-2 line-clamp-2">"{h.highlighted_text}"</p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="bookmarks" className="mt-4 space-y-3">
          {filter(bookmarks).length === 0 && <Empty label="No bookmarks yet. Tap the bookmark icon while reading." />}
          {filter(bookmarks).map((b) => (
            <Card key={b.id} chapter={chapters[b.chapter_id]} onOpen={() => nav(`/read/${b.chapter_id}`)} onDelete={() => del("bookmarks", b.id)}>
              <p className="text-sm text-foreground/90">Bookmark at {b.page_reference || "—"}</p>
              {b.note && <p className="text-xs text-muted-foreground mt-1">{b.note}</p>}
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </MobileShell>
  );
}

function Card({ chapter, children, onOpen, onDelete }: any) {
  return (
    <div className="glass rounded-2xl p-4 animate-fade-up">
      <div className="flex items-start justify-between gap-2 mb-2">
        <button onClick={onOpen} className="text-[10px] uppercase tracking-[0.28em] text-gold-bright text-left press">
          Ch {chapter?.chapter_number} · {chapter?.title}
        </button>
        <button onClick={onDelete} className="text-muted-foreground hover:text-danger press">
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="text-center py-16 text-sm text-muted-foreground glass rounded-2xl px-6">
      {label}
    </div>
  );
}