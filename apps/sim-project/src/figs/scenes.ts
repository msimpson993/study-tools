/** Static and animated drawings of the four machines. Used by live figures and quiz `lab-scene`. */
import { col, text, wipe } from '@study/core';
import { arrow, f, rounded } from './util';

const ink = () => col.text(), dim = () => col.muted(), acc = () => col.accent(), yel = () => col.e();

/** DC motor + load disc + brake; tachometer and amplifier only when the loop is on. */
export function drawMotor(g: CanvasRenderingContext2D, w: number, h: number, o: { loop?: 'open' | 'closed' | 'both'; t?: number; speed?: number; exaggerate?: number } = {}) {
  wipe(g, w, h);
  // keep the load disc and T_d inside the panel
  const R = Math.min(w, h) * 0.18;
  const cx = Math.min(w * 0.36, Math.max(R * 1.4, w - R * 3.6 - 36));
  const cy = h * 0.50;
  const ang = (o.speed ?? 0) * (o.exaggerate ?? 100);
  // housing
  g.fillStyle = col.grid(); rounded(g, cx - R * 1.15, cy - R * 0.85, R * 1.5, R * 1.7, 8); g.fill();
  g.strokeStyle = ink(); g.lineWidth = 1.6; rounded(g, cx - R * 1.15, cy - R * 0.85, R * 1.5, R * 1.7, 8); g.stroke();
  text(g, 'motor', cx - R * 0.4, cy - R * 0.95, dim(), 'center', 10);
  // shaft
  g.strokeStyle = ink(); g.lineWidth = 5; g.beginPath(); g.moveTo(cx + R * 0.3, cy); g.lineTo(cx + R * 2.15, cy); g.stroke();
  // load disc
  const dx = cx + R * 2.15, dy = cy;
  g.save(); g.translate(dx, dy); g.rotate(ang);
  g.fillStyle = col.a(); g.globalAlpha = 0.25; g.beginPath(); g.arc(0, 0, R * 0.85, 0, 6.28); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = col.a(); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R * 0.85, 0, 6.28); g.stroke();
  g.beginPath(); g.moveTo(0, 0); g.lineTo(R * 0.85, 0); g.stroke();
  g.restore();
  text(g, 'load', dx, dy + R * 1.05, dim(), 'center', 10);
  // brake pad + Td
  const bx = dx + R * 0.55, by = dy - R * 1.15;
  g.fillStyle = col.bad(); g.globalAlpha = 0.35; rounded(g, bx - 10, by, 20, 18, 3); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = col.bad(); rounded(g, bx - 10, by, 20, 18, 3); g.stroke();
  arrow(g, bx, by - 22, bx, by + 2, col.bad(), 1.8);
  text(g, 'T_d', bx + 14, by - 16, col.bad(), 'left', 11);
  const loopOn = o.loop === 'closed' || o.loop === 'both';
  if (loopOn) {
    // tachometer on the shaft
    const tx = cx + R * 1.15, ty = cy + R * 0.7;
    rounded(g, tx - 18, ty - 12, 36, 24, 4); g.strokeStyle = acc(); g.stroke();
    text(g, 'tach', tx, ty + 4, acc(), 'center', 9);
    arrow(g, tx, ty + 14, tx - R * 0.8, cy + R * 1.15, acc(), 1.2);
    rounded(g, cx - R * 1.7, cy + R * 0.95, 54, 26, 4); g.strokeStyle = acc(); g.stroke();
    text(g, 'Ka', cx - R * 1.7 + 27, cy + R * 0.95 + 17, acc(), 'center', 10);
    arrow(g, cx - R * 1.7 + 54, cy + R * 1.08, cx - R * 1.15, cy + R * 0.85, acc(), 1.2);
  }
  if (o.exaggerate) text(g, `speed change drawn ×${o.exaggerate}`, 8, h - 8, dim(), 'left', 9);
}

