interface Props {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
  sub?: string;
  theme?: "gold" | "mint";
}

const RING_STOPS = {
  gold: ["hsl(46 80% 68%)", "hsl(36 55% 38%)"],
  mint: ["hsl(152 75% 60%)", "hsl(152 55% 34%)"],
};

export function ProgressRing({ value, size = 140, stroke = 8, label, sub, theme = "gold" }: Props) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circ - (clamped / 100) * circ;
  const gradientId = `ring-${theme}`;
  const [from, to] = RING_STOPS[theme];

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(40 15% 22% / 0.4)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          fill="none"
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={`display text-3xl font-medium leading-none ${theme === "mint" ? "mint-text" : "gold-text"}`}>
            {Math.round(clamped)}<span className="text-base">%</span>
          </div>
          {label && <div className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>}
          {sub && <div className="text-[11px] text-foreground/60 mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}