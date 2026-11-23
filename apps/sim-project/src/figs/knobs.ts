/** Figure `knobs`: one machine, one knob, arrows for what got better or worse. */
import { figureOf, drawStepResponse, col, text, wipe, type FigurePanel } from '@study/core';
import { f, num, str, type V } from './util';
import { MOTOR } from '../model/params';
import { borerPush, borerStep, diskSeek, diskShock, engineMargins, engineStep, motorNumbers, tuner, diskKaMax } from '../model/plants';

type Row = { name: string; base: number; live: number; better: 'up' | 'down' | 'flat'; unit: string };

function motorAt(Ka: number, Kt: number, J: number, b: number) {
  return motorNumbers({ Ka, Kt, J, b, Kb: MOTOR.Kb });
}

function evalMotor(knob: string, x: number) {
  const scale = 10 ** x;
  const Ka = knob === 'Ka' ? MOTOR.Ka * scale : MOTOR.Ka;
  const Kt = knob === 'Kt' ? MOTOR.Kt * scale : MOTOR.Kt;
  const J = knob === 'J' ? MOTOR.J * scale : MOTOR.J;
  const b = knob === 'b' ? MOTOR.b * scale : MOTOR.b;
  const base = motorAt(MOTOR.Ka, MOTOR.Kt, MOTOR.J, MOTOR.b);
  const live = motorAt(Ka, Kt, J, b);
  const tEnd = 7;
  const t = Array.from({ length: 400 }, (_, i) => (tEnd * i) / 399);
  return {
    t, baseY: t.map(base.wc), liveY: t.map(live.wc), tEnd,
    rows: [
      { name: 'sag |ω∞|', base: Math.abs(base.wcInf), live: Math.abs(live.wcInf), better: 'down' as const, unit: 'rad/s' },
      { name: 'τ (settling ~4τ)', base: base.tauClosed, live: live.tauClosed, better: 'down' as const, unit: 's' },
    ] satisfies Row[],
    yLabel: 'closed-loop ω (rad/s)',
    kind: 'motor' as const,
  };
}

function evalBorer(knob: string, x: number) {
  const scale = 10 ** x;
  const K0 = 100, Kd0 = 11;
  const K = knob === 'K' ? K0 * scale : K0;
  const Kd = knob === 'rate gain' ? Kd0 * scale : Kd0;
  const bS = borerStep(K0, Kd0, 4, 4001), lS = borerStep(K, Kd, 4, 4001);
  const bP = borerPush(K0, Kd0, 4, 2001), lP = borerPush(K, Kd, 4, 2001);
  const z0 = 6 / Math.sqrt(K0), z1 = (1 + Kd) / (2 * Math.sqrt(K));
  return {
    t: lS.t, baseY: bS.y, liveY: lS.y, tEnd: 4,
    rows: [
      { name: 'push offset', base: 1 / K0, live: 1 / K, better: 'down' as const, unit: '' },
      { name: 'overshoot', base: bS.m.os, live: lS.m.os, better: 'down' as const, unit: '%' },
      { name: 'settling', base: bS.m.ts, live: lS.m.ts, better: 'down' as const, unit: 's' },
      { name: 'ζ (to 0)', base: z0, live: z1, better: 'up' as const, unit: '' },
    ] satisfies Row[],
    yLabel: 'command step y(t)',
  };
}

function evalDisk(knob: string, x: number) {
  const scale = 10 ** x;
  const Ka0 = 80, Ka = (knob === 'disk Ka' || knob === 'Ka') ? Ka0 * scale : Ka0;
  const cap = (k: number) => Math.min(k, diskKaMax - 1);
  const bS = diskSeek(Ka0, 3, 4001), lS = diskSeek(cap(Ka), 3, 4001);
  return {
    t: lS.t, baseY: bS.y, liveY: lS.y, tEnd: 2,
    rows: [
      { name: 'shock |offset|', base: 1 / (5 * Ka0), live: 1 / (5 * cap(Ka)), better: 'down' as const, unit: '' },
      { name: 'overshoot', base: bS.m.os, live: lS.m.os, better: 'down' as const, unit: '%' },
      { name: 'settling', base: bS.m.ts, live: lS.m.ts, better: 'down' as const, unit: 's' },
      { name: 'room to ceiling', base: diskKaMax - Ka0, live: diskKaMax - cap(Ka), better: 'up' as const, unit: '' },
    ] satisfies Row[],
    yLabel: 'seek y(t)',
  };
}

