/** Kept pid-tuning tools (problem: open vs closed loop on the old lag plant; bodepid: preview, not in LN1/2/4). */
import { figureOf, drawBode, drawStepResponse, rangeFrame, graphAxes, curve, tline, text, wipe, col, type V2 } from '@study/core';
import { legend } from './util';
import { tf, step, simulatePid, pidMetrics, pidLoopTF, pidClosedLoopTF, isStable, type PlantId, type TF } from '@study/core/dsp';

type V = Record<string, number | string | boolean>;
const num = (v: V, k: string) => v[k] as number;

/** Why feedback: a plant whose gain we got wrong, open loop (u = r) against a PI loop, with an optional push on the plant input. */
export const problemFigure = figureOf(() => {
  const P = (g: number): TF => tf([g], [0.5, 1.5, 1]);
  const runs = (v: V) => {
    const g = num(v, 'gain'), d = num(v, 'push'), T = 12, td = 6, s = step(P(1), T, 600);
    const ol = s.y.map((_, i) => { const t = s.t[i], sh = t >= td ? s.y[Math.round(((t - td) / T) * 600)] ?? 0 : 0; return g * (s.y[i] + d * sh); });
    const cl = simulatePid({ plant: P(g), Kp: 2, Ki: 2, T, dt: 0.02, dist: d ? { t: td, amp: d } : null });
    return { t: s.t, ol, cl };
  };
  const panel = (id: string, title: string, key: 'ol' | 'cl') => ({
    id, title, x: 'time (s)', y: 'output y (target r = 1)',
    draw(g: CanvasRenderingContext2D, w: number, h: number, v: V) {
      wipe(g, w, h); const r = runs(v), y = key === 'ol' ? r.ol : r.cl.y, t = key === 'ol' ? r.t : r.cl.t, yr: V2 = [0, 1.6], f = rangeFrame(w, h, [0, 12], yr, 46, 14, 10, 32);
      graphAxes(g, f, [0, 12], yr, 'time (s)', 'output y');
      tline(g, f, [0, 1], [12, 1], col.muted(), 1, [5, 4]); text(g, 'r = 1', f.box.r - 4, f.Y(1) - 8, col.muted(), 'right', 10);
      if (num(v, 'push')) { tline(g, f, [6, 0], [6, 1.6], col.c(), 1, [3, 3]); text(g, 'push', f.X(6) + 4, f.box.t + 10, col.c(), 'left', 10); }
      curve(g, f, t, y, key === 'ol' ? col.b() : col.a(), 2.4);
      const yEnd = y[y.length - 1]; text(g, `final ${yEnd.toFixed(2)}`, f.box.r - 4, f.Y(yEnd) + (yEnd > 1 ? -10 : 12), key === 'ol' ? col.b() : col.a(), 'right', 11);
    },
  });
  return [panel('ol', 'Open loop: u = r (no sensor)', 'ol'), panel('cl', 'Closed loop: PI on the measured y', 'cl')];
});

/** Loop shaping seen as Bode: gain and phase margin of Gc·G for the PID on a lag plant, next to the step it gives. */
export const bodepidFigure = figureOf(() => {
  const gains = (v: V) => ({ Kp: num(v, 'Kp'), Ki: num(v, 'Ki'), Kd: num(v, 'Kd'), N: 20 });
  const plant = (v: V) => String(v.plant ?? 'p3') as PlantId;
  return [
    { id: 'bode', title: 'Loop L = Gc·G with its margins', x: 'ω (rad/s)', y: 'dB · degrees', height: 300, draw: (g: CanvasRenderingContext2D, w: number, h: number, v: V) => {
      drawBode(g, w, h, { L: pidLoopTF(plant(v), gains(v)), wmin: 0.02, wmax: 100 });
      // the key on the plot itself: magnitude and phase curves, and the two margin bars (drawBode's split: top 52 % magnitude)
      const hTop = Math.round((h - 8) * 0.52), hb = { box: { l: 46, t: hTop + 8 + 6, r: w - 12, b: h - 38 } };
      legend(g, { box: { l: 46, t: 8, r: w - 12, b: hTop - 6 } }, [{ label: '|L| (dB)', color: col.a() }, { label: 'gain margin (bar to 0 dB)', color: col.c() }], 'tr', 9.5);
      legend(g, hb, [{ label: 'phase of L', color: col.b() }, { label: 'phase margin (bar from −180°)', color: col.ok() }], 'bl', 9.5);
    } },
    {
      id: 'step', title: 'Closed-loop step response', x: 'time (s)', y: 'output', height: 300,
      draw: (g: CanvasRenderingContext2D, w: number, h: number, v: V) => {
        const T = pidClosedLoopTF(plant(v), gains(v)), ok = isStable(T), tEnd = plant(v) === 'p3' ? 30 : 12, r = step(T, tEnd, 800);
        drawStepResponse(g, w, h, { ...r, yRange: [-0.2, 2], show: { overshoot: ok, settling: ok, band: ok } });
      },
    },
  ];
});
