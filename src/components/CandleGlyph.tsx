import { memo } from "react";

export type Candle = {
  /** body color: green = bullish, red = bearish, doji = thin line */
  c: "g" | "r" | "d";
  /** body top (0..100, top of svg) */
  bt: number;
  /** body bottom (0..100) */
  bb: number;
  /** wick top */
  wt?: number;
  /** wick bottom */
  wb?: number;
};

/**
 * Lightweight SVG candlestick glyph. Renders an array of candles inside a
 * 0..100 viewBox so it scales to any size with crisp lines and zero asset cost.
 */
function CandleGlyphInner({
  candles,
  className = "",
  height = 64,
}: {
  candles: Candle[];
  className?: string;
  height?: number;
}) {
  const n = candles.length;
  const slot = 100 / n;
  const bodyW = Math.min(slot * 0.55, 18);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={className}
      style={{ height, width: Math.max(n * 18, 56) }}
      aria-hidden
    >
      {candles.map((k, i) => {
        const cx = slot * (i + 0.5);
        const wt = k.wt ?? k.bt;
        const wb = k.wb ?? k.bb;
        const fill = k.c === "g" ? "#34d399" : k.c === "r" ? "#f87171" : "#fbbf24";
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={wt} y2={wb} stroke={fill} strokeWidth={1.2} />
            {k.c === "d" ? (
              <line
                x1={cx - bodyW / 2}
                x2={cx + bodyW / 2}
                y1={k.bt}
                y2={k.bt}
                stroke={fill}
                strokeWidth={2}
              />
            ) : (
              <rect
                x={cx - bodyW / 2}
                y={k.bt}
                width={bodyW}
                height={Math.max(k.bb - k.bt, 1.2)}
                fill={fill}
                rx={0.6}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const CandleGlyph = memo(CandleGlyphInner);