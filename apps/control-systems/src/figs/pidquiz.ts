import { scopeFigure, type QuizFigureRegistry } from '@study/core';
import { simulatePid } from '@study/core/dsp';

/**
 * The quiz's "scope" plots for the three teaching plants, drawn live from the core simulator. One renderer, `pid-step`, with FIXED
 * params in quiz.yaml: { plant: p1|p2|p3, Kp, Ki?, Kd?, T, ymin, ymax, dAt?, dAmp?, ylabel? }. dAt/dAmp add a load step at the plant
 * input. The delay, sensor-lag, nonlinear, rate-limit and dead-zone scopes need LOOPSIM (not in core) and stay inline SVG.
 */
const n = (v: unknown, d: number) => (typeof v === 'number' ? v : d);
export const quizFigures: QuizFigureRegistry = {
  'pid-step': scopeFigure((p) => {
    const T = n(p.T, 30);
    const sim = simulatePid({
      plant: (p.plant as 'p1' | 'p2' | 'p3') ?? 'p2', Kp: n(p.Kp, 1), Ki: n(p.Ki, 0), Kd: n(p.Kd, 0), N: 20, T, dt: 0.01,
      dist: p.dAt != null ? { t: n(p.dAt, T / 2), amp: n(p.dAmp, -1) } : null,
    });
    return {
      xr: [0, T], yr: [n(p.ymin, 0), n(p.ymax, 1.5)], yLabel: typeof p.ylabel === 'string' ? p.ylabel : 'output y',
      hl: [1], series: [{ t: sim.t, y: sim.y }],
    };
  }),
};
