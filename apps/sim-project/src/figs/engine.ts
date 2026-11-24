/** Figures `pi` and `tuner`: stand-in engine, P/I split, emulated PID Tuner. */
import { figureOf, drawStepResponse, col, text, wipe, rangeFrame, graphAxes, curve, tline, withPersistentLabels, PLOT_HEAD, type FigurePanel } from '@study/core';
import { ENGINE, DESIGNS, type DesignName } from '../model/params';
import { engineMargins, enginePError, engineStep, simEngine, tuner, metrics, engineLoopJw, firstCrossing } from '../model/plants';
import { f, lin, num, on, str, fmtPow10, drawKeyValueTable, isThumb, type V } from './util';
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
      const P = num(v, 'P', 0.0042253), I = num(v, 'I', 0.0092411);
      const r = simEngine(P, I, { T: 8, dt: 1e-3 });
      const m = metrics(r.t, r.y, 1);
      const err = I === 0 ? enginePError(P) : 0;
      const head = isThumb(g) ? 0 : PLOT_HEAD;
      wipe(g, w, h);
      if (head) text(g, I === 0 ? `P only: settles at ${f(1 - err, 3)}, error ${f(err, 3)} = 1/(1 + P·Kₑ)` : `OS ${f(m.os, 2)} %  Ts ${f(m.ts, 3)} s  (I > 0 ⇒ zero steady error)`, 8, 14, col.text(), 'left', 10);
      g.save(); g.translate(0, head);
      drawStepResponse(g, w, h - head, { t: r.t, y: r.y, final: 1, ref: 1, tEnd: 8, show: { overshoot: true, band: true, settling: true, ess: I === 0 }, color: col.a() });
      g.restore();
    },
  },
  {
    id: 'throttle', title: 'Throttle split: P·e(t) and I·∫e dt', x: 'time (s)', y: 'throttle units',
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const P = num(v, 'P', 0.0042253), I = num(v, 'I', 0.0092411);
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
      const fr = rangeFrame(w, h, [0, 8], yr, 72, 12, 10, 40);
      graphAxes(g, fr, [0, 8], yr, 'time (s)', 'throttle');
      curve(g, fr, r.t, pPart, col.e(), 2);
      curve(g, fr, r.t, iPart, col.c(), 2);
      // labelled tiles and the expanded view only: bare (phone) tiles show no key
      if (!isThumb(g)) withPersistentLabels(() => {
        text(g, 'P·e', fr.box.l + 8, fr.box.t + 12, col.e(), 'left', 10);
        text(g, 'I·∫e', fr.box.l + 8, fr.box.t + 26, col.c(), 'left', 10);
      });
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
  const fm = rangeFrame(w, hTop, [lo, hi], [-40, 40], 72, 12, 16, 6);
  const fp = rangeFrame(w, hBot, [lo, hi], [-200, 20], 72, 12, 16, 32);
  const plot = (fr: typeof fm, xr: [number, number], yr: [number, number], xs: number[], ys: number[], ylab: string, bottom: boolean) => {
    graphAxes(g, fr, xr, yr, bottom ? 'ω (rad/s)' : '', ylab, 1, 0, fmtPow10);
    curve(g, fr, xs, ys, col.a(), 2);
  };
  g.save();
  plot(fm, [lo, hi], [-40, 40], ws.map(Math.log10), mag, '|L| (dB)', false);
  if (Number.isFinite(mrg.wp)) tline(g, fm, [Math.log10(mrg.wp), -40], [Math.log10(mrg.wp), 40], col.e(), 1.2, [4, 3]);
  if (Number.isFinite(mrg.gm)) text(g, `GM ${f(mrg.gm, 1)} dB`, fm.box.r - 4, Math.max(8, fm.box.t - 8), col.e(), 'right', 10);
  g.restore();
  g.save(); g.translate(0, hTop + gap);
  plot(fp, [lo, hi], [-200, 20], ws.map(Math.log10), ph, 'phase (°)', true);
  if (Number.isFinite(mrg.wc)) tline(g, fp, [Math.log10(mrg.wc), -200], [Math.log10(mrg.wc), 20], col.e(), 1.2, [4, 3]);
  if (Number.isFinite(mrg.pm)) text(g, `PM ${f(mrg.pm, 1)}° @ ${f(mrg.wc, 2)}`, fp.box.r - 4, Math.max(8, fp.box.t - 8), col.e(), 'right', 10);
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
    id: 'step', title: "Step Plot: Reference tracking (stand-in)", x: 'time (s)', y: (v) => v.rpm ? 'speed (rpm)' : 'speed (fraction of step)',
    draw(g, w, h, v: V) {
      const resp = num(v, 'resp', 0.678), rob = num(v, 'rob', 0.6);
      const { P, I, clamped } = tuner(resp, rob);
      const rpmOn = !!v.rpm;
      const thumb = isThumb(g);
      const head = thumb ? 0 : PLOT_HEAD;
      const piLine = `P = ${f(P, 7)}  I = ${f(I, 7)}${clamped ? '  (P clamped)' : ''}`;
      if (rpmOn) {
        const r = engineStep(P, I, 20, 1e-3);
        const tEnd = 15, t0 = 2;
        const tt: number[] = [], yy: number[] = [];
        for (let k = 0; k < r.t.length; k++) {
          const tau = r.t[k];
          if (tau > tEnd - t0) break;
          tt.push(t0 + tau);
          yy.push(2000 + 1000 * r.y[k]);
        }
        // hold 2000 rpm until the command at t₀, then the simulated unit-step
        const tPlot = [0, t0, ...tt], yPlot = [2000, 2000, ...yy];
        const tHit = firstCrossing(r.t, r.y, 0.98);
        wipe(g, w, h);
        if (!thumb) text(g, piLine, 8, 14, col.text(), 'left', 10);
        const cap = 'Linear stand-in, not the nonlinear Simulink engine (not in lab handout). The handout\'s scope (p.6) is the real check.';
        const capBand = thumb ? 0 : 18;
        g.save(); g.translate(0, head);
        const fr = rangeFrame(w, h - head - capBand, [0, tEnd], [1500, 3500], 72, 12, 14, 30);
        graphAxes(g, fr, [0, tEnd], [1500, 3500], 'time (s)', 'rpm', 5, 500);
        curve(g, fr, tPlot, yPlot, col.a(), 2);
        g.strokeStyle = col.e(); g.lineWidth = 1; g.setLineDash([4, 4]);
        g.beginPath(); g.moveTo(fr.box.l, fr.Y(2980)); g.lineTo(fr.box.r, fr.Y(2980)); g.stroke(); g.setLineDash([]);
        text(g, '2980 rpm (2 % band)', fr.box.r - 4, fr.Y(2980) + 12, col.e(), 'right', 10);
        if (Number.isFinite(tHit)) {
          g.fillStyle = col.e(); g.beginPath(); g.arc(fr.X(t0 + tHit), fr.Y(2980), 4, 0, Math.PI * 2); g.fill();
        }
        g.restore();
        if (!thumb && Number.isFinite(tHit)) text(g, `reaches 2980 at t₀ + ${f(tHit, 2)} s`, 8, 28, col.text(), 'left', 10);
        if (!thumb) text(g, cap, 8, h - 8, col.muted(), 'left', 9);
        return;
      }
      const r = engineStep(P, I, 14, 1e-3);
      const hit = nearDesign(resp, rob);
      const ghost = hit ? engineStep(DESIGNS[hit].P, DESIGNS[hit].I, 14, 1e-3) : undefined;
      wipe(g, w, h);
      if (!thumb) text(g, `${piLine}  OS ${f(r.m.os, 2)} %  Ts ${f(r.m.ts, 3)} s`, 8, 14, col.text(), 'left', 10);
      g.save(); g.translate(0, head);
      drawStepResponse(g, w, h - head, {
        t: r.t, y: r.y, final: 1, ref: 1, tEnd: 8, show: { overshoot: true, band: true, settling: true, timing: true },
        ghost: ghost && hit ? { t: ghost.t, y: ghost.y, label: `${hit} handout gains` } : undefined,
        color: col.a(),
      });
      g.restore();
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
    height: 230,
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
      drawKeyValueTable(g, w, h, rows, {
        footer: 'Stand-in engine and emulated tuner (not in lab handout)',
        key: 'Tr rise  ·  Ts settling  ·  OS overshoot  ·  PM phase margin  ·  GM gain margin',
      });
      g.canvas.dataset.summary = `OS ${f(r.m.os, 1)}%  Ts ${f(r.m.ts, 2)} s  PM ${f(mrg.pm, 0)}°  GM ${f(mrg.gm, 1)} dB`;
    },
  },
];
export const tunerFigure = figureOf(() => tunerPanels());
