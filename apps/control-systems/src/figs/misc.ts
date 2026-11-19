/** Kept pid-tuning tools (bodepid: the dish loop's Bode plot, not in lecture notes). */
import { figureOf, drawBode, drawStepResponse, rangeFrame, graphAxes, curve, tline, text, wipe, col, type V2 } from '@study/core';
import { legend } from './util';
import { tf, step, simulatePid, isStable, type TF } from '@study/core/dsp';

type V = Record<string, number | string | boolean>;
const num = (v: V, k: string) => v[k] as number;

/** Loop shaping seen as Bode (not in lecture notes): gain and phase of L = Gc·G for the PID on the dish, 0.1/(s(s + 2)), with ideal D on the error (numbers.py [R5]), next to the step it gives. */
export const bodepidFigure = figureOf(() => {
  const loop = (v: V): { L: TF; T: TF } => {
    const Kp = num(v, 'Kp'), Ki = num(v, 'Ki'), Kd = num(v, 'Kd');
    if (!Ki) { const n = [0.1 * Kd, 0.1 * Kp]; return { L: tf(n, [1, 2, 0]), T: tf(n, [1, 2 + 0.1 * Kd, 0.1 * Kp]) }; }
    const n = [0.1 * Kd, 0.1 * Kp, 0.1 * Ki]; return { L: tf(n, [1, 2, 0, 0]), T: tf(n, [1, 2 + 0.1 * Kd, 0.1 * Kp, 0.1 * Ki]) };
  };
  return [
    { id: 'bode', title: 'Dish loop L = Gc·G with its margins', x: 'ω (rad/s)', y: 'dB · degrees', height: 300, draw: (g: CanvasRenderingContext2D, w: number, h: number, v: V) => {
      drawBode(g, w, h, { L: loop(v).L, wmin: 0.1, wmax: 1000 });
      // the key on the plot itself: magnitude and phase curves, and the two margin bars (drawBode's split: top 52 % magnitude)
      const hTop = Math.round((h - 8) * 0.52), hb = { box: { l: 46, t: hTop + 8 + 6, r: w - 12, b: h - 38 } };
      legend(g, { box: { l: 46, t: 8, r: w - 12, b: hTop - 6 } }, [{ label: '|L| (dB)', color: col.a() }, { label: 'gain margin (bar to 0 dB)', color: col.c() }], 'tr', 9.5);
      legend(g, hb, [{ label: 'phase of L', color: col.b() }, { label: 'phase margin (bar from −180°)', color: col.ok() }], 'bl', 9.5);
    } },
    {
      id: 'step', title: 'The 0.1 rad step this loop gives (D on the error)', x: 'time (s)', y: 'output / target', height: 300,
      draw: (g: CanvasRenderingContext2D, w: number, h: number, v: V) => {
        const T = loop(v).T, ok = isStable(T), r = step(T, 4, 2000);
        drawStepResponse(g, w, h, { ...r, tEnd: 4, yRange: [-0.2, 2], xLabel: 'time (s)', yLabel: 'output / target', show: { overshoot: ok, settling: ok, band: ok } });
      },
    },
  ];
});
