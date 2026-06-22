import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { useEffect, useRef } from "react";
import { CalendarDays } from "lucide-react";

/**
 * Economic news calendar — TradingView Events widget (dark, native look).
 * Free, no API key, auto-updates. Matches the vault aesthetic.
 */
export default function News() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      isTransparent: true,
      locale: "en",
      countryFilter: "us,gb,eu,jp,ch,au,ca,nz,cn",
      importanceFilter: "0,1",
      width: "100%",
      height: "100%",
    });
    ref.current.appendChild(script);
  }, []);

  return (
    <MobileShell
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 safe-top">
          <div className="text-[10px] uppercase tracking-[0.32em] text-gold-bright mb-1">
            Macro
          </div>
          <h1 className="display text-3xl font-medium flex items-center gap-2">
            <CalendarDays className="size-6 text-gold-bright" />
            Economic Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Medium & high impact events across major economies.
          </p>
        </header>
      }
    >
      <div
        className="mt-5 glass rounded-2xl overflow-hidden border border-border/40"
        style={{ height: "calc(100dvh - 14rem)" }}
      >
        <div ref={ref} className="tradingview-widget-container w-full h-full" />
      </div>
      <p className="text-[10px] text-muted-foreground/70 text-center mt-2">
        Calendar by TradingView
      </p>
    </MobileShell>
  );
}