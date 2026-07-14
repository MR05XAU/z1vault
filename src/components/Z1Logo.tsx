import { cn } from "@/lib/utils";

export function Z1Logo({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="Z1 INSIGHTS"
      width={size}
      height={size}
      className={cn("rounded-2xl object-cover shadow-glow", className)}
      style={{ width: size, height: size }}
    />
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
