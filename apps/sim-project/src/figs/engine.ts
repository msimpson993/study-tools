/** Figures `pi` and `tuner`: stand-in engine, P/I split, emulated PID Tuner. */
import { figureOf, drawStepResponse, col, text, wipe, rangeFrame, graphAxes, curve, tline, type FigurePanel } from '@study/core';
import { ENGINE, DESIGNS, type DesignName } from '../model/params';
import { engineMargins, enginePError, engineStep, simEngine, tuner, metrics, engineLoopJw } from '../model/plants';
import { f, lin, num, on, str, type V } from './util';
import { drawEngine, drawTunerSliders } from './scenes';

const nearDesign = (resp: number, rob: number): DesignName | null => {
  for (const [k, d] of Object.entries(DESIGNS) as [DesignName, (typeof DESIGNS)[DesignName]][]) {
    if (Math.abs(d.resp - resp) < 0.002 && Math.abs(d.rob - rob) < 0.005) return k;
  }
  return null;
};

export const piPanels = (): FigurePanel[] => [
  {
    id: 'speed', title: 'Unit speed step on the stand-in engine (not in lab handout)', x: 'time (s)', y: 'speed (fraction of the step)',
    draw(g, w, h, v: V) {
      const P = num(v, 'P', 0.0042), I = num(v, 'I', 0.0092);
      const r = simEngine(P, I, { T: 8, dt: 1e-3 });
      const m = metrics(r.t, r.y, 1);
      drawStepResponse(g, w, h, { t: r.t, y: r.y, final: 1, ref: 1, tEnd: 8, show: { overshoot: true, band: true, settling: true, ess: I === 0 }, color: col.a() });
      const err = I === 0 ? enginePError(P) : 0;
      text(g, I === 0 ? `P only: settles at ${f(1 - err, 3)}, error ${f(err, 3)} = 1/(1 + P·Kₑ)` : `OS ${f(m.os, 2)} %  Ts ${f(m.ts, 3)} s  (I > 0 ⇒ zero steady error)`, 50, 14, col.text(), 'left', 10);
    },
  },
  {
    id: 'throttle', title: 'Throttle split: P·e(t) and I·∫e dt', x: 'time (s)', y: 'throttle units',
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const P = num(v, 'P', 0.0042), I = num(v, 'I', 0.0092);
      const r = simEngine(P, I, { T: 8, dt: 1e-3 });
      const pPart: number[] = [], iPart: number[] = [];
      let xi = 0;
      for (let k = 0; k < r.t.length; k++) {
        const e = 1 - r.y[k];
        pPart.push(P * e); iPart.push(I * xi);
        xi += e * ENGINE.dt;
      }
      const all = [...pPart, ...iPart];
      const yr: [number, number] = [Math.min(0, ...all) * 1.1, Math.max(0.01, ...all) * 1.15];
      const fr = rangeFrame(w, h, [0, 8], yr, 48, 12, 10, 28);
      graphAxes(g, fr, [0, 8], yr, 'time (s)', 'throttle');
      curve(g, fr, r.t, pPart, col.e(), 2);
      curve(g, fr, r.t, iPart, col.c(), 2);
      text(g, 'P·e', fr.box.l + 8, fr.box.t + 12, col.e(), 'left', 10);
      text(g, 'I·∫e', fr.box.l + 8, fr.box.t + 26, col.c(), 'left', 10);
    },
  },
];
export const piFigure = figureOf(() => piPanels());

function drawEngineBode(g: CanvasRenderingContext2D, w: number, h: number, P: number, I: number) {
  wipe(g, w, h);
  const ws = lin(-2, 3, 500).map((x) => 10 ** x);
  const mag: number[] = [], ph: number[] = [];
  let prev = 0;
  for (const ww of ws) {
    const L = engineLoopJw(P, I, ww);
    mag.push(20 * Math.log10(Math.max(Math.hypot(L.re, L.im), 1e-12)));
    let a = Math.atan2(L.im, L.re);
    while (a - prev > Math.PI) a -= 2 * Math.PI;
    while (a - prev < -Math.PI) a += 2 * Math.PI;
    ph.push(a * 180 / Math.PI); prev = a;
  }
  const mrg = engineMargins(P, I, ENGINE.K, ENGINE.wn, ENGINE.zeta, ENGINE.tau, 20001);
  const gap = 8, hTop = Math.round((h - gap) * 0.52), hBot = h - gap - hTop;
  const lo = -2, hi = 3;
  const fm = rangeFrame(w, hTop, [lo, hi], [-40, 40], 48, 12, 8, 6);
  const fp = rangeFrame(w, hBot, [lo, hi], [-200, 20], 48, 12, 6, 32);
  const plot = (fr: typeof fm, xr: [number, number], yr: [number, number], xs: number[], ys: number[], ylab: string, bottom: boolean) => {
    graphAxes(g, fr, xr, yr, bottom ? 'log₁₀ ω (rad/s)' : '', ylab);
    curve(g, fr, xs, ys, col.a(), 2);
  };
  g.save();
  plot(fm, [lo, hi], [-40, 40], ws.map(Math.log10), mag, '|L| (dB)', false);
  if (Number.isFinite(mrg.wp)) tline(g, fm, [Math.log10(mrg.wp), -40], [Math.log10(mrg.wp), 40], col.e(), 1.2, [4, 3]);
  if (Number.isFinite(mrg.gm)) text(g, `GM ${f(mrg.gm, 1)} dB`, fm.box.r - 4, fm.box.t + 12, col.e(), 'right', 10);
  g.restore();
  g.save(); g.translate(0, hTop + gap);
  plot(fp, [lo, hi], [-200, 20], ws.map(Math.log10), ph, 'phase (°)', true);
  if (Number.isFinite(mrg.wc)) tline(g, fp, [Math.log10(mrg.wc), -200], [Math.log10(mrg.wc), 20], col.e(), 1.2, [4, 3]);
  if (Number.isFinite(mrg.pm)) text(g, `PM ${f(mrg.pm, 1)}° @ ${f(mrg.wc, 2)}`, fp.box.r - 4, fp.box.t + 12, col.e(), 'right', 10);
  g.restore();
}

