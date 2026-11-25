/** Figures `borer`, `tradeoff`, `sens`. */
import { figureOf, drawStepResponse, drawSPlane, col, text, textReadout, wipe, rangeFrame, graphAxes, curve, tline, dot, PLOT_HEAD, type FigurePanel } from '@study/core';
import { C } from '@study/core/dsp';
import { f, lin, num, on, str, fmtPow10, isThumb, type V } from './util';
import { borerPoles, borerPush, borerS, borerStep, borerWnZeta, borerZero, diskSeek, diskShock } from '../model/plants';
import { drawBorer } from './scenes';

const borerOf = (v: V) => ({ K: num(v, 'K', 100), Kd: num(v, 'Kd', 11) });

export const borerPanels = (): FigurePanel[] => [
  {
    id: 'scene', title: 'The boring machine, from above', x: 'picture', y: '',
    draw(g, w, h, v: V) {
      const { K, Kd } = borerOf(v), input = str(v, 'input', 'both'), t = num(v, 't', 2.5);
      const resp = input === 'push' ? borerPush(K, Kd, 4, 8001) : borerStep(K, Kd, 4, 8001);
      const i = Math.max(0, Math.min(resp.t.length - 1, Math.round((t / 4) * (resp.t.length - 1))));
      drawBorer(g, w, h, { y: resp.y[i], input, exaggerate: input === 'push' ? 400 : 40 });
    },
  },
  {
    id: 'step', title: 'Command step (new planned line)', x: 'time (s)', y: 'y(t)',
    draw(g, w, h, v: V) {
      const { K, Kd } = borerOf(v), r = borerStep(K, Kd, 4, 8001);
      const ghosts = on(v, 'ghosts');
      const g20 = ghosts ? borerStep(20, Kd, 4, 4001) : undefined;
      const g100 = ghosts ? borerStep(100, Kd, 4, 4001) : undefined;
      const thumb = isThumb(g), head = thumb ? 0 : PLOT_HEAD;
      wipe(g, w, h);
      g.save(); g.translate(0, head);
      const settled = r.m.ts < 2 * 0.98;
      drawStepResponse(g, w, h - head, {
        t: r.t, y: r.y, final: 1, ref: 1, tEnd: 2, show: { overshoot: true, band: true, settling: settled },
        ghost: g20 ? { t: g20.t, y: g20.y, label: 'K = 20' } : undefined, color: col.a(),
      });
      g.restore();
      const z = borerWnZeta(K, Kd);
      if (!thumb) textReadout(g, `ζ = ${f(z.zeta, 3)}  ωn = ${f(z.wn, 2)}  OS ${f(r.m.os, 2)} %  Ts ${f(r.m.ts, 3)} s`, 8, 14, col.text(), 'left', 10);
    },
  },
  {
    id: 'push', title: 'Unit rock push', x: 'time (s)', y: 'y(t)',
    draw(g, w, h, v: V) {
      const { K, Kd } = borerOf(v), r = borerPush(K, Kd, 4, 8001);
      const thumb = isThumb(g), head = thumb ? 0 : PLOT_HEAD;
      wipe(g, w, h);
      g.save(); g.translate(0, head);
      const settled = r.m.ts < 2.5 * 0.98;
      drawStepResponse(g, w, h - head, {
        t: r.t, y: r.y, final: 1 / K, ref: 0, tEnd: 2.5, show: { ess: false, overshoot: false, settling: settled },
        color: col.a(), yLabel: 'y(t)  (offset 1/K)',
      });
      g.restore();
      if (!thumb) textReadout(g, `offset 1/K = ${f(1 / K, 4)}   peak ${f(r.m.peak, 5)} at ${f(r.m.tp, 3)} s`, 8, 14, col.text(), 'left', 10);
    },
  },
  {
    id: 'splane', title: 'Poles and the command-response zero', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw(g, w, h, v: V) {
      const { K, Kd } = borerOf(v);
      const poles = borerPoles(K, Kd);
      const z = borerZero(K, Kd);
      const ghosts = on(v, 'ghosts') ? [...borerPoles(20, Kd), ...borerPoles(100, Kd)] : [];
      const zeros = z === null ? [] : [C(z, 0)];
      let inset: { range: number; reCenter: number; label: string } | undefined;
      if (!isThumb(g) && z !== null && w >= 200) {
        const near = poles.reduce((a, p) => (Math.hypot(p.re - z, p.im) < Math.hypot(a.re - z, a.im) ? p : a), poles[0]);
        const d = near ? Math.hypot(near.re - z, near.im) : 0;
        if (d > 1e-6 && d < 1.2) {
          const mid = (near.re + z) / 2;
          inset = { range: Math.max(0.45, d * 2.4), reCenter: mid, label: 'zoom' };
        }
      }
      drawSPlane(g, w, h, {
        range: 10, reCenter: -6,
        poles, zeros,
        labels: true, zetaRays: [1, 0.6],
        marks: ghosts.map((p) => ({ s: p, label: '', color: col.muted() })),
        maxAspect: 1.35, inset,
      });
    },
  },
];
export const borerFigure = figureOf(() => borerPanels());

