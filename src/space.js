// Weltraum-Hintergrund: Sterne, die sanft funkeln, und Teilchen, die der Mauszeiger wegschiebt (Skizze Home)
export function startSpace(canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, stars = [], dust = [];
  const mouse = { x: -999, y: -999 };

  function resize() {
    W = canvas.width = innerWidth * devicePixelRatio;
    H = canvas.height = innerHeight * devicePixelRatio;
    stars = Array.from({ length: 220 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + 0.3, p: Math.random() * 6 }));
    // Staubteilchen kehren an ihre Ruheposition zurück, nachdem der Zeiger sie weggeschoben hat
    dust = Array.from({ length: 90 }, () => {
      const x = Math.random() * W, y = Math.random() * H;
      return { x, y, hx: x, hy: y, vx: 0, vy: 0 };
    });
  }
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => { mouse.x = e.clientX * devicePixelRatio; mouse.y = e.clientY * devicePixelRatio; });
  resize();

  function frame(now) {
    ctx.clearRect(0, 0, W, H); // durchsichtig, damit das Webb-Bild dahinter sichtbar bleibt
    for (const s of stars) {
      const a = reduce ? 0.7 : 0.45 + 0.35 * Math.sin(now / 900 + s.p);
      ctx.fillStyle = `rgba(245,239,230,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * devicePixelRatio, 0, Math.PI * 2); ctx.fill();
    }
    const R = 110 * devicePixelRatio;
    for (const d of dust) {
      const dx = d.x - mouse.x, dy = d.y - mouse.y, dist = Math.hypot(dx, dy);
      if (dist < R && dist > 0) { const f = (1 - dist / R) * 2.2; d.vx += (dx / dist) * f; d.vy += (dy / dist) * f; }
      d.vx += (d.hx - d.x) * 0.01; d.vy += (d.hy - d.y) * 0.01;
      d.vx *= 0.9; d.vy *= 0.9;
      d.x += d.vx; d.y += d.vy;
      ctx.fillStyle = 'rgba(168,143,214,0.55)';
      ctx.fillRect(d.x, d.y, 2 * devicePixelRatio, 2 * devicePixelRatio);
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
