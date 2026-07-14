import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calculator, CandlestickChart } from "lucide-react";

export default function Calculators() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"rr" | "size">("rr");
  return (
    <MobileShell
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 safe-top">
          <div className="flex items-center gap-3">
            <button onClick={() => nav(-1)} className="size-9 grid place-items-center rounded-full glass press">
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-mint-bright">Tools</div>
              <h1 className="display text-2xl font-medium">Calculators.</h1>
            </div>
          </div>
          <div className="mt-4 flex gap-1 bg-surface-elevated/60 rounded-xl p-1">
            <button onClick={() => setTab("rr")} className={`flex-1 text-xs py-2 rounded-lg press ${tab==="rr"?"bg-mint text-mint-foreground":"text-muted-foreground"}`}>Risk / Reward</button>
            <button onClick={() => setTab("size")} className={`flex-1 text-xs py-2 rounded-lg press ${tab==="size"?"bg-mint text-mint-foreground":"text-muted-foreground"}`}>Position size</button>
          </div>
          <button onClick={() => nav("/patterns")} className="mt-3 w-full glass rounded-xl py-2.5 flex items-center justify-center gap-2 text-xs press">
            <CandlestickChart className="size-4 text-mint-bright" />
            Candlestick patterns reference
          </button>
        </header>
      }
    >
      <div className="px-5 mt-4 pb-nav">
        {tab === "rr" ? <RRCalc /> : <SizeCalc />}
        <p className="text-[10px] text-muted-foreground italic mt-6 text-center">Educational tool only. Not financial advice.</p>
      </div>
    </MobileShell>
  );
}

function RRCalc() {
  const [v, setV] = useState({ entry: "", stop: "", target: "" });
  const r = useMemo(() => {
    const e = Number(v.entry), s = Number(v.stop), t = Number(v.target);
    if (!e || !s || !t) return null;
    const risk = Math.abs(e - s), reward = Math.abs(t - e);
    if (!risk) return null;
    return { risk, reward, rr: reward / risk };
  }, [v]);
  return (
    <div className="space-y-3">
      <F label="Entry"><Input type="number" step="any" value={v.entry} onChange={(e)=>setV({...v,entry:e.target.value})} /></F>
      <F label="Stop loss"><Input type="number" step="any" value={v.stop} onChange={(e)=>setV({...v,stop:e.target.value})} /></F>
      <F label="Take profit"><Input type="number" step="any" value={v.target} onChange={(e)=>setV({...v,target:e.target.value})} /></F>
      <div className="glass-strong rounded-2xl p-5 mt-4 text-center">
        <div className="text-[10px] uppercase tracking-[0.28em] text-mint-bright">Risk : Reward</div>
        <div className="display text-5xl mint-text font-medium mt-2">
          {r ? `1 : ${r.rr.toFixed(2)}` : "—"}
        </div>
        {r && (
          <div className="text-xs text-muted-foreground mt-2">
            Risk {r.risk.toFixed(2)} · Reward {r.reward.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}

function SizeCalc() {
  const [v, setV] = useState({ account: "", riskPct: "1", entry: "", stop: "" });
  const r = useMemo(() => {
    const a = Number(v.account), p = Number(v.riskPct), e = Number(v.entry), s = Number(v.stop);
    if (!a || !p || !e || !s) return null;
    const riskMoney = a * (p / 100);
    const stopDist = Math.abs(e - s);
    if (!stopDist) return null;
    const size = riskMoney / stopDist;
    return { riskMoney, stopDist, size };
  }, [v]);
  return (
    <div className="space-y-3">
      <F label="Account size ($)"><Input type="number" step="any" value={v.account} onChange={(e)=>setV({...v,account:e.target.value})} /></F>
      <F label="Risk per trade (%)"><Input type="number" step="any" value={v.riskPct} onChange={(e)=>setV({...v,riskPct:e.target.value})} /></F>
      <F label="Entry price"><Input type="number" step="any" value={v.entry} onChange={(e)=>setV({...v,entry:e.target.value})} /></F>
      <F label="Stop loss"><Input type="number" step="any" value={v.stop} onChange={(e)=>setV({...v,stop:e.target.value})} /></F>
      <div className="glass-strong rounded-2xl p-5 mt-4 text-center">
        <div className="text-[10px] uppercase tracking-[0.28em] text-mint-bright">Position size</div>
        <div className="display text-4xl mint-text font-medium mt-2">
          {r ? r.size.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
        </div>
        {r && (
          <div className="text-xs text-muted-foreground mt-2">
            Risking ${r.riskMoney.toFixed(2)} · Stop {r.stopDist.toFixed(2)} away
          </div>
        )}
      </div>
    </div>
  );
}
function F({ label, children }: any) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}