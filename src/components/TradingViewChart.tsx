import { useEffect, useRef } from "react";
import { toTradingViewSymbol } from "@/lib/futuresSymbols";

type Props = {
  symbol: string;
  interval?: "1" | "5" | "15" | "60" | "240" | "D" | "W";
  height?: number | string;
};

/**
 * TradingView Advanced Chart widget embed — free, no API key, their public
 * embed script. Distinct from TradeSnapshotChart: this is a live/interactive
 * chart, not a fixed historical window around one trade. Chrome is trimmed
 * (no side toolbar, no top symbol/interval bar, no symbol search) since we
 * render our own interval picker above it and need this to fit in a mobile
 * sheet, not a full desktop workspace.
 */
export function TradingViewChart({ symbol, interval = "D", height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: toTradingViewSymbol(symbol),
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: false,
      withdateranges: false,
      hide_top_toolbar: true,
      hide_side_toolbar: true,
      hide_legend: true,
      hide_volume: true,
      details: false,
      save_image: false,
      backgroundColor: "rgba(18, 20, 26, 1)",
      gridColor: "rgba(255, 255, 255, 0.06)",
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, interval]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full max-w-full overflow-hidden rounded-xl glass"
      style={{ height, width: "100%" }}
    />
  );
}
