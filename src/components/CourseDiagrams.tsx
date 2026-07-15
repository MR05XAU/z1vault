// Hand-drawn SVG teaching diagrams for the Starting Trading course.
// Inline SVG (not images) so they're crisp at any size, theme-matched via
// CSS variables, and never depend on an external asset that can break.

const GREEN = "hsl(var(--success))";
const RED = "hsl(var(--danger))";
const MUTED = "hsl(var(--muted-foreground))";
const BORDER = "hsl(var(--border-strong))";
const MINT = "hsl(var(--mint-bright))";

function Candle({ x, o, c, h, l, w = 14 }: { x: number; o: number; c: number; h: number; l: number; w?: number }) {
  const up = c < o; // svg y grows downward: close above open visually means c < o
  const color = up ? GREEN : RED;
  const top = Math.min(o, c);
  const bh = Math.max(2, Math.abs(o - c));
  return (
    <g>
      <line x1={x} y1={h} x2={x} y2={l} stroke={color} strokeWidth={1.5} />
      <rect x={x - w / 2} y={top} width={w} height={bh} fill={color} rx={1} />
    </g>
  );
}

function Label({ x, y, children, anchor = "middle", fill = MUTED }: { x: number; y: number; children: string; anchor?: string; fill?: string }) {
  return <text x={x} y={y} fontSize={9} fill={fill} textAnchor={anchor} fontFamily="inherit">{children}</text>;
}

const frame = "w-full rounded-xl border border-border bg-black/20 my-4";

export function CandleAnatomy() {
  return (
    <svg viewBox="0 0 340 190" className={frame} role="img" aria-label="Candlestick anatomy">
      {/* Bull candle */}
      <Candle x={95} o={125} c={55} h={30} l={155} w={26} />
      <Label x={95} y={180}>Bullish (close above open)</Label>
      <line x1={112} y1={30} x2={150} y2={30} stroke={BORDER} strokeDasharray="3 2" />
      <Label x={154} y={33} anchor="start">High</Label>
      <line x1={112} y1={55} x2={150} y2={55} stroke={BORDER} strokeDasharray="3 2" />
      <Label x={154} y={58} anchor="start" fill={GREEN}>Close</Label>
      <line x1={112} y1={125} x2={150} y2={125} stroke={BORDER} strokeDasharray="3 2" />
      <Label x={154} y={128} anchor="start">Open</Label>
      <line x1={112} y1={155} x2={150} y2={155} stroke={BORDER} strokeDasharray="3 2" />
      <Label x={154} y={158} anchor="start">Low</Label>
      {/* Bear candle */}
      <Candle x={250} o={55} c={125} h={30} l={155} w={26} />
      <Label x={250} y={180}>Bearish (close below open)</Label>
      <line x1={267} y1={55} x2={300} y2={55} stroke={BORDER} strokeDasharray="3 2" />
      <Label x={304} y={58} anchor="start">Open</Label>
      <line x1={267} y1={125} x2={300} y2={125} stroke={BORDER} strokeDasharray="3 2" />
      <Label x={304} y={128} anchor="start" fill={RED}>Close</Label>
      {/* body/wick callouts */}
      <Label x={40} y={95} anchor="middle" fill={MINT}>Body</Label>
      <line x1={55} y1={92} x2={80} y2={92} stroke={MINT} strokeWidth={1} />
      <Label x={40} y={42} anchor="middle" fill={MINT}>Wick</Label>
      <line x1={55} y1={39} x2={92} y2={36} stroke={MINT} strokeWidth={1} />
    </svg>
  );
}

