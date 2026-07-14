import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createChart, CandlestickSeries, createSeriesMarkers, type IChartApi, type ISeriesApi, type SeriesMarker, type UTCTimestamp } from "lightweight-charts";

type Props = {
  symbol: string;
  direction: "long" | "short";
  openedAt: string;
  closedAt?: string | null;
  entryPrice: number;
  exitPrice?: number | null;
  height?: number | string;
};

function cssVar(name: string): string {
  if (typeof window === "undefined") return "#000";
  return `hsl(${getComputedStyle(document.documentElement).getPropertyValue(name).trim()})`;
}

/**
 * Candlestick snapshot of the price action around a logged trade, rendered
 * with TradingView's own Lightweight Charts library (real candlesticks, not
 * an approximation) plus arrow markers + price lines at entry/exit. Data
 * comes from the trade-candles edge function (Yahoo Finance, no API key) —
 * best-effort, so a missing symbol just shows a fallback message rather
 * than blocking the trade detail view.
 */
export function TradeSnapshotChart({ symbol, direction, openedAt, closedAt, entryPrice, exitPrice, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const from = openedAt;
  const to = closedAt ?? openedAt;

  const { data, isLoading } = useQuery({
    queryKey: ["trade-candles", symbol, from, to],
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const { data: res, error } = await supabase.functions.invoke("trade-candles", {
        body: { symbol, from, to, interval: "5m" },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      return res as { candles: { t: number; o: number; h: number; l: number; c: number }[]; error: string | null };
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const rows = useMemo(() => {
    const candles = data?.candles ?? [];
    const byTime = new Map<number, { o: number; h: number; l: number; c: number }>();
    for (const c of candles) byTime.set(Math.floor(c.t / 1000), c);
    return Array.from(byTime.entries())
      .sort(([a], [b]) => a - b)
      .map(([t, c]) => ({ time: t as UTCTimestamp, open: c.o, high: c.h, low: c.l, close: c.c }));
  }, [data]);

  const entrySec = Math.floor(new Date(openedAt).getTime() / 1000) as UTCTimestamp;
  const exitSec = closedAt ? (Math.floor(new Date(closedAt).getTime() / 1000) as UTCTimestamp) : null;
  const win = direction === "long" ? (exitPrice ?? 0) >= entryPrice : (exitPrice ?? 0) <= entryPrice;

  useEffect(() => {
    if (!containerRef.current || rows.length === 0) return;
    const container = containerRef.current;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: cssVar("--muted-foreground"),
        fontSize: 10,
      },
      grid: {
        vertLines: { color: cssVar("--border"), style: 1, visible: true },
        horzLines: { color: cssVar("--border"), style: 1, visible: true },
      },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: cssVar("--border") },
      rightPriceScale: { borderColor: cssVar("--border") },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: cssVar("--success"),
      downColor: cssVar("--danger"),
      borderVisible: false,
      wickUpColor: cssVar("--success"),
      wickDownColor: cssVar("--danger"),
    });
    seriesRef.current = series;
    series.setData(rows);

    const mint = cssVar("--mint");
    const exitColor = win ? cssVar("--success") : cssVar("--danger");

    createSeriesMarkers(
      series,
      [
        {
          time: entrySec,
          position: (direction === "long" ? "belowBar" : "aboveBar") as "belowBar" | "aboveBar",
          color: mint,
          shape: (direction === "long" ? "arrowUp" : "arrowDown") as "arrowUp" | "arrowDown",
          text: "Entry",
        },
        ...(exitSec != null
          ? [
              {
                time: exitSec,
                position: (direction === "short" ? "belowBar" : "aboveBar") as "belowBar" | "aboveBar",
                color: exitColor,
                shape: (direction === "short" ? "arrowUp" : "arrowDown") as "arrowUp" | "arrowDown",
                text: "Exit",
              },
            ]
          : []),
      ] as SeriesMarker<Time>[]
    );

    series.createPriceLine({ price: entryPrice, color: mint, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "Entry" });
    if (exitPrice != null) {
      series.createPriceLine({ price: exitPrice, color: exitColor, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "Exit" });
    }

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [rows, entrySec, exitSec, entryPrice, exitPrice, direction, win]);

  if (isLoading) {
    return <div className="grid place-items-center rounded-xl glass" style={{ height }}><Loader2 className="size-4 animate-spin text-mint" /></div>;
  }
  if (!data || data.error || rows.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl glass p-4 text-center" style={{ height }}>
        <p className="text-xs text-muted-foreground">Couldn't load a chart for {symbol}.{data?.error ? ` (${data.error})` : ""}</p>
      </div>
    );
  }

  return <div ref={containerRef} style={{ height, width: "100%" }} className="rounded-xl glass overflow-hidden" />;
}