export const tunerPanels = (): FigurePanel[] => [
  {
    id: 'scene', title: 'Engine and the two tuner sliders', x: 'picture', y: '',
    draw(g, w, h, v: V) {
      const resp = num(v, 'resp', 0.678), rob = num(v, 'rob', 0.6), t = num(v, 't', 6);
      const { P, I } = tuner(resp, rob);
      const r = simEngine(P, I, { T: 12, dt: 1e-3 });
      const i = Math.max(0, Math.min(r.t.length - 1, Math.round((t / 12) * (r.t.length - 1))));
      const mid = Math.floor(w * 0.48);
      drawEngine(g, mid, h, { y: r.y[i], u: r.u[i], label: 'Stand-in engine (not in lab handout)' });
      g.save(); g.translate(mid, 0);
      drawTunerSliders(g, w - mid, h, resp, rob);
      g.restore();
    },
  },
  {
    id: 'step', title: "Step Plot: Reference tracking (stand-in)", x: 'time (s)', y: 'speed (fraction of step)',
    draw(g, w, h, v: V) {
      const resp = num(v, 'resp', 0.678), rob = num(v, 'rob', 0.6);
      const { P, I, clamped } = tuner(resp, rob);
      const r = engineStep(P, I, 14, 1e-3);
      const hit = nearDesign(resp, rob);
      const ghost = hit ? engineStep(DESIGNS[hit].P, DESIGNS[hit].I, 14, 1e-3) : undefined;
      drawStepResponse(g, w, h, {
        t: r.t, y: r.y, final: 1, ref: 1, tEnd: 8, show: { overshoot: true, band: true, settling: true, timing: true },
        ghost: ghost && hit ? { t: ghost.t, y: ghost.y, label: `${hit} handout gains` } : undefined,
        color: col.a(),
      });
      text(g, `P = ${f(P, 7)}  I = ${f(I, 7)}${clamped ? '  (P clamped)' : ''}  OS ${f(r.m.os, 2)} %  Ts ${f(r.m.ts, 3)} s`, 50, 14, col.text(), 'left', 10);
    },
  },
  {
    id: 'bode', title: 'Loop Bode with PM and GM (exact delay)', x: 'ω (rad/s)', y: '|L| (dB) and phase (°)',
    draw(g, w, h, v: V) {
      const { P, I } = tuner(num(v, 'resp', 0.678), num(v, 'rob', 0.6));
      drawEngineBode(g, w, h, P, I);
    },
  },
  {
    id: 'table', title: 'Show Parameters (emulated) beside the handout table', x: '', y: '',
    height: 120,
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const resp = num(v, 'resp', 0.678), rob = num(v, 'rob', 0.6), show = on(v, 'hand');
      const { P, I } = tuner(resp, rob);
      const r = engineStep(P, I, 14, 1e-3);
      const mrg = engineMargins(P, I, ENGINE.K, ENGINE.wn, ENGINE.zeta, ENGINE.tau, 20001);
      const hit = nearDesign(resp, rob);
      const cols = ['', 'P', 'I', 'Tr', 'Ts', 'OS %', 'peak', 'GM dB', 'PM °', 'stable'];
      const ours = ['emulated', f(P, 7), f(I, 7), f(r.m.tr, 3), f(r.m.ts, 3), f(r.m.os, 2), f(r.m.peak, 3), f(mrg.gm, 1), f(mrg.pm, 1), (mrg.pm > 0 && mrg.gm > 0) ? 'yes' : 'no'];
      const rows = [cols, ours];
      if (show && hit) {
        const d = DESIGNS[hit];
        rows.push(['handout', String(d.P), String(d.I), String(d.tr), String(d.ts), String(d.os), String(d.peak), String(d.gmDb), String(d.pm), 'yes']);
      }
      const cw = w / cols.length;
      rows.forEach((row, i) => row.forEach((cell, j) => {
        text(g, cell, 4 + j * cw, 16 + i * 16, i === 0 ? col.muted() : col.text(), 'left', 10);
      }));
      text(g, 'Stand-in engine and emulated tuner (not in lab handout)', 4, h - 8, col.muted(), 'left', 9);
    },
  },
];
export const tunerFigure = figureOf(() => tunerPanels());