export const tradeoffPanels = (): FigurePanel[] => [
  {
    id: 'curve', title: 'Overshoot against push (or shock) offset', x: 'step overshoot (%)', y: 'offset',
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const machine = str(v, 'machine', 'boring machine');
      const g0 = num(v, 'g', 100);
      const isDisk = machine.includes('disk');
      const Ks = lin(5, isDisk ? 2000 : 400, isDisk ? 80 : 60);
      const xs: number[] = [], ys: number[] = [];
      if (isDisk) {
        for (const Ka of Ks) { xs.push(diskSeek(Ka, 3, 4001).m.os); ys.push(Math.abs(-1 / (5 * Ka))); }
      } else {
        for (const K of Ks) { xs.push(borerStep(K, 11, 6, 4001).m.os); ys.push(1 / K); }
      }
      const xr: [number, number] = [0, Math.max(40, ...xs) * 1.05], yr: [number, number] = [Math.min(...ys) * 0.7, Math.max(...ys) * 1.15];
      // log y
      const yLog: [number, number] = [Math.log10(Math.max(yr[0], 1e-5)), Math.log10(yr[1])];
      const thumb = isThumb(g), head = thumb ? 0 : PLOT_HEAD;
      const fr = rangeFrame(w, h, xr, yLog, 72, 14, thumb ? 12 : head, 32);
      graphAxes(g, fr, xr, yLog, 'overshoot (%)', isDisk ? '|shock offset|' : 'push offset', 0, 1, undefined, fmtPow10);
      curve(g, fr, xs, ys.map((y) => Math.log10(y)), col.muted(), 2);
      const liveX = isDisk ? diskSeek(g0, 3, 4001).m.os : borerStep(g0, 11, 6, 4001).m.os;
      const liveY = isDisk ? Math.abs(-1 / (5 * g0)) : 1 / g0;
      dot(g, fr, [liveX, Math.log10(liveY)], col.a(), 5);
      const marks = isDisk ? [[10, 'Ka = 10'], [80, 'Ka = 80']] : [[20, 'K = 20'], [100, 'K = 100']];
      for (const [k, lab] of marks as [number, string][]) {
        const x = isDisk ? diskSeek(k, 3, 4001).m.os : borerStep(k, 11, 6, 4001).m.os;
        const y = isDisk ? Math.abs(-1 / (5 * k)) : 1 / k;
        dot(g, fr, [x, Math.log10(y)], col.e(), 4);
        text(g, lab, fr.X(x) + 6, fr.Y(Math.log10(y)) - 4, col.e(), 'left', 10);
      }
      if (!thumb) textReadout(g, `${isDisk ? 'Ka' : 'K'} = ${f(g0, 1)}  →  OS ${f(liveX, 2)} %, offset ${f(liveY, 5)}`, 8, 14, col.text(), 'left', 10);
    },
  },
  {
    id: 'step', title: 'The step that sits at the dot', x: 'time (s)', y: 'y(t)',
    draw(g, w, h, v: V) {
      const machine = str(v, 'machine', 'boring machine'), g0 = num(v, 'g', 100);
      const isDisk = machine.includes('disk');
      const r = isDisk ? diskSeek(g0, 3, 4001) : borerStep(g0, 11, 6, 4001);
      const thumb = isThumb(g), head = thumb ? 0 : PLOT_HEAD;
      wipe(g, w, h);
      if (!isThumb(g)) textReadout(g, `${isDisk ? 'Ka' : 'K'} = ${f(g0, 1)}  OS ${f(r.m.os, 2)} %  Ts ${f(r.m.ts, 3)} s`, 8, 14, col.text(), 'left', 10);
      g.save(); g.translate(0, head);
      drawStepResponse(g, w, h - head, {
        t: r.t, y: r.y, final: 1, ref: 1, tEnd: isDisk ? 1.5 : 2.5,
        show: { overshoot: true, band: true, settling: true }, color: col.a(),
      });
      g.restore();
    },
  },
];
export const tradeoffFigure = figureOf(() => tradeoffPanels());

