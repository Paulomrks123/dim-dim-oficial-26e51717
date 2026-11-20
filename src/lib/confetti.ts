export function burst(kind: "income" | "expense") {
  if (typeof document === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const css = getComputedStyle(document.documentElement);
  const colors = kind === "income" ? [css.getPropertyValue("--primary"), css.getPropertyValue("--chart-5"), css.getPropertyValue("--warning")] : [css.getPropertyValue("--destructive"), css.getPropertyValue("--accent")];
  const c = document.createElement("canvas");
  c.className = "fx-canvas"; c.width = innerWidth; c.height = innerHeight;
  document.body.appendChild(c);
  const ctx = c.getContext("2d")!;
  const ps = Array.from({ length: 90 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.6, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16 - 4, s: Math.random() * 6 + 3, r: Math.random() * 6, col: colors[Math.floor(Math.random() * colors.length)]!.trim() }));
  let f = 0;
  const tick = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of ps) { p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.r += 0.2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1 - f / 90); ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
    if (++f < 90) requestAnimationFrame(tick); else c.remove();
  };
  requestAnimationFrame(tick);
}
