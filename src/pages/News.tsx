import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";

/**
 * Economic news calendar — embedded Investing.com widget.
 * Free, no API key, auto-updates with high/medium/low impact events.
 * Styled to blend with the dark vault aesthetic.
 */
export default function News() {
  const [loaded, setLoaded] = useState(false);

  // Investing.com economic calendar widget params:
  // timeZone=8 (London/UTC+0), columns: exc_flags, exc_currency, exc_importance, exc_actual, exc_forecast, exc_previous
  // importance=2,3 (medium + high impact only). Theme dark.
  const src =
    "https://sslecal2.investing.com/?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous" +
    "&importance=2,3&features=datepicker,timezone,timeselector,filters&countries=25,32,6,37,72,22,17,39,14,10,35,43,56,36,110,11,26,12,4,5" +
    "&calType=week&timeZone=8&lang=1";

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
            High & medium impact events. Times in your local zone.
          </p>
        </header>
      }
    >
      <div className="mt-5 glass rounded-2xl overflow-hidden relative" style={{ height: "calc(100dvh - 16rem)" }}>
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center bg-surface">
            <Loader2 className="size-6 text-gold animate-spin" />
          </div>
        )}
        <iframe
          title="Economic Calendar"
          src={src}
          onLoad={() => setLoaded(true)}
          className="w-full h-full bg-white"
          style={{ colorScheme: "light" }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/70 text-center mt-2">
        Calendar data by Investing.com
      </p>
    </MobileShell>
  );
}