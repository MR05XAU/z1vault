// Generates a shareable chapter-completion certificate as a PNG, entirely on
// a canvas (no external assets). Downloads it, and uses the Web Share API on
// supporting devices so it can go straight to socials/messages.

export async function shareCertificate(opts: {
  chapterTitle: string;
  chapterNumber: number;
  name: string;
  scorePct?: number;
}) {
  const W = 1200, H = 630; // OG/social card ratio
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background — deep vault gradient with a soft mint glow.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0d1512");
  bg.addColorStop(1, "#080a09");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, -60, 40, W / 2, -60, 620);
  glow.addColorStop(0, "rgba(52,211,153,0.22)");
  glow.addColorStop(1, "rgba(52,211,153,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Border frame
  ctx.strokeStyle = "rgba(52,211,153,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  const center = W / 2;
  ctx.textAlign = "center";

  // Eyebrow
  ctx.fillStyle = "#34d399";
  ctx.font = "600 22px Georgia, serif";
  ctx.fillText("Z 1   I N S I G H T S", center, 130);

  // Divider
  ctx.strokeStyle = "rgba(52,211,153,0.5)";
  ctx.beginPath(); ctx.moveTo(center - 40, 160); ctx.lineTo(center + 40, 160); ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "22px Georgia, serif";
  ctx.fillText("Certificate of Completion", center, 215);

  // Chapter title (wrapped)
  ctx.fillStyle = "#f5f7f6";
  ctx.font = "600 52px Georgia, serif";
  const title = `Chapter ${opts.chapterNumber}: ${opts.chapterTitle}`;
  wrap(ctx, title, center, 300, W - 220, 60);

  // Name
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "italic 28px Georgia, serif";
  ctx.fillText(`Awarded to ${opts.name}`, center, 470);

  if (opts.scorePct != null) {
    ctx.fillStyle = "#34d399";
    ctx.font = "600 24px Georgia, serif";
    ctx.fillText(`Quiz score: ${opts.scorePct}%`, center, 512);
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "18px Georgia, serif";
  ctx.fillText(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), center, 560);

  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return;
  const file = new File([blob], `z1-chapter-${opts.chapterNumber}-certificate.png`, { type: "image/png" });

  // Prefer native share (image) where available; otherwise download.
  const navAny = navigator as any;
  if (navAny.canShare?.({ files: [file] })) {
    try {
      await navAny.share({ files: [file], title: "Z1 INSIGHTS", text: `I just completed Chapter ${opts.chapterNumber} in Z1 INSIGHTS.` });
      return;
    } catch { /* user cancelled or failed — fall through to download */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = file.name; a.click();
  URL.revokeObjectURL(url);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  let line = "", lines: string[] = [];
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineH));
}