export const sensPanels = (): FigurePanel[] => [
  {
    id: 'path', title: 'S(jω) in the complex plane', x: 'Re S', y: 'Im S',
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const K = num(v, 'K', 20), logw = num(v, 'w', 0), w0 = 10 ** logw;
      const ws = lin(-1, 3, 400).map((x) => 10 ** x);
      const pts = ws.map((ww) => borerS(K, { re: 0, im: ww }));
      const xr: [number, number] = [-0.2, 1.15], yr: [number, number] = [-0.15, 1.05];
      const thumb = isThumb(g), head = thumb ? 0 : PLOT_HEAD;
      const p = borerS(K, { re: 0, im: w0 });
      if (!thumb) textReadout(g, `ω = ${f(w0, 2)}  S = ${f(p.re, 3)} + j${f(p.im, 3)}`, 8, 14, col.text(), 'left', 10);
      const fr = rangeFrame(w, h, xr, yr, 72, 12, thumb ? 10 : head, 28);
      graphAxes(g, fr, xr, yr, 'Re S', 'Im S');
      curve(g, fr, pts.map((p) => p.re), pts.map((p) => p.im), col.a(), 2);
      // a few direction arrows
      for (const i of [40, 120, 200, 280]) {
        if (i + 1 < pts.length) arrowHead(g, fr.X(pts[i].re), fr.Y(pts[i].im), fr.X(pts[i + 1].re), fr.Y(pts[i + 1].im), col.a());
      }
      dot(g, fr, [p.re, p.im], col.e(), 5);
    },
  },
  {
    id: 'mag', title: '|S| and the shortcut |s/K|', x: 'ω (rad/s, log)', y: '|S| (log)',
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const K = num(v, 'K', 20), logw = num(v, 'w', 0), w0 = 10 ** logw;
      const ws = lin(-1, 3, 400).map((x) => 10 ** x);
      const mag = ws.map((ww) => borerS(K, { re: 0, im: ww }).mag);
      const approx = ws.map((ww) => ww / K);
      const xr: [number, number] = [-1, 3], yr: [number, number] = [-3, 0.3];
      const head = isThumb(g) ? 10 : 46;
      const fr = rangeFrame(w, h, xr, yr, 72, 12, head, 30);
      graphAxes(g, fr, xr, yr, 'ω (rad/s)', '|S|', 1, 1, fmtPow10, fmtPow10);
      curve(g, fr, ws.map(Math.log10), mag.map((m) => Math.log10(Math.max(m, 1e-6))), col.a(), 2);
      curve(g, fr, ws.map(Math.log10), approx.map((m) => Math.log10(Math.max(m, 1e-6))), col.muted(), 1.6, [6, 4]);
      tline(g, fr, [Math.log10(w0), yr[0]], [Math.log10(w0), yr[1]], col.e(), 1.2, [4, 3]);
      const S = borerS(K, { re: 0, im: w0 }).mag;
      // not named in a caption: may wrap, shrink to 9 px, or drop on a tile if it will not stay above the plot
      if (!isThumb(g)) textReadout(g, `|S| = ${f(S, 4)} at ω = ${f(w0, 2)}.  A 10 % change in the machine at this rate changes the loop by ${f(10 * S, 2)} %.`, 8, 14, col.text(), 'left', 10, undefined, fr.box.t - 2);
    },
  },
];
export const sensFigure = figureOf(() => sensPanels());

function arrowHead(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  const ang = Math.atan2(y2 - y1, x2 - x1), L = 6;
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - L * Math.cos(ang - 0.4), y2 - L * Math.sin(ang - 0.4));
  g.lineTo(x2 - L * Math.cos(ang + 0.4), y2 - L * Math.sin(ang + 0.4)); g.closePath(); g.fill();
}
