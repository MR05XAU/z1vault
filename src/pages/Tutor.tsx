import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Z1Logo } from "@/components/Z1Logo";
import { BookOpen, Search, Loader2, Download } from "lucide-react";
import { isLoaded, loadDictionary, lookup, search } from "@/lib/dictionary";
import { TUTOR_FAQ, matchFaq, type FaqEntry } from "@/data/tutorFaq";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
  summary: string | null;
}

interface BookHit {
  chapter: Chapter;
  excerpt: string;
}

export default function Tutor() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [dictReady, setDictReady] = useState(isLoaded());
  const [dictProgress, setDictProgress] = useState(0);
  const [dictError, setDictError] = useState("");
  const [definition, setDefinition] = useState<string | null>(null);
  const [matches, setMatches] = useState<string[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [bookHits, setBookHits] = useState<BookHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [faqHit, setFaqHit] = useState<FaqEntry | null>(null);

  // Load chapters once for offline book search
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("book_chapters")
        .select("id,chapter_number,title,content,summary")
        .order("order_index");
      setChapters((data ?? []) as Chapter[]);
    })();
  }, []);

  // Kick off dictionary download on mount
  useEffect(() => {
    if (isLoaded()) { setDictReady(true); return; }
    loadDictionary((loaded, total) => {
      setDictProgress(Math.round((loaded / total) * 100));
    })
      .then(() => setDictReady(true))
      .catch((e) => setDictError(e.message || "Download failed"));
  }, []);

  // Run lookup whenever query / dict / chapters change
  useEffect(() => {
    const q = query.trim();
    if (!q || !dictReady) {
      setDefinition(null); setMatches([]); setBookHits([]); setFaqHit(null); return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const [def, near] = await Promise.all([lookup(q), search(q, 12)]);
      setDefinition(def);
      setMatches(near.filter((w) => w !== q.toLowerCase()).slice(0, 8));
      setFaqHit(matchFaq(q));

      // Book-content search (case-insensitive, first 5 chapters that match)
      const needle = q.toLowerCase();
      const hits: BookHit[] = [];
      for (const c of chapters) {
        const hay = c.content.toLowerCase();
        const idx = hay.indexOf(needle);
        if (idx === -1) continue;
        const start = Math.max(0, idx - 60);
        const end = Math.min(c.content.length, idx + needle.length + 100);
        let excerpt = c.content.slice(start, end).replace(/\s+/g, " ");
        if (start > 0) excerpt = "… " + excerpt;
        if (end < c.content.length) excerpt += " …";
        hits.push({ chapter: c, excerpt });
        if (hits.length >= 5) break;
      }
      setBookHits(hits);
      setSearching(false);
    }, 180);
    return () => clearTimeout(t);
  }, [query, dictReady, chapters]);

  const highlighted = useMemo(() => query.trim().toLowerCase(), [query]);

  return (
    <MobileShell
      noPadding
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 pb-3 safe-top flex items-center gap-3 border-b border-border/40">
          <Z1Logo size={40} />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold-bright">Offline Lookup</div>
            <div className="text-sm font-medium">Dictionary + book search</div>
          </div>
          <div className={`size-2 rounded-full ${dictReady ? "bg-success" : "bg-gold animate-pulse"}`} />
        </header>
      }
    >
      <div className="px-5 pt-5 pb-44">
        <div className="glass-strong rounded-2xl flex items-center gap-2 p-2 shadow-lift">
          <Search className="size-4 ml-2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dictReady ? "Look up a word or phrase…" : "Loading dictionary…"}
            disabled={!dictReady}
            className="flex-1 bg-transparent outline-none text-sm px-1 py-2 placeholder:text-muted-foreground disabled:opacity-60"
          />
          {searching && <Loader2 className="size-4 animate-spin mr-2 text-muted-foreground" />}
        </div>

        {!dictReady && !dictError && (
          <div className="mt-6 glass rounded-2xl p-5 text-center animate-fade-up">
            <Download className="size-6 mx-auto text-gold-bright" />
            <div className="text-sm mt-2 font-medium">Downloading offline dictionary</div>
            <div className="text-xs text-muted-foreground mt-1">~9 MB · one-time, cached on device</div>
            <div className="h-1.5 rounded-full bg-secondary mt-4 overflow-hidden">
              <div className="h-full gold-fill transition-all" style={{ width: `${dictProgress}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">{dictProgress}%</div>
          </div>
        )}

        {dictError && (
          <div className="mt-6 glass rounded-2xl p-4 text-center text-sm text-destructive">
            {dictError}
          </div>
        )}

        {dictReady && !query.trim() && (
          <div className="pt-6 animate-fade-up">
            <div className="text-center">
              <div className="size-14 rounded-2xl gold-fill grid place-items-center mx-auto mb-3 shadow-glow">
                <BookOpen className="size-6" />
              </div>
              <h2 className="display text-xl font-medium">Ask anything from the book.</h2>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">
                Curated answers below, plus an offline dictionary and full-text book search.
              </p>
            </div>
            <div className="mt-6 text-[10px] uppercase tracking-[0.28em] text-gold-bright mb-2">
              Common questions
            </div>
            <div className="space-y-2">
              {TUTOR_FAQ.map((f) => (
                <button
                  key={f.q}
                  onClick={() => setQuery(f.q)}
                  className="w-full text-left glass rounded-2xl px-4 py-3 press hover:shadow-glow"
                >
                  <div className="text-sm font-medium">{f.q}</div>
                  {f.ref && (
                    <div className="text-[10px] text-gold-bright/80 mt-0.5">{f.ref}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {dictReady && query.trim() && (
          <div className="mt-6 space-y-5">
            {faqHit && (
              <section className="glass-strong rounded-2xl p-4 gold-border animate-fade-up">
                <div className="text-[10px] uppercase tracking-[0.28em] text-gold-bright">
                  Answer {faqHit.ref ? `· ${faqHit.ref}` : ""}
                </div>
                <div className="text-base font-medium mt-1">{faqHit.q}</div>
                <p className="text-sm text-foreground/90 mt-2 leading-relaxed whitespace-pre-line">
                  {faqHit.a}
                </p>
              </section>
            )}

            {definition && (
              <section className="glass rounded-2xl p-4 animate-fade-up">
                <div className="text-[10px] uppercase tracking-[0.28em] text-gold-bright">Definition</div>
                <div className="text-base font-medium capitalize mt-1">{query.trim()}</div>
                <p className="text-sm text-foreground/90 mt-2 leading-relaxed">{definition}</p>
              </section>
            )}

            {!definition && matches.length === 0 && bookHits.length === 0 && !searching && (
              <div className="text-sm text-muted-foreground text-center py-6">No matches.</div>
            )}

            {matches.length > 0 && (
              <section className="animate-fade-up">
                <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
                  {definition ? "Related words" : "Did you mean"}
                </div>
                <div className="flex flex-wrap gap-2">
                  {matches.map((m) => (
                    <button
                      key={m}
                      onClick={() => setQuery(m)}
                      className="px-3 py-1.5 rounded-full glass text-xs press capitalize"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {bookHits.length > 0 && (
              <section className="animate-fade-up">
                <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">In the book</div>
                <div className="space-y-2">
                  {bookHits.map((h) => (
                    <button
                      key={h.chapter.id}
                      onClick={() => nav(`/read/${h.chapter.id}`)}
                      className="w-full text-left glass rounded-2xl px-4 py-3 press hover:shadow-glow"
                    >
                      <div className="text-[10px] uppercase tracking-[0.28em] text-gold-bright">
                        Ch {h.chapter.chapter_number}
                      </div>
                      <div className="text-sm font-medium mt-0.5">{h.chapter.title}</div>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {h.excerpt.split(new RegExp(`(${escapeReg(highlighted)})`, "ig")).map((part, i) =>
                          part.toLowerCase() === highlighted ? (
                            <mark key={i} className="bg-gold/30 text-foreground rounded px-0.5">{part}</mark>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}