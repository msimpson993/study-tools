/** Figure `engine-fit` (not in lab handout): the 8 tuner-table points against the stand-in G(jω). */
import { figureOf, col, text, wipe, rangeFrame, graphAxes, curve, type FigurePanel } from '@study/core';
import { engineGjw } from '../model/plants';
import { ENGINE } from '../model/params';
import { fmtPow10 } from './util';

/** Handout-derived points (ω rad/s, |G|, phase °). The last phase is plotted unwrapped at −225.65°. */
export const FIT_POINTS: { w: number; mag: number; phase: number; plotPhase: number }[] = [
  { w: 2.950, mag: 190.12, phase: -83.55, plotPhase: -83.55 },
  { w: 16.700, mag: 12.60, phase: -172.54, plotPhase: -172.54 },
  { w: 0.645, mag: 303.34, phase: -20.70, plotPhase: -20.70 },
  { w: 3.270, mag: 174.55, phase: -90.00, plotPhase: -90.00 },
  { w: 1.330, mag: 277.80, phase: -41.84, plotPhase: -41.84 },
  { w: 15.000, mag: 15.44, phase: -168.66, plotPhase: -168.66 },
  { w: 19.000, mag: 9.87, phase: -176.99, plotPhase: -176.99 },
  { w: 60.300, mag: 1.00, phase: 134.35, plotPhase: -225.65 },
];

export function engineFitAt(w: number, delay: boolean): { mag: number; phase: number; plotPhase: number } {
  const g = engineGjw(w, ENGINE.K, ENGINE.wn, ENGINE.zeta, delay ? ENGINE.tau : 0);
  const deg = g.ang * (180 / Math.PI);
  let plot = deg;
  if (w > 30 && plot > 0) plot -= 360;
  return { mag: g.mag, phase: deg, plotPhase: plot };
}

const W_MIN = -0.5, W_MAX = 2;

function logXs(n = 260): number[] {
  return Array.from({ length: n }, (_, i) => W_MIN + (W_MAX - W_MIN) * i / (n - 1));
}

function unwrap(vals: number[]): number[] {
  const out = vals.slice();
  for (let i = 1; i < out.length; i++) {
    while (out[i] - out[i - 1] > 180) out[i] -= 360;
    while (out[i] - out[i - 1] < -180) out[i] += 360;
  }
  return out;
}
/** Footnote sits under the plot box, not over the curves. */
function corner(g: CanvasRenderingContext2D, _w: number, h: number) {
  text(g, 'Stand-in, not in lab handout. Points from the handout\'s PID Tuner tables (pp.3–5).', 8, h - 6, col.muted(), 'left', 9);
}

function nearPoint(w: number): typeof FIT_POINTS[number] | undefined {
  return FIT_POINTS.find((p) => Math.abs(p.w - w) / p.w < 0.02);
}

function engineFitPanels(): FigurePanel[] {
  const xs = logXs();
  return [
    {
      id: 'mag', title: '|G| (log)', x: 'ω (rad/s, log)', y: '|G| (rpm per unit throttle, log)',
      draw(g, w, h, v) {
        wipe(g, w, h);
        const showOff = v.delay !== false;
        const probe = 10 ** Number(v.w ?? 0.47);
        const magOn = xs.map((lw) => Math.log10(Math.max(1e-6, engineFitAt(10 ** lw, true).mag)));
        const magOff = xs.map((lw) => Math.log10(Math.max(1e-6, engineFitAt(10 ** lw, false).mag)));
        const yr: [number, number] = [-0.2, Math.log10(400)];
        const head = 22, foot = 16;
        g.save(); g.translate(0, head);
        const fr = rangeFrame(w, h - head - foot, [W_MIN, W_MAX], yr, 50, 12, 14, 44);
        graphAxes(g, fr, [W_MIN, W_MAX], yr, 'ω (rad/s)', '|G|', 0.5, 1,
          (x) => fmtPow10(x), (y) => fmtPow10(y));
        curve(g, fr, xs, magOn, col.a(), 2);
        if (showOff) curve(g, fr, xs, magOff, col.muted(), 1.5, [5, 4]);
        for (const p of FIT_POINTS) {
          g.fillStyle = col.e();
          g.beginPath(); g.arc(fr.X(Math.log10(p.w)), fr.Y(Math.log10(p.mag)), 4, 0, Math.PI * 2); g.fill();
        }
        const lw = Math.log10(probe);
        g.strokeStyle = col.e(); g.lineWidth = 1; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(fr.X(lw), fr.box.t); g.lineTo(fr.X(lw), fr.box.b); g.stroke(); g.setLineDash([]);
        g.restore();
        const curveM = engineFitAt(probe, true).mag;
        const pt = nearPoint(probe);
        const bits = [`ω = ${probe.toPrecision(3)}`, `|G| curve ${curveM.toFixed(2)}`];
        if (pt) bits.push(`point ${pt.mag.toFixed(2)}`);
        text(g, bits.join('  ·  '), 8, 14, col.text(), 'left', 10);
        corner(g, w, h);
      },
    },
    {
      id: 'phase', title: 'phase (°)', x: 'ω (rad/s, log)', y: 'phase (°)',
      draw(g, w, h, v) {
        wipe(g, w, h);
        const showOff = v.delay !== false;
        const probe = 10 ** Number(v.w ?? 0.47);
        const phOn = unwrap(xs.map((lw) => engineFitAt(10 ** lw, true).plotPhase));
        const phOff = unwrap(xs.map((lw) => engineFitAt(10 ** lw, false).plotPhase));
        const yr: [number, number] = [-240, 20];
        const head = 22, foot = 16;
        g.save(); g.translate(0, head);
        const fr = rangeFrame(w, h - head - foot, [W_MIN, W_MAX], yr, 50, 12, 14, 44);
        graphAxes(g, fr, [W_MIN, W_MAX], yr, 'ω (rad/s)', 'phase (°)', 0.5, 45,
          (x) => fmtPow10(x), (y) => String(y));
        curve(g, fr, xs, phOn, col.a(), 2);
        if (showOff) curve(g, fr, xs, phOff, col.muted(), 1.5, [5, 4]);
        for (const p of FIT_POINTS) {
          g.fillStyle = col.e();
          g.beginPath(); g.arc(fr.X(Math.log10(p.w)), fr.Y(p.plotPhase), 4, 0, Math.PI * 2); g.fill();
        }
        const lw = Math.log10(probe);
        g.strokeStyle = col.e(); g.lineWidth = 1; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(fr.X(lw), fr.box.t); g.lineTo(fr.X(lw), fr.box.b); g.stroke(); g.setLineDash([]);
        g.restore();
        const curveP = engineFitAt(probe, true);
        const pt = nearPoint(probe);
        const bits = [`ω = ${probe.toPrecision(3)}`, `curve ${curveP.plotPhase.toFixed(2)}°`];
        if (pt) bits.push(`point ${pt.plotPhase.toFixed(2)}°`);
        text(g, bits.join('  ·  '), 8, 14, col.text(), 'left', 10);
        corner(g, w, h);
      },
    },
  ];
}

export const engineFitFigure = figureOf(() => engineFitPanels());
