import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, Bar, Cell, CartesianGrid, Customized } from "recharts";

type Props = {
  symbol: string;
  direction: "long" | "short";
  openedAt: string;
  closedAt?: string | null;
  entryPrice: number;
  exitPrice?: number | null;
  height?: number | string;
};

function Arrow({ cx, cy, up, color }: { cx: number; cy: number; up: boolean; color: string }) {
  // Entry/exit arrow: up-pointing for buy-side (long entry / short exit),
  // down-pointing for sell-side, offset above/below the price so it doesn't
  // sit on top of the candle it's marking.
  const size = 7;
  const y = cy + (up ? size + 4 : -(size + 4));
  const points = up
    ? `${cx},${y - size} ${cx - size},${y + size} ${cx + size},${y + size}`
    : `${cx},${y + size} ${cx - size},${y - size} ${cx + size},${y - size}`;
  return <polygon points={points} fill={color} stroke="hsl(var(--surface))" strokeWidth={1.5} />;
}

// ReferenceDot has no real "custom shape" API — Customized is recharts'
// documented escape hatch for overlays like this, giving us the live
// axis scale functions to convert data values (time, price) to pixels.
function EntryExitArrows(props: any) {
  const { xAxisMap, yAxisMap, entryMs, exitMs, entryPrice, exitPrice, direction, win } = props;
  const xAxis = Object.values(xAxisMap)[0] as any;
  const yAxis = Object.values(yAxisMap)[0] as any;
  if (!xAxis || !yAxis) return null;
  const ex = xAxis.scale(entryMs);
  const ey = yAxis.scale(entryPrice);
  return (
    <g>
      <Arrow cx={ex} cy={ey} up={direction === "long"} color="hsl(var(--mint))" />
      {exitMs != null && exitPrice != null && (
        <Arrow
          cx={xAxis.scale(exitMs)}
          cy={yAxis.scale(exitPrice)}
          up={direction === "short"}
          color={win ? "hsl(var(--success))" : "hsl(var(--danger))"}
        />
      )}
    </g>
  );
}

/**
 * Candlestick-style snapshot of the price action around a logged trade, with
 * entry/exit markers. Data comes from the trade-candles edge function
 * (Yahoo Finance, no API key) — best-effort, so a missing symbol just shows
 * a fallback message rather than blocking the trade detail view.
 */
function PriceLabel({ viewBox, text, color }: any) {
  if (!viewBox) return null;
  const { x, y } = viewBox;
  const width = text.length * 5.5 + 10;
  return (
    <g>
      <rect x={x + 2} y={y - 9} width={width} height={16} rx={4} fill="hsl(var(--surface-elevated))" stroke={color} strokeOpacity={0.6} strokeWidth={1} />
      <text x={x + 7} y={y + 3} fontSize={10} fontWeight={600} fill={color}>{text}</text>
    </g>
  );
}

export function TradeSnapshotChart({ symbol, direction, openedAt, closedAt, entryPrice, exitPrice, height = 320 }: Props) {
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
    return candles.map((c) => ({
      t: c.t,
      lowHigh: [c.l, c.h] as [number, number],
      body: [Math.min(c.o, c.c), Math.max(c.o, c.c)] as [number, number],
      up: c.c >= c.o,
    }));
  }, [data]);

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

  const entryMs = new Date(openedAt).getTime();
  const exitMs = closedAt ? new Date(closedAt).getTime() : null;
  const win = direction === "long" ? (exitPrice ?? 0) >= entryPrice : (exitPrice ?? 0) <= entryPrice;
  const prices = rows.flatMap((r) => r.lowHigh);
  const pMin = Math.min(...prices, entryPrice, exitPrice ?? entryPrice);
  const pMax = Math.max(...prices, entryPrice, exitPrice ?? entryPrice);
  const pad = (pMax - pMin) * 0.08 || 1;

  return (
    <div style={{ height, width: "100%" }} className="rounded-xl glass p-2">
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.4} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
            tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            minTickGap={50}
          />
          <YAxis
            domain={[pMin - pad, pMax + pad]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
            tickFormatter={(v) => v.toFixed(2)}
            width={48}
          />
          <Tooltip
            contentStyle={{ background: "hsl(var(--surface-elevated))", border: "1px solid hsl(var(--border-strong))", borderRadius: 8, fontSize: 11 }}
            labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
            formatter={(val: unknown, name) => {
              const arr = Array.isArray(val) ? val : [val];
              if (name === "lowHigh") return [`${(arr[0] as number).toFixed(2)} – ${(arr[1] as number).toFixed(2)}`, "Range"];
              if (name === "body") return [`${(arr[0] as number).toFixed(2)} – ${(arr[1] as number).toFixed(2)}`, "Body"];
              return [String(val), String(name)];
            }}
          />
          <Bar dataKey="lowHigh" barSize={2} isAnimationActive={false}>
            {rows.map((r, i) => <Cell key={`w${i}`} fill={r.up ? "hsl(var(--success))" : "hsl(var(--danger))"} />)}
          </Bar>
          <Bar dataKey="body" barSize={7} isAnimationActive={false}>
            {rows.map((r, i) => <Cell key={`b${i}`} fill={r.up ? "hsl(var(--success))" : "hsl(var(--danger))"} />)}
          </Bar>
          <ReferenceLine x={entryMs} stroke="hsl(var(--mint))" strokeOpacity={0.35} strokeDasharray="2 2" />
          {exitMs != null && (
            <ReferenceLine x={exitMs} stroke={win ? "hsl(var(--success))" : "hsl(var(--danger))"} strokeOpacity={0.35} strokeDasharray="2 2" />
          )}
          <ReferenceLine y={entryPrice} stroke="hsl(var(--mint))" strokeDasharray="4 3" label={<PriceLabel text={`Entry ${entryPrice}`} color="hsl(var(--mint-bright))" />} />
          {exitPrice != null && (
            <ReferenceLine y={exitPrice} stroke={win ? "hsl(var(--success))" : "hsl(var(--danger))"} strokeDasharray="4 3" label={<PriceLabel text={`Exit ${exitPrice}`} color={win ? "hsl(var(--success))" : "hsl(var(--danger))"} />} />
          )}
          <Customized
            component={(props: any) => (
              <EntryExitArrows {...props} entryMs={entryMs} exitMs={exitMs} entryPrice={entryPrice} exitPrice={exitPrice} direction={direction} win={win} />
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