export function CandleTypes() {
  return (
    <svg viewBox="0 0 340 170" className={frame} role="img" aria-label="Common candle types">
      {/* Marubozu */}
      <Candle x={45} o={120} c={35} h={35} l={120} w={18} />
      <Label x={45} y={145}>Marubozu</Label>
      <Label x={45} y={157}>full control</Label>
      {/* Doji */}
      <Candle x={115} o={80} c={77} h={35} l={120} w={18} />
      <Label x={115} y={145}>Doji</Label>
      <Label x={115} y={157}>indecision</Label>
      {/* Hammer */}
      <Candle x={185} o={55} c={40} h={35} l={120} w={18} />
      <Label x={185} y={145}>Hammer</Label>
      <Label x={185} y={157}>low rejected</Label>
      {/* Shooting star */}
      <Candle x={255} o={100} c={115} h={35} l={120} w={18} />
      <Label x={255} y={145}>Shooting star</Label>
      <Label x={255} y={157}>high rejected</Label>
      {/* Spinning top */}
      <Candle x={318} o={70} c={85} h={35} l={120} w={14} />
      <Label x={318} y={145}>Spinning</Label>
      <Label x={318} y={157}>top</Label>
    </svg>
  );
}

export function EngulfingPatterns() {
  return (
    <svg viewBox="0 0 340 170" className={frame} role="img" aria-label="Engulfing patterns">
      {/* Bullish engulfing */}
      <Candle x={70} o={70} c={100} h={58} l={112} w={14} />
      <Candle x={95} o={108} c={48} h={38} l={118} w={20} />
      <Label x={82} y={140} fill={GREEN}>Bullish engulfing</Label>
      <Label x={82} y={153}>green body swallows red</Label>
      {/* Bearish engulfing */}
      <Candle x={235} o={100} c={70} h={58} l={112} w={14} />
      <Candle x={260} o={48} c={108} h={38} l={118} w={20} />
      <Label x={247} y={140} fill={RED}>Bearish engulfing</Label>
      <Label x={247} y={153}>red body swallows green</Label>
    </svg>
  );
}

export function PinBarAtSupport() {
  return (
    <svg viewBox="0 0 340 170" className={frame} role="img" aria-label="Pin bar rejection at support">
      <rect x={10} y={112} width={320} height={16} fill={GREEN} opacity={0.12} />
      <line x1={10} y1={120} x2={330} y2={120} stroke={GREEN} strokeDasharray="4 3" opacity={0.6} />
      <Label x={318} y={108} anchor="end" fill={GREEN}>Support zone</Label>
      <Candle x={80} o={40} c={65} h={32} l={72} />
      <Candle x={110} o={65} c={90} h={58} l={98} />
      <Candle x={140} o={90} c={108} h={82} l={116} />
      {/* the pin bar */}
      <Candle x={172} o={104} c={92} h={86} l={148} w={16} />
      <Label x={172} y={162} fill={MINT}>Pin bar — long wick into the zone, closed back above</Label>
      <Candle x={204} o={92} c={66} h={58} l={98} />
      <Candle x={234} o={66} c={44} h={36} l={74} />
    </svg>
  );
}

export function TrendStructure() {
  return (
    <svg viewBox="0 0 340 180" className={frame} role="img" aria-label="Trend structure">
      {/* Uptrend */}
      <polyline points="15,140 55,85 80,110 120,55 145,80 165,35" fill="none" stroke={GREEN} strokeWidth={2} />
      <Label x={55} y={77} fill={GREEN}>HH</Label>
      <Label x={80} y={124} fill={MUTED}>HL</Label>
      <Label x={120} y={47} fill={GREEN}>HH</Label>
      <Label x={145} y={94} fill={MUTED}>HL</Label>
      <Label x={90} y={165}>Uptrend — higher highs, higher lows</Label>
      {/* Downtrend */}
      <polyline points="195,35 235,90 258,65 296,120 316,100 330,150" fill="none" stroke={RED} strokeWidth={2} />
      <Label x={235} y={104} fill={RED}>LL</Label>
      <Label x={258} y={57} fill={MUTED}>LH</Label>
      <Label x={296} y={134} fill={RED}>LL</Label>
      <Label x={262} y={165}>Downtrend — lower highs, lower lows</Label>
    </svg>
  );
}

