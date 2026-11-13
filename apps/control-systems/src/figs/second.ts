import { figureOf, drawStepResponse, drawSPlane, splaneDrag, wnZeta, poleFromWnZeta } from '@study/core';
import { C, tf, step, type TF } from '@study/core/dsp';

const num = (v: Record<string, number | string | boolean>, k: string) => v[k] as number;
export const normalized = (wn: number, zeta: number): TF => tf([wn * wn], [1, 2 * zeta * wn, wn * wn]);
const polesOf = (wn: number, z: number) => (z >= 1 ? [C(-wn * (z - Math.sqrt(z * z - 1)), 0), C(-wn * (z + Math.sqrt(z * z - 1)), 0)] : [poleFromWnZeta(wn, z), (({ re, im }) => C(re, -im))(poleFromWnZeta(wn, z))]);

/** ζ and ωn: drag the pole pair in the s-plane (or use the sliders) and read the step response off it. */
export const secondFigure = figureOf((c) => [
  {
    id: 'plane', title: 'Poles in the s-plane (drag ×)', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw: (g, w, h, v) => { const wn = num(v, 'wn'), z = num(v, 'zeta'); drawSPlane(g, w, h, { range: 4, poles: polesOf(wn, z), zetaRays: [0.5, 0.707], wnCircles: [wn], handles: [poleFromWnZeta(wn, z)], labels: true }); },
    pointer: splaneDrag({ range: 4, handles: () => [{ id: 'p', s: poleFromWnZeta(num(c.values, 'wn'), num(c.values, 'zeta')) }], upperOnly: true, onDrag: (_id, s) => { const q = wnZeta(s); c.set('wn', Math.min(6, Math.max(0.3, q.wn))); c.set('zeta', Math.min(2, Math.max(0.05, q.zeta))); } }),
  },
  {
    id: 'step', title: 'Step response', x: 'time (s)', y: 'output (normalised)',
    draw: (g, w, h, v) => { const wn = num(v, 'wn'), z = num(v, 'zeta'), on = !!v.marks, tEnd = Math.max(4, Math.min(30, 9 / (z * wn))); drawStepResponse(g, w, h, { ...step(normalized(wn, z), tEnd, 600), show: { timing: on, overshoot: on, band: on, settling: on } }); },
  },
]);