/** Plan view of the tunnel-boring machine: planned line, cutter at y(t). */
export function drawBorer(g: CanvasRenderingContext2D, w: number, h: number, o: { y?: number; input?: string; exaggerate?: number } = {}) {
  wipe(g, w, h);
  const mid = h * 0.5, y = (o.y ?? 0) * (o.exaggerate ?? 80);
  g.setLineDash([6, 5]); g.strokeStyle = dim(); g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(16, mid); g.lineTo(w - 16, mid); g.stroke(); g.setLineDash([]);
  text(g, 'planned line', w - 18, mid - 10, dim(), 'right', 10);
  // tunnel walls
  g.strokeStyle = col.grid(); g.lineWidth = 2;
  g.beginPath(); g.moveTo(16, mid - 48); g.lineTo(w - 16, mid - 48); g.moveTo(16, mid + 48); g.lineTo(w - 16, mid + 48); g.stroke();
  const hx = w * 0.62, hy = mid - y;
  // cutter head
  g.fillStyle = acc(); g.globalAlpha = 0.25; g.beginPath(); g.arc(hx, hy, 18, 0, 6.28); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = acc(); g.lineWidth = 2; g.beginPath(); g.arc(hx, hy, 18, 0, 6.28); g.stroke();
  // body
  g.strokeStyle = ink(); rounded(g, hx - 70, hy - 12, 54, 24, 4); g.stroke();
  text(g, 'cutter', hx, hy + 4, ink(), 'center', 9);
  text(g, `y = ${f(o.y ?? 0, 3)}`, hx, hy + 32, acc(), 'center', 10);
  if (o.input === 'push' || o.input === 'both') {
    arrow(g, hx, hy - 52, hx, hy - 22, col.bad(), 1.8);
    text(g, 'T_d  rock', hx + 8, hy - 54, col.bad(), 'left', 10);
  }
}

/** Disk drive from above: arm, head, concentric tracks. */
export function drawDisk(g: CanvasRenderingContext2D, w: number, h: number, o: { y?: number; input?: string } = {}) {
  wipe(g, w, h);
  const cx = w * 0.38, cy = h * 0.52, R = Math.min(w, h) * 0.38;
  g.strokeStyle = col.grid(); g.lineWidth = 1;
  for (let i = 3; i <= 8; i++) { g.beginPath(); g.arc(cx, cy, R * (i / 8), 0, 6.28); g.stroke(); }
  g.strokeStyle = ink(); g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, R, 0, 6.28); g.stroke();
  text(g, 'tracks', cx, cy + R + 12, dim(), 'center', 9);
  // arm pivot at right
  const px = w * 0.82, py = cy;
  const ang = -0.7 + (o.y ?? 0) * 0.7; // 0..1 seek maps to angle
  const hx = px + Math.cos(Math.PI + ang) * (px - cx + R * 0.15);
  const hy = py + Math.sin(Math.PI + ang) * (px - cx + R * 0.15);
  // actually compute head on a track radius
  const reach = Math.hypot(px - cx, 0) - 8;
  const headX = px + Math.cos(Math.PI + ang) * reach * 0.85;
  const headY = py + Math.sin(Math.PI + ang) * reach * 0.85;
  g.strokeStyle = acc(); g.lineWidth = 4; g.beginPath(); g.moveTo(px, py); g.lineTo(headX, headY); g.stroke();
  g.fillStyle = acc(); g.beginPath(); g.arc(px, py, 6, 0, 6.28); g.fill();
  g.beginPath(); g.arc(headX, headY, 5, 0, 6.28); g.fill();
  text(g, 'head', headX - 16, headY + 14, acc(), 'right', 9);
  text(g, 'arm', px, py + 16, dim(), 'center', 9);
  if (o.input === 'shock' || o.input === 'push' || o.input === 'both') {
    arrow(g, headX + 28, headY - 28, headX + 8, headY - 6, col.bad(), 1.8);
    text(g, 'T_d  shock', Math.min(w - 8, headX + 18), Math.max(16, headY - 44), col.bad(), 'left', 10);
  }
}

