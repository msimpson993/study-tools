import { figureOf, rangeFrame, axes2, graphAxes, curve, polyline, cross, text, wipe, clipBox, col, type V2 } from '@study/core';
import { cartStep, cartStepInfo, locusOf, polesAt } from '../cart';

const num = (v: Record<string, number | string | boolean>, k: string) => v[k] as number;
const zAbs = (v: Record<string, number | string | boolean>) => (String(v.ctrl) === 'pd' ? 1.5 : 0);
const f1 = (x: number, d = 1) => x.toFixed(d).replace('-', '−');

/** Root locus of the cart under P (or P + a zero at −1.5): the closed-loop poles slide as the gain K grows, next to the step response they produce. */
export const locusFigure = figureOf((c) => {
  const cache = new Map<number, ReturnType<typeof locusOf>>();
  const locus = (z: number) => { if (!cache.has(z)) cache.set(z, locusOf(z)); return cache.get(z)!; };
  return [
    {
      id: 'splane', title: 'Where the closed-loop poles are', x: 'Re s (1/s)', y: 'Im s (rad/s)',
      draw(g, w, h) {
        wipe(g, w, h);
        const z = zAbs(c.values), K = num(c.values, 'K'), f = rangeFrame(w, h, [-6, 1.2], [-6, 6], 30, 8, 8, 8);
        g.fillStyle = 'rgba(239,91,91,.10)'; g.fillRect(f.X(0), f.box.t, f.box.r - f.X(0), f.box.b - f.box.t);
        axes2(g, f);
        g.save(); clipBox(g, f);
        const rl = locus(z);
        for (const br of rl.branches) polyline(g, f, br.map((p) => [p.re, p.im] as V2), col.accent(), 2.2);
        // open-loop poles (K = 0) and the controller zero
        for (const p of rl.poles) cross(g, f, [p.re, p.im], col.muted(), 6);
        for (const zz of rl.zeros) { g.strokeStyle = col.muted(); g.lineWidth = 2; g.beginPath(); g.arc(f.X(zz.re), f.Y(zz.im), 5, 0, 7); g.stroke(); }
        // the current poles
        for (const p of polesAt(K, z)) { cross(g, f, [p.re, p.im], p.re < 0 ? col.c() : col.bad(), 8); }
        g.restore();
        text(g, 'stable', f.X(-3), f.box.t + 10, col.ok(), 'center', 10);
        text(g, 'unstable', f.X(0.6), f.box.t + 10, col.bad(), 'center', 10);
        text(g, `K = ${f1(K, 2)}`, f.box.l + 4, f.box.b - 8, col.text(), 'left', 12);
      },
    },
    {
      id: 'step', title: 'The step response those poles give', x: 'time t (s)', y: 'position y (m) for a 1 m command',
      draw(g, w, h) {
        wipe(g, w, h);
        const z = zAbs(c.values), K = num(c.values, 'K'), tm = 8;
        const r = cartStep(K, z, tm, 400), si = cartStepInfo(K, z);
        const ymax = Math.max(1.2, ...r.y) * 1.05, f = rangeFrame(w, h, [0, tm], [0, ymax], 44, 10, 8, 30);
        graphAxes(g, f, [0, tm], [0, ymax], 'time t (s)', 'y (m)');
        curve(g, f, [0, tm], [1, 1], col.muted(), 1.2, [5, 4]);
        if (Number.isFinite(si.yFinal)) curve(g, f, [0, tm], [si.yFinal, si.yFinal], col.e(), 1.2, [2, 3]);
        curve(g, f, r.t, r.y, col.c(), 2.8);
        const lines = Number.isFinite(si.yFinal)
          ? [`overshoot ${f1(si.overshootPct)} %`, `settles (2 %) ${f1(si.settlingTime)} s`, `final value ${f1(si.yFinal, 2)}  (error ${f1(100 * si.ess, 0)} %)`]
          : ['unstable'];
        lines.forEach((s, i) => text(g, s, f.box.r - 6, f.box.b - 10 - 14 * (lines.length - 1 - i), col.text(), 'right', 11));
      },
    },
  ];
});