export function SupportResistance() {
  return (
    <svg viewBox="0 0 340 180" className={frame} role="img" aria-label="Support and resistance">
      <rect x={10} y={38} width={320} height={14} fill={RED} opacity={0.12} />
      <line x1={10} y1={45} x2={330} y2={45} stroke={RED} strokeDasharray="4 3" opacity={0.6} />
      <Label x={318} y={33} anchor="end" fill={RED}>Resistance</Label>
      <rect x={10} y={128} width={320} height={14} fill={GREEN} opacity={0.12} />
      <line x1={10} y1={135} x2={330} y2={135} stroke={GREEN} strokeDasharray="4 3" opacity={0.6} />
      <Label x={318} y={158} anchor="end" fill={GREEN}>Support</Label>
      <polyline
        points="15,130 45,60 75,50 105,120 135,132 165,55 195,48 225,125 255,135 285,52 315,45"
        fill="none" stroke={MUTED} strokeWidth={1.8}
      />
      <Label x={170} y={172}>Price bounces between the zones until one breaks</Label>
    </svg>
  );
}

export function RiskRewardDiagram() {
  return (
    <svg viewBox="0 0 340 190" className={frame} role="img" aria-label="Risk to reward">
      {/* reward zone */}
      <rect x={60} y={30} width={200} height={72} fill={GREEN} opacity={0.15} />
      {/* risk zone */}
      <rect x={60} y={102} width={200} height={24} fill={RED} opacity={0.2} />
      <line x1={60} y1={102} x2={260} y2={102} stroke={MUTED} strokeWidth={1.5} />
      <line x1={60} y1={126} x2={260} y2={126} stroke={RED} strokeWidth={1.5} strokeDasharray="4 3" />
      <line x1={60} y1={30} x2={260} y2={30} stroke={GREEN} strokeWidth={1.5} strokeDasharray="4 3" />
      <Label x={268} y={105} anchor="start">Entry 100</Label>
      <Label x={268} y={129} anchor="start" fill={RED}>Stop 98 (−1R)</Label>
      <Label x={268} y={33} anchor="start" fill={GREEN}>Target 106 (+3R)</Label>
      <Label x={160} y={70} fill={GREEN}>Reward = 3R</Label>
      <Label x={160} y={118} fill={RED}>Risk = 1R</Label>
      <Label x={160} y={165}>Risking 1 to make 3: profitable even at a 40% win rate</Label>
    </svg>
  );
}

export function BidAskDiagram() {
  return (
    <svg viewBox="0 0 340 150" className={frame} role="img" aria-label="Bid, ask, and spread">
      <rect x={30} y={40} width={120} height={44} rx={8} fill={GREEN} opacity={0.15} stroke={GREEN} />
      <Label x={90} y={58} fill={GREEN}>BID 99.98</Label>
      <Label x={90} y={74}>best buyer</Label>
      <rect x={190} y={40} width={120} height={44} rx={8} fill={RED} opacity={0.15} stroke={RED} />
      <Label x={250} y={58} fill={RED}>ASK 100.02</Label>
      <Label x={250} y={74}>best seller</Label>
      <line x1={150} y1={62} x2={190} y2={62} stroke={MINT} strokeWidth={1.5} />
      <Label x={170} y={54} fill={MINT}>spread</Label>
      <Label x={170} y={118}>Buy at the ask, sell at the bid — the spread is a cost on every trade</Label>
    </svg>
  );
}

export const DIAGRAMS: Record<string, () => JSX.Element> = {
  candleAnatomy: CandleAnatomy,
  candleTypes: CandleTypes,
  engulfing: EngulfingPatterns,
  pinBar: PinBarAtSupport,
  trend: TrendStructure,
  supportResistance: SupportResistance,
  riskReward: RiskRewardDiagram,
  bidAsk: BidAskDiagram,
};