/** Engine + throttle + rpm gauge. */
export function drawEngine(g: CanvasRenderingContext2D, w: number, h: number, o: { y?: number; u?: number; label?: string } = {}) {
  wipe(g, w, h);
  const ex = 16, ey = 16, ew = w * 0.48, eh = h - 32;
  rounded(g, ex, ey, ew, eh, 8); g.strokeStyle = ink(); g.stroke();
  text(g, 'engine', ex + ew / 2, ey + 16, dim(), 'center', 10);
  // throttle flap
  const tx = ex + ew * 0.35, ty = ey + eh * 0.55, open = Math.max(0, Math.min(1, o.u ?? 0)) * 0.8;
  g.strokeStyle = acc(); g.lineWidth = 2;
  g.beginPath(); g.arc(tx, ty, 22, 0, 6.28); g.stroke();
  g.save(); g.translate(tx, ty); g.rotate(-0.2 - open);
  g.beginPath(); g.moveTo(-20, 0); g.lineTo(20, 0); g.stroke();
  g.restore();
  text(g, 'throttle', tx, ty + 36, acc(), 'center', 9);
  // rpm gauge
  const gx = w * 0.74, gy = h * 0.5, gR = Math.min(w * 0.18, h * 0.32);
  g.strokeStyle = ink(); g.lineWidth = 2; g.beginPath(); g.arc(gx, gy, gR, Math.PI * 0.75, Math.PI * 2.25); g.stroke();
  const rpm = (o.y ?? 0); // 0..1 of a unit step, or fraction
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, ang = a0 + Math.max(0, Math.min(1.15, rpm)) * (a1 - a0);
  g.strokeStyle = acc(); g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + gR * 0.8 * Math.cos(ang), gy + gR * 0.8 * Math.sin(ang)); g.stroke();
  text(g, 'rpm', gx, gy + gR + 14, dim(), 'center', 10);
  if (o.label) {
    g.font = '9px system-ui, sans-serif';
    const maxW = w - 16;
    let s = o.label;
    if (g.measureText(s).width > maxW) {
      while (s.length > 4 && g.measureText(s + '…').width > maxW) s = s.slice(0, -1);
      s = s.trimEnd() + '…';
    }
    text(g, s, 8, h - 6, dim(), 'left', 9);
  }
}

/** Tuner slider strip, drawn like the PID Tuner toolbar. */
export function drawTunerSliders(g: CanvasRenderingContext2D, w: number, h: number, resp: number, rob: number, respRange: [number, number] = [0.3, 5], robRange: [number, number] = [0.3, 0.9]) {
  wipe(g, w, h);
  const row = (y: number, left: string, right: string, v: number, lo: number, hi: number) => {
    // labels sit above the track so a dot at either end cannot cover them
    text(g, left, 10, y - 14, dim(), 'left', 10);
    text(g, right, w - 10, y - 14, dim(), 'right', 10);
    const x0 = 16, x1 = w - 16, t = (v - lo) / (hi - lo), x = x0 + t * (x1 - x0);
    g.strokeStyle = col.grid(); g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    g.fillStyle = acc(); g.beginPath(); g.arc(x, y, 6, 0, 6.28); g.fill();
    text(g, f(v, 3), x, y + 16, acc(), 'center', 10);
  };
  text(g, 'Stand-in engine (not in lab handout)', w / 2, 12, dim(), 'center', 9);
  row(h * 0.42, 'Slower', 'Faster', resp, respRange[0], respRange[1]);
  row(h * 0.78, 'Aggressive', 'Robust', rob, robRange[0], robRange[1]);
}

export function drawMachine(g: CanvasRenderingContext2D, w: number, h: number, machine: string, opts: Record<string, unknown> = {}) {
  const m = machine.toLowerCase();
  if (m.startsWith('motor')) drawMotor(g, w, h, opts as never);
  else if (m.includes('bor')) drawBorer(g, w, h, opts as never);
  else if (m.includes('disk')) drawDisk(g, w, h, opts as never);
  else drawEngine(g, w, h, { ...opts, label: 'Stand-in engine (not in lab handout)' });
}
