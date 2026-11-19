/** Root dive figure: the three plants, each with a stage scrubber that rebuilds its loop one box at a time. */
import { figureOf, text, col, type FigurePanel } from '@study/core';
import { type V, num, para, wrap } from './util';
import { drawHouse, drawCorner, drawDish, drawLoop, type LoopDiagram } from './draw';

/** What each stage adds (batch 1 stages H0–H6, C0–C6, A0–A4). */
export const STAGES: Record<'house' | 'corner' | 'dish', { say: string; d: LoopDiagram | null }[]> = {
  house: [
    { say: 'H0 MODEL: two rooms, heater in room 1, heat-flow arrows', d: null },
    { say: 'H1 TF: one fraction from heater to bedroom', d: { input: 'u', output: 'x₂', sum: false, blocks: [{ label: 'G(s)', hi: true }] } },
    { say: 'H2 POLES: −0.2 and −2.2 /h', d: { input: 'u', output: 'x₂', sum: false, blocks: [{ label: '0.0036/((s + 0.2)(s + 2.2))', hi: true }] } },
    { say: 'H3 FIRST: the warming trace, τ = 5 h', d: { input: 'u', output: 'x₂', sum: false, blocks: [{ label: '0.0036/((s + 0.2)(s + 2.2))' }] } },
    { say: 'H4 DIST: thermostat dial r, cold front d at the walls', d: { input: 'r', output: 'y', blocks: [{ label: 'Gc', hi: true }, { label: 'house' }], feedback: true, dist: 'd' } },
    { say: 'H5 SENS: thinner walls, G + ΔG', d: { input: 'r', output: 'y', blocks: [{ label: 'Gc' }, { label: 'G + ΔG', hi: true }], feedback: true, dist: 'd' } },
    { say: 'H6 NOISE: sun on the thermostat, sensor error n', d: { input: 'r', output: 'y', blocks: [{ label: 'Gc' }, { label: 'house' }], feedback: true, dist: 'd', noise: 'n', hiSum: true } },
  ],
  corner: [
    { say: 'C0 SECOND: body on spring and shock, 1 kN load', d: { input: 'u', output: 'z', sum: false, blocks: [{ label: '1/(ms² + cs + k)', hi: true }] } },
    { say: 'C1 SPECS: %OS, Tₚ, Tₛ marked on the trace', d: { input: 'u', output: 'z', sum: false, blocks: [{ label: '1/(ms² + cs + k)' }] } },
    { say: 'C2 LOOP: road w; spring and shock act on w − z', d: { input: 'w', output: 'z', blocks: [{ label: 'cs + k', hi: true }, { label: '1/(ms²)' }], feedback: true, dist: '+u' } },
    { say: 'C3 STATE: gauges for height z and velocity ż', d: { input: 'u', output: 'z', blocks: [{ label: '∫', hi: true }, { label: '∫', hi: true }], feedback: { label: 'spring, shock' } } },
    { say: 'C4 SF: an actuator; both states fed back through K', d: { input: '0', output: 'z', blocks: [{ label: 'corner' }], feedback: { label: 'K = [k₁, k₂]', hi: true } } },
    { say: 'C5 OBS, SEP: a ghost body (the estimate)', d: { input: '0', output: 'z', blocks: [{ label: 'corner' }], feedback: { label: 'observer → K', hi: true } } },
    { say: 'C6 REF: ride-height dial r → N̄', d: { input: 'r', output: 'z', blocks: [{ label: 'N̄', hi: true }, { label: 'corner' }], feedback: { label: 'observer → K' } } },
  ],
  dish: [
    { say: 'A0 PGAIN: torque = Kp × pointing error', d: { input: 'r', output: 'θ', blocks: [{ label: 'Kp', hi: true }, { label: '1/(Js² + Bs)' }], feedback: true } },
    { say: 'A1 SSE: wind torque T_d on the dish', d: { input: 'r', output: 'θ', blocks: [{ label: 'Kp' }, { label: '1/(Js² + Bs)' }], feedback: true, dist: 'T_d' } },
    { say: 'A2 INT: Kp opens to Kp + Ki/s', d: { input: 'r', output: 'θ', blocks: [{ label: 'Kp + Ki/s', hi: true }, { label: '1/(Js² + Bs)' }], feedback: true, dist: 'T_d' } },
    { say: 'A3 DER: a tachometer, Kd·s on the measurement', d: { input: 'r', output: 'θ', blocks: [{ label: 'Kp + Ki/s' }, { label: '1/(Js² + Bs)' }], feedback: { label: 'Kd·s on θ', hi: true }, dist: 'T_d' } },
    { say: 'A4 TUNE: torque limit ±200 N·m', d: { input: 'r', output: 'θ', blocks: [{ label: 'PID' }, { label: 'sat ±200', hi: true }, { label: 'dish' }], feedback: true, dist: 'T_d' } },
  ],
};
/** the batch-1 stage code in front of each line ("H6 NOISE: ") is for the builders, not the reader */
const STAGE_ID = /^[HCA]\d+ [A-Z][A-Z, ]*: /;
const panelFor = (id: 'house' | 'corner' | 'dish', title: string, key: string): FigurePanel => ({
  id, title, x: '', y: '',
  draw(g, w, h, v: V) {
    g.clearRect(0, 0, w, h); const st = STAGES[id], k = Math.max(0, Math.min(st.length - 1, Math.round(num(v, key, st.length - 1)))), s = st[k], ph = h * 0.45;
    if (id === 'house') drawHouse(g, w * 0.2, 4, w * 0.6, ph - 8, { t1: 24.55, t2: 20.45, thermostat: k >= 4, sun: k >= 6, labels: false });
    else if (id === 'corner') drawCorner(g, w * 0.3, 2, w * 0.4, ph - 4, { actuator: k >= 4, ghostZ: k >= 5 ? 0.01 : undefined, labels: false });
    else drawDish(g, w * 0.25, 0, w * 0.5, ph, { theta: 0.3, ref: 0.5, wind: k >= 1, labels: false });
    if (s.d) drawLoop(g, 2, ph + 2, w - 4, h - ph - 26, s.d, 10); else text(g, '(no loop yet)', w / 2, ph + (h - ph) / 2 - 10, col.muted(), 'center', 10.5);
    const say = `Stage ${k + 1} of ${st.length}: ${s.say.replace(STAGE_ID, '')}`, nl = wrap(g, say, w - 16, 10).length;
    para(g, say, 8, h - 8 - (nl - 1) * 13, w - 16, col.e(), 10);
  },
});
export const overviewFigure = figureOf(() => [panelFor('house', 'House', 'hs'), panelFor('corner', 'Car corner', 'cs'), panelFor('dish', 'Antenna dish', 'as')]);
