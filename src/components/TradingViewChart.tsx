import { useEffect, useRef } from "react";

type Props = {
  symbol: string;
  interval?: "1" | "5" | "15" | "60" | "240" | "D" | "W";
  height?: number;
};

/**
 * TradingView Advanced Chart widget embed — free, no API key, their public
 * embed script. Distinct from TradeSnapshotChart: this is a live/interactive
 * chart, not a fixed historical window around one trade.
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
      symbol: symbol.toUpperCase(),
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      withdateranges: true,
      hide_side_toolbar: false,
      details: true,
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
      className="tradingview-widget-container overflow-hidden rounded-xl glass"
      style={{ height, width: "100%" }}
    />
  );
}
