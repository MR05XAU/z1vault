import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  Home, BookOpen, Sparkles, LineChart, GraduationCap, Layers, Calculator, BarChart3,
  CalendarDays, ShoppingBag, BookMarked, Settings, CandlestickChart,
} from "lucide-react";

type Chapter = { id: string; chapter_number: number; title: string };

// App-wide command palette. Opens on ⌘K / Ctrl+K (and a custom event so any
// button can trigger it). Jumps to pages and deep-links to chapters.
const PAGES = [
  { label: "Home", to: "/vault", icon: Home },
  { label: "Book / Library", to: "/library", icon: BookOpen },
  { label: "AI Tutor", to: "/tutor", icon: Sparkles },
  { label: "Flashcards", to: "/flashcards", icon: Layers },
  { label: "Starting Trading course", to: "/starting-trading", icon: GraduationCap },
  { label: "Candlestick patterns", to: "/patterns", icon: CandlestickChart },
  { label: "Edgebook (journal)", to: "/journal", icon: LineChart },
  { label: "Calculators", to: "/calculators", icon: Calculator },
  { label: "Stats", to: "/analytics", icon: BarChart3 },
  { label: "Markets Desk", to: "/news", icon: CalendarDays },
  { label: "Notebook", to: "/notebook", icon: BookMarked },
  { label: "Shop", to: "/shop", icon: ShoppingBag },
  { label: "Account", to: "/account", icon: Settings },
];

export function CommandPalette() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("z1:command", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("z1:command", onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!open || chapters.length) return;
    supabase.from("book_chapters").select("id,chapter_number,title").order("order_index")
      .then(({ data }) => setChapters((data as Chapter[]) ?? []));
  }, [open, chapters.length]);

  const go = (to: string) => { setOpen(false); nav(to); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages and chapters…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Go to">
          {PAGES.map((p) => (
            <CommandItem key={p.to} value={p.label} onSelect={() => go(p.to)}>
              <p.icon className="mr-2 size-4 text-mint-bright" /> {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {chapters.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Chapters">
              {chapters.map((c) => (
                <CommandItem key={c.id} value={`chapter ${c.chapter_number} ${c.title}`} onSelect={() => go(`/read/${c.id}`)}>
                  <BookOpen className="mr-2 size-4 text-muted-foreground" />
                  <span className="tabular-nums text-muted-foreground mr-2">{c.chapter_number}.</span>
                  {c.title.replace(/^chapter\s+\d+\s*[:.\-–]\s*/i, "")}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