function evalEngine(knob: string, x: number) {
  const scale = 10 ** x;
  const r0 = 0.678, b0 = 0.6, P0 = 0.0042253, I0 = 0.0092411;
  let resp = r0, rob = b0, P = P0, I = I0, useTuner = true;
  if (knob === 'response time') resp = r0 * scale;
  else if (knob === 'robustness') rob = Math.min(0.9, Math.max(0.3, b0 * scale));
  else if (knob === 'P') { P = P0 * scale; useTuner = false; }
  else if (knob === 'I') { I = I0 * scale; useTuner = false; }
  const baseG = useTuner && knob !== 'P' && knob !== 'I' ? tuner(r0, b0) : { P: P0, I: I0 };
  const liveG = useTuner && knob !== 'P' && knob !== 'I' ? tuner(resp, rob) : { P, I };
  const bS = engineStep(baseG.P, baseG.I, 12, 1e-3), lS = engineStep(liveG.P, liveG.I, 12, 1e-3);
  const bM = engineMargins(baseG.P, baseG.I, undefined, undefined, undefined, undefined, 8001);
  const lM = engineMargins(liveG.P, liveG.I, undefined, undefined, undefined, undefined, 8001);
  return {
    t: lS.t, baseY: bS.y, liveY: lS.y, tEnd: 8,
    rows: [
      { name: 'steady error', base: 0, live: 0, better: 'flat' as const, unit: '' },
      { name: 'overshoot', base: bS.m.os, live: lS.m.os, better: 'down' as const, unit: '%' },
      { name: 'settling', base: bS.m.ts, live: lS.m.ts, better: 'down' as const, unit: 's' },
      { name: 'PM', base: bM.pm, live: lM.pm, better: 'up' as const, unit: '°' },
    ] satisfies Row[],
    yLabel: 'engine step (stand-in)',
  };
}

function pack(v: V) {
  const machine = str(v, 'machine', 'motor'), knob = str(v, 'knob', 'Ka'), x = num(v, 'x', 0);
  if (machine.includes('bor')) return evalBorer(knob, x);
  if (machine.includes('disk')) return evalDisk(knob, x);
  if (machine.includes('eng')) return evalEngine(knob, x);
  return evalMotor(knob, x);
}

export const knobsPanels = (): FigurePanel[] => [
  {
    id: 'plot', title: 'Main response: handout setting (grey) vs yours', x: 'time (s)', y: 'response',
    draw(g, w, h, v: V) {
      const p = pack(v);
      const allY = [...p.liveY, ...p.baseY];
      let lo = allY[0], hi = allY[0];
      for (const y of allY) { if (y < lo) lo = y; if (y > hi) hi = y; }
      const span = Math.max(hi - lo, 1e-9);
      const ref = p.liveY[p.liveY.length - 1] > 0.5 ? 1 : 0;
      const yRange: [number, number] = [Math.min(lo, ref) - 0.1 * span, Math.max(hi, ref) + 0.18 * span];
      const motor = p.yLabel.includes('ω');
      drawStepResponse(g, w, h, {
        t: p.t, y: p.liveY, ghost: { t: p.t, y: p.baseY, label: 'handout setting' },
        tEnd: p.tEnd, color: col.a(), yLabel: p.yLabel, ref,
        yRange, show: motor ? {} : { overshoot: true, settling: true },
      });
    },
  },
  {
    id: 'arrows', title: 'What got better, what got worse', x: '', y: '',
    height: 110,
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const p = pack(v);
      p.rows.forEach((r, i) => {
        const y = 18 + i * 22;
        const d = r.live - r.base, eps = Math.max(1e-9, 1e-4 * Math.abs(r.base) + 1e-6);
        const changed = Math.abs(d) > eps;
        const improved = !changed ? 'flat' : (r.better === 'flat' ? 'flat' : (r.better === 'down' ? d < 0 : d > 0));
        const color = !changed || improved === 'flat' ? col.muted() : improved === true ? col.ok() : col.bad();
        const arrow = !changed || improved === 'flat' ? '→' : improved === true ? '↑' : '↓';
        // J leaves sag unchanged: grey
        text(g, `${r.name}`, 10, y, col.text(), 'left', 11);
        text(g, `${f(r.base, 4)}  →  ${f(r.live, 4)} ${r.unit}   ${arrow}`, 160, y, color, 'left', 11);
      });
    },
  },
];
export const knobsFigure = figureOf(() => knobsPanels());
