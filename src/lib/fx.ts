// Tiny celebration/haptics helpers — no dependencies.

/** Vibrate on supporting devices (Android Chrome; silently no-ops on iOS). */
export function buzz(pattern: number | number[] = 12) {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate?.(pattern);
  } catch { /* unsupported */ }
}

/** Lightweight confetti burst — DOM particles via the Web Animations API. */
export function confetti(count = 90) {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#34d399", "#fbbf24", "#60a5fa", "#f87171", "#a78bfa", "#f0fdf4"];
    const root = document.createElement("div");
    root.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden";
    document.body.appendChild(root);
    const W = window.innerWidth;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      const size = 5 + Math.random() * 6;
      p.style.cssText = `position:absolute;top:-12px;left:${Math.random() * W}px;width:${size}px;height:${size * (0.4 + Math.random() * 0.8)}px;background:${colors[i % colors.length]};border-radius:${Math.random() > 0.5 ? "50%" : "1px"};`;
      root.appendChild(p);
      const drift = (Math.random() - 0.5) * 220;
      const fall = window.innerHeight + 40;
      const dur = 1400 + Math.random() * 1200;
      p.animate(
        [
          { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
          { transform: `translate(${drift}px, ${fall}px) rotate(${(Math.random() - 0.5) * 900}deg)`, opacity: 0.9 },
        ],
        { duration: dur, easing: "cubic-bezier(0.15, 0.4, 0.6, 1)", fill: "forwards" },
      );
    }
    setTimeout(() => root.remove(), 2800);
  } catch { /* never let celebration break the app */ }
}
