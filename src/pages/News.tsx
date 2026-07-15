import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Newspaper } from "lucide-react";

/**
 * Macro page: two TradingView widgets (free, no API key, auto-updating) —
 * the Events economic calendar and the Timeline market-news feed, with
 * user-togglable impact/country filters persisted in localStorage.
 */

const IMPACTS = [
  { key: "-1", label: "Low" },
  { key: "0", label: "Medium" },
  { key: "1", label: "High" },
];
const COUNTRIES = [
  { key: "us", label: "US" },
  { key: "eu", label: "EU" },
  { key: "gb", label: "UK" },
  { key: "jp", label: "JP" },
  { key: "cn", label: "CN" },
  { key: "ch", label: "CH" },
  { key: "au", label: "AU" },
  { key: "ca", label: "CA" },
  { key: "nz", label: "NZ" },
];
const LS_KEY = "z1.newsFilters";

function loadFilters(): { impacts: string[]; countries: string[] } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p.impacts) && Array.isArray(p.countries)) return p;
    }
  } catch { /* corrupted storage — fall through to defaults */ }
  return { impacts: ["-1", "0", "1"], countries: COUNTRIES.map((c) => c.key) };
}

export default function News() {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"calendar" | "news">("calendar");
  const [filters, setFilters] = useState(loadFilters);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(filters));
  }, [filters]);

  const toggle = (kind: "impacts" | "countries", key: string) => {
    setFilters((f) => {
      const cur = new Set(f[kind]);
      if (cur.has(key)) {
        if (cur.size === 1) return f; // never allow filtering everything out
        cur.delete(key);
      } else {
        cur.add(key);
      }
      return { ...f, [kind]: Array.from(cur) };
    });
  };

  // Stable strings so the widget only rebuilds when the selection changes.
  const importanceFilter = useMemo(
    () => IMPACTS.map((i) => i.key).filter((k) => filters.impacts.includes(k)).join(","),
    [filters.impacts],
  );
  const countryFilter = useMemo(
    () => COUNTRIES.map((c) => c.key).filter((k) => filters.countries.includes(k)).join(","),
    [filters.countries],
  );

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.async = true;
    script.type = "text/javascript";
    if (tab === "calendar") {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
      script.innerHTML = JSON.stringify({
        colorTheme: "dark",
        isTransparent: true,
        locale: "en",
        countryFilter,
        importanceFilter,
        width: "100%",
        height: "100%",
      });
    } else {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
      script.innerHTML = JSON.stringify({
        colorTheme: "dark",
        isTransparent: true,
        displayMode: "regular",
        feedMode: "all_symbols", // full market news feed
        locale: "en",
        width: "100%",
        height: "100%",
      });
    }
    ref.current.appendChild(script);
  }, [tab, importanceFilter, countryFilter]);

  const chip = (active: boolean) =>
    `rounded-full px-2.5 py-1 text-[11px] press ${active ? "mint-fill font-medium" : "border border-border text-muted-foreground"}`;

  return (
    <MobileShell
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 safe-top">
          <div className="text-[10px] uppercase tracking-[0.32em] text-mint-bright mb-1">
            Macro
          </div>
          <h1 className="display text-3xl font-medium flex items-center gap-2">
            <CalendarDays className="size-6 text-mint-bright" />
            Markets Desk
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every economic event, and the full news wire.
          </p>
        </header>
      }
    >
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setTab("calendar")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium press ${tab === "calendar" ? "mint-fill" : "border border-border text-muted-foreground"}`}
        >
          <CalendarDays className="size-3.5" /> Calendar
        </button>
        <button
          onClick={() => setTab("news")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium press ${tab === "news" ? "mint-fill" : "border border-border text-muted-foreground"}`}
        >
          <Newspaper className="size-3.5" /> Headlines
        </button>
      </div>

      {tab === "calendar" && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Impact</span>
            {IMPACTS.map((i) => (
              <button key={i.key} onClick={() => toggle("impacts", i.key)} className={chip(filters.impacts.includes(i.key))}>
                {i.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Regions</span>
            {COUNTRIES.map((c) => (
              <button key={c.key} onClick={() => toggle("countries", c.key)} className={chip(filters.countries.includes(c.key))}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="mt-3 glass rounded-2xl overflow-hidden border border-border/40"
        style={{ height: tab === "calendar" ? "calc(100dvh - 22rem)" : "calc(100dvh - 17rem)" }}
      >
        <div ref={ref} className="tradingview-widget-container w-full h-full" />
      </div>
      <p className="text-[10px] text-muted-foreground/70 text-center mt-2">
        Data by TradingView
      </p>
    </MobileShell>
  );
}
