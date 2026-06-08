import { cn } from "@/lib/utils";

export function Z1Logo({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-2xl gold-border bg-surface-elevated shadow-glow",
        className
      )}
      style={{ width: size, height: size }}
    >
      <span
        className="display gold-text font-medium leading-none"
        style={{ fontSize: size * 0.5 }}
      >
        Z
        <span className="font-mono text-[0.6em] align-super">1</span>
      </span>
    </div>
  );
}

export function Z1Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Z1Logo size={36} />
      <div className="leading-none">
        <div className="display text-[15px] font-medium tracking-[0.16em] text-foreground">
          Z1 INSIGHTS
        </div>
        <div className="text-[9px] uppercase tracking-[0.32em] text-muted-foreground mt-1">
          Private Trading Vault
        </div>
      </div>
    </div>
  );
}