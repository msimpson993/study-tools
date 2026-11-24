/** Lab block diagrams: summing junctions, feedback paths, disturbance inputs, optional script tags. */
import { col, text, wipe } from '@study/core';
import { arrow, box, wrap } from './util';

export type LabSys = 'motor-open' | 'motor-closed' | 'borer' | 'disk' | 'engine';

export type ScriptLine = { code: string; note?: string; warn?: string; frac: string; highlight: string };

export const SCRIPTS: Record<string, ScriptLine[]> = {
  'motor-open': [
    { code: 'Ra=1; Km=10; J=2; b=0.5; Kb=0.1;', warn: 'handout has f=0.5; b is undefined', frac: 'parameters', highlight: 'params' },
    { code: 'num1=[1]; den1=[J,b]; sys1=tf(num1,den1);', frac: '1/(Js + b) = 1/(2s + 0.5)', highlight: 'sys1' },
    { code: 'num2=[Km*Kb/Ra]; den2=[1]; sys2=tf(num2,den2);', frac: 'Km·Kb/Ra = 1', highlight: 'sys2' },
    { code: 'sys_o=feedback(sys1,sys2);', frac: '1/(2s + 0.5 + 1) = 1/(2s + 1.5)', highlight: 'loop' },
    { code: 'sys_o=-sys_o', frac: '−1/(2s + 1.5)', highlight: 'sign' },
    { code: '[yo,T]=step(sys_o);  yo(length(T))', frac: '−1/(2s + 1.5)  (step, last value)', highlight: 'step' },
  ],
  'motor-closed': [
    { code: 'Ra=1; Km=10; J=2; b=0.5; Kb=0.1; Ka=54; Kt=1;', frac: 'parameters (b=0.5, as Fig. 4.24 writes)', highlight: 'params' },
    { code: 'num1=[1]; den1=[J,b]; sys1=tf(num1,den1);', frac: '1/(Js + b)', highlight: 'sys1' },
    { code: 'num2=[Ka*Kt]; den2=[1]; sys2=tf(num2,den2);', frac: 'Ka·Kt = 54', highlight: 'sys2' },
    { code: 'num3=[Kb]; den3=[1]; sys3=tf(num3,den3);', frac: 'Kb = 0.1', highlight: 'sys3' },
    { code: 'num4=[Km/Ra]; den4=[1]; sys4=tf(num4,den4);', frac: 'Km/Ra = 10', highlight: 'sys4' },
    { code: 'sysa=parallel(sys2,sys3);', frac: 'Ka·Kt + Kb = 54.1', highlight: 'sysa' },
    { code: 'sysb=series(sysa,sys4);', frac: '(Ka·Kt + Kb)·Km/Ra = 541', highlight: 'sysb' },
    { code: 'sys_c=feedback(sys1,sysb);  sys_c=-sys_c', frac: '−1/(2s + 541.5)', highlight: 'loop' },
  ],
  'borer-step': [
    { code: 'numg=[1]; deng=[1 1 0]; sysg=tf(numg,deng);', frac: 'G = 1/(s(s + 1))', highlight: 'sysg' },
    { code: 'K1=100; num1=[11 K1]; den=[0 1]; sys1=tf(num1,den);', frac: 'Gc = K + 11s  (K = 100 shown)', highlight: 'sys1' },
    { code: 'sysa=series(sys1,sysg);', frac: 'Gc·G = (K + 11s)/(s(s + 1))', highlight: 'series' },
    { code: 'sysc=feedback(sysa,[1]);', frac: '(K + 11s)/(s² + 12s + K)', highlight: 'loop' },
  ],
  'borer-push': [
    { code: 'numg=[1]; deng=[1 1 0]; sysg=tf(numg,deng);', frac: 'G = 1/(s(s + 1))', highlight: 'sysg' },
    { code: 'K1=100; num1=[11 K1]; den=[0 1]; sys1=tf(num1,den);', frac: 'Gc = K + 11s', highlight: 'sys1' },
    { code: 'sysa=feedback(sysg,sys1);', frac: 'G/(1 + G·Gc) = 1/(s² + 12s + K)', highlight: 'loop' },
    { code: 'sysa=minreal(sysa);', frac: '1/(s² + 12s + K)  (cancelled)', highlight: 'minreal' },
  ],
  'disk-seek': [
    { code: 'Ka=10; nf=[5000]; df=[1 1000]; sysf=tf(nf,df);', frac: 'G₁ = 5000/(s + 1000)', highlight: 'sysf' },
    { code: 'ng=[1]; dg=[1 20 0]; sysg=tf(ng,dg);', frac: 'G₂ = 1/(s(s + 20))', highlight: 'sysg' },
    { code: 'sysa=series(Ka*sysf,sysg);', frac: 'Ka·G₁·G₂', highlight: 'series' },
    { code: 'sys=feedback(sysa,[1]);', frac: '5000Ka/(s³ + 1020s² + 20000s + 5000Ka)', highlight: 'loop' },
  ],
  'disk-shock': [
    { code: 'Ka=80; nf=[5000]; df=[1 1000]; sysf=tf(nf,df);', frac: 'G₁ = 5000/(s + 1000)', highlight: 'sysf' },
    { code: 'ng=[1]; dg=[1 20 0]; sysg=tf(ng,dg);', frac: 'G₂ = 1/(s(s + 20))', highlight: 'sysg' },
    { code: 'sys=feedback(sysg,Ka*sysf);', frac: 'G₂/(1 + Ka·G₁·G₂)', highlight: 'loop' },
    { code: 'sys=-sys;', frac: '−G₂/(1 + Ka·G₁·G₂)', highlight: 'sign' },
    { code: 't=[0:0.01:2]; y=step(sys,t);', frac: '−G₂/(1 + Ka·G₁·G₂)  (step)', highlight: 'step' },
  ],
};

export function scriptIdFor(sys: string): string {
  const k = normalizeSys(sys);
  if (k === 'motor-open') return 'motor-open';
  if (k === 'motor-closed') return 'motor-closed';
  if (k === 'borer') return 'borer-step';
  if (k === 'disk') return 'disk-seek';
  return '';
}

export function normalizeSys(sys: string): LabSys {
  const s = sys.toLowerCase();
  if (s.includes('motor') && s.includes('closed')) return 'motor-closed';
  if (s.includes('motor')) return 'motor-open';
  if (s.includes('borer') || s.includes('boring')) return 'borer';
  if (s.includes('disk')) return 'disk';
  return 'engine';
}

/** Structural parts — used by tests and by the renderer. */
export interface LabBlockParts {
  sys: LabSys;
  boxes: string[];
  sums: number;
  disturbances: string[];
  outputs: string[];
  hasFeedback: boolean;
  /** script snippets placed beside the blocks they build */
  scriptTags: { box: string; code: string }[];
}

export function labBlockParts(sys: string): LabBlockParts {
  const kind = normalizeSys(sys);
  if (kind === 'motor-open') {
    return {
      sys: kind,
      boxes: ['Km/Ra', '1/(Js+b)', 'Kb'],
      sums: 2,
      disturbances: ['T_d'],
      outputs: ['ω'],
      hasFeedback: true,
      scriptTags: [
        { box: '1/(Js+b)', code: 'sys1=tf([1],[J,b])' },
        { box: 'Km/Ra', code: 'num2=[Km*Kb/Ra]  (coil × back-EMF)' },
        { box: 'Kb', code: 'sys2=tf([Km*Kb/Ra],[1])' },
        { box: 'feedback', code: 'sys_o=feedback(sys1,sys2);  sys_o=-sys_o' },
      ],
    };
  }
  if (kind === 'motor-closed') {
    return {
      sys: kind,
      boxes: ['Ka', 'Km/Ra', '1/(Js+b)', 'Kt', 'Kb'],
      sums: 3,
      disturbances: ['T_d'],
      outputs: ['ω'],
      hasFeedback: true,
      scriptTags: [
        { box: '1/(Js+b)', code: 'sys1=tf([1],[J,b])' },
        { box: 'Ka', code: 'sys2=tf([Ka*Kt],[1])' },
        { box: 'Kt', code: 'sys2=tf([Ka*Kt],[1])' },
        { box: 'Kb', code: 'sys3=tf([Kb],[1])' },
        { box: 'Km/Ra', code: 'sys4=tf([Km/Ra],[1])' },
        { box: 'feedback', code: 'sysa=parallel(sys2,sys3);  sysb=series(sysa,sys4);  sys_c=feedback(sys1,sysb)' },
      ],
    };
  }
  if (kind === 'borer') {
    return {
      sys: kind,
      boxes: ['K+11s', '1/(s(s+1))'],
      sums: 2,
      disturbances: ['T_d'],
      outputs: ['Y'],
      hasFeedback: true,
      scriptTags: [
        { box: 'K+11s', code: 'sys1=tf([11 K1],[0 1])' },
        { box: '1/(s(s+1))', code: 'sysg=tf([1],[1 1 0])' },
        { box: 'feedback', code: 'sysa=series(sys1,sysg);  sysc=feedback(sysa,[1])' },
      ],
    };
  }
  if (kind === 'disk') {
    return {
      sys: kind,
      boxes: ['Ka', '5000/(s+1000)', '1/(s(s+20))'],
      sums: 2,
      disturbances: ['T_d'],
      outputs: ['Y'],
      hasFeedback: true,
      scriptTags: [
        { box: 'Ka', code: 'Ka=…' },
        { box: '5000/(s+1000)', code: 'sysf=tf([5000],[1 1000])' },
        { box: '1/(s(s+20))', code: 'sysg=tf([1],[1 20 0])' },
        { box: 'feedback', code: 'sysa=series(Ka*sysf,sysg);  sys=feedback(sysa,[1])' },
      ],
    };
  }
  return {
    sys: kind,
    boxes: ['PI', 'throttle & manifold', 'e^{−0.015s}', 'vehicle dynamics'],
    sums: 1,
    disturbances: [],
    outputs: ['rpm'],
    hasFeedback: true,
    scriptTags: [],
  };
}

export type LabelWords = 'plain words' | 'symbols' | 'values';
export interface BoxHit { id: string; x: number; y: number; w: number; h: number; tip: string }
export interface LabCaption { symbol: string; value: string; plain: string; tip: string }

export interface DrawLabOpts {
  sys: string;
  show?: string;
  /** id of the block or stage the current script line builds */
  highlight?: string;
  /** ids already built (live stepper); omit to draw the finished diagram */
  built?: Set<string>;
  /** When set, box captions switch between plain words, symbols and values (the `loop` figure). */
  words?: LabelWords;
  /** Filled with box hit-areas for hover/tap tooltips. */
  hits?: BoxHit[];
}

type Id = string;

function tone(id: Id, opts: DrawLabOpts, also?: Id[]): 'lit' | 'done' | 'wait' | 'full' {
  if (!opts.highlight && !opts.built) return 'full';
  const ids = [id, ...(also ?? [])];
  if (opts.highlight && ids.includes(opts.highlight)) return 'lit';
  // a loop / series / sign / step line lights the finished loop
  const hi = opts.highlight ?? '';
  if ((hi === 'loop' || hi === 'minreal' || hi === 'sign' || hi === 'step' || hi === 'series' || hi === 'sysb' || hi === 'sysa') && (id === 'feedback' || ids.some((x) => (opts.built ?? new Set()).has(x) || true))) {
    if (hi === 'loop' || hi === 'minreal' || hi === 'sign' || hi === 'step') {
      if (id === 'feedback') return 'lit';
    }
  }
  const built = opts.built;
  if (built && ids.some((x) => built.has(x))) return 'done';
  if (built) return 'wait';
  return 'full';
}

function stroke(t: ReturnType<typeof tone>): { color: string; width: number } {
  if (t === 'lit') return { color: col.e(), width: 2.4 };
  if (t === 'wait') return { color: col.muted(), width: 1.2 };
  return { color: col.text(), width: 1.5 };
}

function sum(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, width = 1.5) {
  g.strokeStyle = color; g.lineWidth = width; g.setLineDash([]);
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  // a light + in the middle so it reads as a summing junction
  text(g, 'Σ', x, y + 3, color, 'center', Math.max(8, r));
}

/** Arrow into a sum, with a + or − at the approach. */
function intoSum(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, sign: '+' | '−', color: string, r: number) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ex = x2 - Math.cos(ang) * (r + 1), ey = y2 - Math.sin(ang) * (r + 1);
  arrow(g, x1, y1, ex, ey, color);
  const mx = x2 - Math.cos(ang) * (r + 10), my = y2 - Math.sin(ang) * (r + 10);
  // offset the sign perpendicular so it sits beside the arrow
  const px = -Math.sin(ang) * 9, py = Math.cos(ang) * 9;
  text(g, sign, mx + px, my + py + 3, color, 'center', 10);
}

export function drawLabDiagram(g: CanvasRenderingContext2D, w: number, h: number, opts: DrawLabOpts): void {
  wipe(g, w, h);
  const kind = normalizeSys(opts.sys);
  const script = opts.show === 'script';
  const tags = script ? labBlockParts(kind).scriptTags : [];
  // a side column needs ~160 px and the diagram still needs ~220 px; otherwise put the script under the drawing
  const sideW = script && w >= 400 ? Math.min(250, Math.max(150, w * 0.32)) : 0;
  const botH = script && sideW === 0 ? Math.min(h * 0.42, 16 + tags.length * 16) : 0;
  const dw = w - sideW, dh = h - botH;

  const cap = !!opts.words && !script;
  const padL = dw < 200 ? 8 : 16, padR = dw < 200 ? 20 : 36, padT = dh < 140 ? 8 : 14, padB = (dh < 140 ? 10 : 18) + (cap ? 16 : 0);
  const X = (x: number) => padL + (x / 100) * (dw - padL - padR);
  const Y = (y: number) => padT + (y / 100) * (dh - padT - padB);
  const W = (ww: number) => (ww / 100) * (dw - padL - padR);
  const H = (hh: number) => (hh / 100) * (dh - padT - padB);
  const r = Math.max(8, Math.min(12, W(4)));

  const anchors: { id: string; x: number; y: number }[] = [];
  let typeSize = dw < 560 ? 10 : 11;

  const colorOf = (id: Id, also?: Id[]) => stroke(tone(id, opts, also));

  const pick = (lab: string | LabCaption) => {
    if (typeof lab === 'string') return lab;
    if (opts.words === 'values') return lab.value;
    if (opts.words === 'plain words') return lab.plain;
    return lab.symbol;
  };
  const boxAt = (id: Id, x: number, y: number, ww: number, hh: number, lab: string | LabCaption, also?: Id[]) => {
    const t = tone(id, opts, also), s = stroke(t);
    const px = X(x), py = Y(y), bw = W(ww), bh = H(hh);
    const label = pick(lab);
    g.lineWidth = s.width;
    // one label size on every block; wrap rather than shrinking to fit
    const sz = typeSize;
    const lines2 = wrap(g, label, Math.max(12, bw - 8), sz);
    box(g, px, py, bw, bh, '', s.color, undefined, sz);
    const lh = sz + 1;
    const y0 = py + bh / 2 - ((lines2.length - 1) * lh) / 2 + sz * 0.35;
    lines2.forEach((ln, i) => text(g, ln, px + bw / 2, y0 + i * lh, col.text(), 'center', sz));
    if (opts.hits && typeof lab !== 'string') opts.hits.push({ id, x: px, y: py, w: bw, h: bh, tip: lab.tip });
    anchors.push({ id, x: px + bw / 2, y: py + bh + 6 });
    return { x: px, y: py, w: bw, h: bh, cx: px + bw / 2, cy: py + bh / 2, r: px + bw, b: py + bh, l: px, t: py };
  };
  const L = (symbol: string, value: string, plain: string, tip: string): string | LabCaption =>
    opts.words ? { symbol, value, plain, tip } : symbol;

  const CAPTION: Record<string, string> = {
    'motor-open': 'drag felt by the load: b + Km·Kb/Ra = 1.5 N·m·s',
    'motor-closed': 'sag and time constant ÷ (1 + loop gain) = ÷ 361',
    borer: 'both responses share s² + 12s + K',
    disk: "the arm's 1/s gives zero step error",
    engine: 'nonlinear: no single transfer function; the tuner linearizes it',
  };

  const rail = 42;
  if (kind === 'motor-open') {
    // Va → ⊕ → [Km/Ra] → ⊕ → [1/(Js+b)] → ω,  Kb on the feedback, T_d into the second sum
    text(g, 'Va', X(0), Y(rail) + 3, col.text(), 'left', 11);
    const s1 = { x: X(10), y: Y(rail) };
    const coil = boxAt('sys2', 16, rail - 10, 20, 20, L('Km/Ra', '10 N·m/V', 'volts to torque', 'in: voltage Va. out: torque. what it does: turns volts into torque'), ['sys4']);
    const s2 = { x: X(48), y: Y(rail) };
    const load = boxAt('sys1', 54, rail - 10, 24, 20, L('1/(Js+b)', '1/(2s + 0.5)', 'torque to speed', 'in: net torque. out: shaft speed ω. what it does: inertia and friction turn torque into speed'));
    const outX = X(92), outY = Y(rail);
    text(g, 'ω', outX + 8, outY + 4, col.text(), 'left', 12);
    const c1 = colorOf('sys2', ['sys4']), c2 = colorOf('sys1'), cf = colorOf('feedback', ['loop', 'sign', 'step']);
    sum(g, s1.x, s1.y, r, c1.color, c1.width);
    sum(g, s2.x, s2.y, r, c2.color, c2.width);
    intoSum(g, X(4), Y(rail), s1.x, s1.y, '+', c1.color, r);
    arrow(g, s1.x + r, s1.y, coil.l, coil.cy, c1.color);
    intoSum(g, coil.r, coil.cy, s2.x, s2.y, '+', c2.color, r);
    arrow(g, s2.x + r, s2.y, load.l, load.cy, c2.color);
    arrow(g, load.r, load.cy, outX, outY, cf.color);
    // T_d from above into sum2, minus
    text(g, 'T_d', s2.x, Y(8), col.text(), 'center', 11);
    intoSum(g, s2.x, Y(14), s2.x, s2.y, '−', c2.color, r);
    // feedback under, through Kb, into sum1 minus
    const kb = boxAt('sys2', 28, 74, 36, 20, L('Kb', '0.1 V·s', 'back-EMF: speed makes a voltage that fights the current', 'in: shaft speed ω. out: back-EMF voltage. what it does: the spinning motor makes a voltage that fights its own current'));
    g.strokeStyle = cf.color; g.lineWidth = cf.width; g.setLineDash([]);
    g.beginPath();
    g.moveTo(outX, outY);
    g.lineTo(outX, kb.cy);
    g.lineTo(kb.r, kb.cy);
    g.stroke();
    g.beginPath();
    g.moveTo(kb.l, kb.cy);
    g.lineTo(s1.x, kb.cy);
    g.stroke();
    intoSum(g, s1.x, kb.cy, s1.x, s1.y, '−', cf.color, r);
  } else if (kind === 'motor-closed') {
    // 0 → ⊕ → [Ka] → ⊕ → [Km/Ra] → ⊕ → [1/(Js+b)] → ω
    //      −Kt         −Kb            −T_d
    text(g, '0', X(0), Y(rail) + 3, col.text(), 'left', 11);
    const sR = { x: X(8), y: Y(rail) };
    const ka = boxAt('sys2', 14, rail - 10, 12, 20, L('Ka', '54', 'multiplies the speed shortfall', 'in: speed error (volts). out: amplifier voltage. what it does: multiplies the speed shortfall'));
    const sE = { x: X(34), y: Y(rail) };
    const coil = boxAt('sys4', 40, rail - 10, 16, 20, L('Km/Ra', '10 N·m/V', 'volts to torque', 'in: coil voltage. out: torque. what it does: turns volts into torque'), ['sysb']);
    const sT = { x: X(64), y: Y(rail) };
    const load = boxAt('sys1', 70, rail - 10, 18, 20, L('1/(Js+b)', '1/(2s + 0.5)', 'torque to speed', 'in: net torque. out: shaft speed ω. what it does: inertia and friction turn torque into speed'));
    const outX = X(96), outY = Y(rail);
    text(g, 'ω', outX + 4, outY + 4, col.text(), 'left', 12);
    const cKa = colorOf('sys2'), cCoil = colorOf('sys4', ['sysb']), cLoad = colorOf('sys1');
    const cFb = colorOf('feedback', ['loop', 'sign', 'step', 'sysa']);
    sum(g, sR.x, sR.y, r, cKa.color, cKa.width);
    sum(g, sE.x, sE.y, r, cCoil.color, cCoil.width);
    sum(g, sT.x, sT.y, r, cLoad.color, cLoad.width);
    intoSum(g, X(2), Y(rail), sR.x, sR.y, '+', cKa.color, r);
    arrow(g, sR.x + r, sR.y, ka.l, ka.cy, cKa.color);
    intoSum(g, ka.r, ka.cy, sE.x, sE.y, '+', cCoil.color, r);
    arrow(g, sE.x + r, sE.y, coil.l, coil.cy, cCoil.color);
    intoSum(g, coil.r, coil.cy, sT.x, sT.y, '+', cLoad.color, r);
    arrow(g, sT.x + r, sT.y, load.l, load.cy, cLoad.color);
    arrow(g, load.r, load.cy, outX, outY, cFb.color);
    text(g, 'T_d', sT.x, Y(8), col.text(), 'center', 11);
    intoSum(g, sT.x, Y(14), sT.x, sT.y, '−', cLoad.color, r);
    // two feedback boxes on the return: Kt under the first sum, Kb under the middle
    const kt = boxAt('sys2', 10, 72, 12, 16, L('Kt', '1 V·s', 'speed to volts', 'in: shaft speed ω. out: tachometer volts. what it does: a small generator on the shaft turns speed into volts'));
    const kb = boxAt('sys3', 36, 72, 12, 16, L('Kb', '0.1 V·s', 'back-EMF: speed makes a voltage that fights the current', 'in: shaft speed ω. out: back-EMF voltage. what it does: the spinning motor makes a voltage that fights its own current'), ['sysa']);
    const fy = Y(92);
    g.strokeStyle = cFb.color; g.lineWidth = cFb.width; g.setLineDash([]);
    g.beginPath();
    g.moveTo(outX, outY);
    g.lineTo(outX, fy);
    g.lineTo(sR.x, fy);
    g.stroke();
    // branch up through Kt into sumR
    g.beginPath(); g.moveTo(kt.cx, fy); g.lineTo(kt.cx, kt.b); g.stroke();
    g.beginPath(); g.moveTo(kt.cx, kt.t); g.lineTo(sR.x, kt.t); g.lineTo(sR.x, sR.y + r + 1); g.stroke();
    intoSum(g, sR.x, kt.t, sR.x, sR.y, '−', colorOf('sys2').color, r);
    // branch up through Kb into sumE
    g.beginPath(); g.moveTo(kb.cx, fy); g.lineTo(kb.cx, kb.b); g.stroke();
    g.beginPath(); g.moveTo(kb.cx, kb.t); g.lineTo(sE.x, kb.t); g.lineTo(sE.x, sE.y + r + 1); g.stroke();
    intoSum(g, sE.x, kb.t, sE.x, sE.y, '−', colorOf('sys3', ['sysa']).color, r);
  } else if (kind === 'borer') {
    text(g, 'R', X(0), Y(rail) + 3, col.text(), 'left', 11);
    const s1 = { x: X(10), y: Y(rail) };
    const gc = boxAt('sys1', 16, rail - 10, 22, 20, L('K + 11s', 'K = 20 or 100', 'push on the error now, plus 11 × how fast it is changing', 'in: position error. out: steering effort. what it does: push on the error now, plus 11 × how fast it is changing'));
    const s2 = { x: X(50), y: Y(rail) };
    const gplant = boxAt('sysg', 56, rail - 10, 24, 20, L('1/(s(s+1))', '1/(s(s+1))', 'effort to position', 'in: effort plus the rock T_d. out: cutter position Y. what it does: turns steering effort into position along the planned line'));
    const outX = X(94), outY = Y(rail);
    text(g, 'Y', outX + 6, outY + 4, col.text(), 'left', 12);
    const c1 = colorOf('sys1'), c2 = colorOf('sysg', ['series']), cf = colorOf('feedback', ['loop', 'minreal']);
    sum(g, s1.x, s1.y, r, c1.color, c1.width);
    sum(g, s2.x, s2.y, r, c2.color, c2.width);
    intoSum(g, X(4), Y(rail), s1.x, s1.y, '+', c1.color, r);
    arrow(g, s1.x + r, s1.y, gc.l, gc.cy, c1.color);
    intoSum(g, gc.r, gc.cy, s2.x, s2.y, '+', c2.color, r);
    arrow(g, s2.x + r, s2.y, gplant.l, gplant.cy, c2.color);
    arrow(g, gplant.r, gplant.cy, outX, outY, cf.color);
    text(g, 'T_d', s2.x, Y(8), col.text(), 'center', 11);
    intoSum(g, s2.x, Y(14), s2.x, s2.y, '+', c2.color, r);
    const fy = Y(88);
    g.strokeStyle = cf.color; g.lineWidth = cf.width; g.setLineDash([]);
    g.beginPath(); g.moveTo(outX, outY); g.lineTo(outX, fy); g.lineTo(s1.x, fy); g.lineTo(s1.x, s1.y + r + 1); g.stroke();
    intoSum(g, s1.x, fy, s1.x, s1.y, '−', cf.color, r);
  } else if (kind === 'disk') {
    text(g, 'R', X(0), Y(rail) + 3, col.text(), 'left', 11);
    const s1 = { x: X(8), y: Y(rail) };
    const ka = boxAt('Ka', 14, rail - 10, 10, 20, L('Ka', '10 or 80', 'volts per unit error', 'in: position error. out: amplifier voltage. what it does: volts per unit error'), ['series']);
    const g1 = boxAt('sysf', 28, rail - 10, 24, 20, L('G₁ = 5000/(s+1000)', '5000/(s+1000)', 'volts to force, builds in 1 ms', 'in: voltage. out: force. what it does: the coil turns volts into force; current builds in about 1 ms'), ['series']);
    const s2 = { x: X(60), y: Y(rail) };
    const g2 = boxAt('sysg', 66, rail - 10, 22, 20, L('G₂ = 1/(s(s+20))', '1/(s(s+20))', 'force to position', 'in: net force (coil minus shock). out: head position Y. what it does: the arm turns force into position'));
    const outX = X(96), outY = Y(rail);
    text(g, 'Y', outX + 4, outY + 4, col.text(), 'left', 12);
    const c1 = colorOf('Ka', ['series']), cG1 = colorOf('sysf', ['series']), cG2 = colorOf('sysg'), cf = colorOf('feedback', ['loop', 'sign', 'step']);
    sum(g, s1.x, s1.y, r, c1.color, c1.width);
    sum(g, s2.x, s2.y, r, cG2.color, cG2.width);
    intoSum(g, X(2), Y(rail), s1.x, s1.y, '+', c1.color, r);
    arrow(g, s1.x + r, s1.y, ka.l, ka.cy, c1.color);
    arrow(g, ka.r, ka.cy, g1.l, g1.cy, cG1.color);
    intoSum(g, g1.r, g1.cy, s2.x, s2.y, '+', cG2.color, r);
    arrow(g, s2.x + r, s2.y, g2.l, g2.cy, cG2.color);
    arrow(g, g2.r, g2.cy, outX, outY, cf.color);
    text(g, 'T_d', s2.x, Y(8), col.text(), 'center', 11);
    intoSum(g, s2.x, Y(14), s2.x, s2.y, '−', cG2.color, r);
    // unit sensor on the return
    const fy = Y(88);
    text(g, '1', X(8) - 14, fy - 6, colorOf('feedback').color, 'center', 10);
    g.strokeStyle = cf.color; g.lineWidth = cf.width; g.setLineDash([]);
    g.beginPath(); g.moveTo(outX, outY); g.lineTo(outX, fy); g.lineTo(s1.x, fy); g.lineTo(s1.x, s1.y + r + 1); g.stroke();
    intoSum(g, s1.x, fy, s1.x, s1.y, '−', cf.color, r);
  } else if (opts.words) {
    // engine (handout p.1): wide canvas keeps one row; on a phone, stack the plant
    // so labels stay readable instead of stretching into skinny tall boxes.
    const narrow = dw < 560;
    const c = { color: col.a(), width: 1.8 }, cf = { color: col.text(), width: 1.5 }, cd = { color: col.b(), width: 1.8 };
    if (narrow) {
      typeSize = dw < 300 ? 11 : 12;
      const boxH = 9.2;
      // leave a right margin for Tload, N, and the rpm label
      const plantX = 18, plantW = 52;
      const s1 = { x: X(14), y: Y(7.5) };
      text(g, 'Speed Ref', X(1), s1.y - r - 10, col.text(), 'left', typeSize);
      const pi = boxAt('PI', 22, 7.5 - boxH / 2, 58, boxH, L('PI', 'P + I', 'error now + so far', 'in: speed error. out: throttle command. what it does: P and I make a throttle from the error now and the error so far'));
      const th = boxAt('throttle', plantX, 22.5 - boxH / 2, plantW, boxH, L('Throttle & Manifold', 'nonlinear', 'throttle → air', 'in: throttle command and engine speed N. out: air charge. what it does: throttle angle and speed to air charge'));
      const del = boxAt('delay', plantX, 37.5 - boxH / 2, plantW, boxH, L('Induction delay', 'e^{−0.015s}', 'air arrives late', 'in: air charge. out: delayed air charge. what it does: air takes time to reach the cylinders'));
      const comb = boxAt('combustion', plantX, 52.5 - boxH / 2, plantW, boxH, L('Combustion', 'nonlinear', 'air → torque', 'in: delayed air charge and engine speed N. out: combustion torque. what it does: air charge to torque'));
      const veh = boxAt('vehicle', plantX, 67.5 - boxH / 2, plantW, boxH, L('Vehicle Dynamics', 'Teng, Tload', 'torque − load → speed', "in: combustion torque Teng and load Tload. out: engine speed (rad/s). what it does: torque minus load spins the engine"));
      const rpm = boxAt('rpm', plantX, 82.5 - boxH / 2, plantW, boxH, L('30/π', '30/π', 'rad/s to rpm', 'in: rad/s. out: rpm. what it does: converts shaft speed to rpm'));
      const outX = rpm.r + Math.max(10, W(4)), outY = rpm.cy;
      text(g, 'rpm', outX + 3, outY + 4, col.text(), 'left', typeSize);
      sum(g, s1.x, s1.y, r, c.color, c.width);
      intoSum(g, X(2), s1.y, s1.x, s1.y, '+', col.text(), r);
      arrow(g, s1.x + r, s1.y, pi.l, pi.cy, c.color);
      arrow(g, pi.cx, pi.b, th.cx, th.t, c.color);
      arrow(g, th.cx, th.b, del.cx, del.t, c.color);
      arrow(g, del.cx, del.b, comb.cx, comb.t, c.color);
      arrow(g, comb.cx, comb.b, veh.cx, veh.t, c.color);
      arrow(g, veh.cx, veh.b, rpm.cx, rpm.t, c.color);
      arrow(g, rpm.r, rpm.cy, outX, outY, cf.color);
      // Tload arrives from the right; label sits to the right of the arrow, not over the box
      const tloadX = veh.r + Math.max(12, W(4));
      arrow(g, tloadX, veh.cy, veh.r, veh.cy, cd.color);
      const tSz = Math.max(10, typeSize - 1);
      text(g, 'Tload', tloadX + 3, veh.cy - 7, col.text(), 'left', tSz);
      text(g, '(drag)', tloadX + 3, veh.cy + 8, col.text(), 'left', tSz);
      // N (shaft speed) from Vehicle Dynamics back to the two blocks that need it
      const nBus = Math.min(dw - 6, Math.max(outX + 8, tloadX + W(16)));
      g.strokeStyle = col.muted(); g.lineWidth = 1; g.setLineDash([3, 3]);
      g.beginPath();
      g.moveTo(veh.r, veh.cy); g.lineTo(nBus, veh.cy);
      g.lineTo(nBus, th.cy); g.lineTo(th.r, th.cy);
      g.stroke();
      g.beginPath(); g.moveTo(nBus, comb.cy); g.lineTo(comb.r, comb.cy); g.stroke();
      text(g, 'N', nBus - 6, (th.cy + comb.cy) / 2, col.muted(), 'right', 10);
      g.setLineDash([]);
      // measured rpm feeds back around the left edge to the summer
      const leftX = Math.max(6, Math.min(s1.x - r - 8, X(4)));
      const botY = Math.min(Y(96), h - 10);
      g.strokeStyle = cf.color; g.lineWidth = cf.width;
      g.beginPath();
      g.moveTo(outX, outY); g.lineTo(outX, botY); g.lineTo(leftX, botY); g.lineTo(leftX, s1.y); g.lineTo(s1.x - r - 1, s1.y);
      g.stroke();
      intoSum(g, leftX, s1.y, s1.x, s1.y, '−', col.text(), r);
    } else {
      const r1 = 40;
      const boxH = 26;
      const s1 = { x: X(7), y: Y(r1) };
      text(g, 'Speed Ref', X(0), Y(r1) - 18, col.text(), 'left', 10);
      const pi = boxAt('PI', 11, r1 - boxH / 2, 13, boxH, L('PI', 'P + I', 'error now + so far', 'in: speed error. out: throttle command. what it does: P and I make a throttle from the error now and the error so far'));
      const th = boxAt('throttle', 26, r1 - boxH / 2, 16, boxH, L('Throttle & Manifold', 'nonlinear', 'throttle → air', 'in: throttle command and engine speed N. out: air charge. what it does: throttle angle and speed to air charge'));
      const del = boxAt('delay', 44, r1 - boxH / 2, 14, boxH, L('Induction delay', 'e^{−0.015s}', 'air arrives late', 'in: air charge. out: delayed air charge. what it does: air takes time to reach the cylinders'));
      const comb = boxAt('combustion', 60, r1 - boxH / 2, 13, boxH, L('Combustion', 'nonlinear', 'air → torque', 'in: delayed air charge and engine speed N. out: combustion torque. what it does: air charge to torque'));
      const veh = boxAt('vehicle', 75, r1 - boxH / 2, 14, boxH, L('Vehicle Dynamics', 'Teng, Tload', 'torque − load → speed', "in: combustion torque Teng and load Tload. out: engine speed (rad/s). what it does: torque minus load spins the engine"));
      const rpm = boxAt('rpm', 91, r1 - boxH / 2, 6, boxH, L('30/π', '30/π', 'rad/s to rpm', 'in: rad/s. out: rpm. what it does: converts shaft speed to rpm'));
      const outX = rpm.r + 12, outY = rpm.cy;
      text(g, 'rpm', outX + 2, outY + 4, col.text(), 'left', 10);
      sum(g, s1.x, s1.y, r, c.color, c.width);
      intoSum(g, X(1), Y(r1), s1.x, s1.y, '+', col.text(), r);
      arrow(g, s1.x + r, s1.y, pi.l, pi.cy, c.color);
      arrow(g, pi.r, pi.cy, th.l, th.cy, c.color);
      arrow(g, th.r, th.cy, del.l, del.cy, c.color);
      // stay on one rail: the extra canvas width (fig-wide) gives each box room to wrap
      arrow(g, del.r, del.cy, comb.l, comb.cy, c.color);
      arrow(g, comb.r, comb.cy, veh.l, veh.cy, c.color);
      arrow(g, veh.r, veh.cy, rpm.l, rpm.cy, c.color);
      arrow(g, rpm.r, rpm.cy, outX, outY, cf.color);
      text(g, 'Tload (drag)', veh.cx, veh.t - 12, col.text(), 'center', 9);
      arrow(g, veh.cx, veh.t - 8, veh.cx, veh.t, cd.color);
      g.strokeStyle = col.muted(); g.lineWidth = 1; g.setLineDash([3, 3]);
      const ny = Y(14);
      g.beginPath(); g.moveTo(rpm.cx, rpm.t); g.lineTo(rpm.cx, ny); g.lineTo(th.cx, ny); g.lineTo(th.cx, th.t); g.stroke();
      g.beginPath(); g.moveTo(comb.cx, ny); g.lineTo(comb.cx, comb.t); g.stroke();
      text(g, 'N', (th.cx + comb.cx) / 2, ny - 4, col.muted(), 'center', 8);
      g.setLineDash([]);
      const fy = Y(92);
      g.strokeStyle = cf.color; g.lineWidth = cf.width; g.setLineDash([]);
      g.beginPath(); g.moveTo(outX, outY); g.lineTo(outX, fy); g.lineTo(s1.x, fy); g.lineTo(s1.x, s1.y + r + 1); g.stroke();
      intoSum(g, s1.x, fy, s1.x, s1.y, '−', col.text(), r);
    }
  } else {
    // engine (script stepper: a compact four-box path)
    text(g, 'rpm*', X(0), Y(rail) + 3, col.text(), 'left', 11);
    const s1 = { x: X(8), y: Y(rail) };
    const pi = boxAt('PI', 14, rail - 10, 10, 20, 'PI');
    const th = boxAt('throttle', 28, rail - 10, 22, 20, 'throttle & manifold');
    const del = boxAt('delay', 54, rail - 10, 16, 20, 'e^{−0.015s}');
    const veh = boxAt('vehicle', 74, rail - 10, 16, 20, 'vehicle dynamics');
    const outX = X(96), outY = Y(rail);
    text(g, 'rpm', outX + 2, outY + 4, col.text(), 'left', 11);
    const c = colorOf('PI'), cf = colorOf('feedback');
    sum(g, s1.x, s1.y, r, c.color, c.width);
    intoSum(g, X(2), Y(rail), s1.x, s1.y, '+', c.color, r);
    arrow(g, s1.x + r, s1.y, pi.l, pi.cy, c.color);
    arrow(g, pi.r, pi.cy, th.l, th.cy, c.color);
    arrow(g, th.r, th.cy, del.l, del.cy, c.color);
    arrow(g, del.r, del.cy, veh.l, veh.cy, c.color);
    arrow(g, veh.r, veh.cy, outX, outY, cf.color);
    const fy = Y(88);
    g.strokeStyle = cf.color; g.lineWidth = cf.width; g.setLineDash([]);
    g.beginPath(); g.moveTo(outX, outY); g.lineTo(outX, fy); g.lineTo(s1.x, fy); g.lineTo(s1.x, s1.y + r + 1); g.stroke();
    intoSum(g, s1.x, fy, s1.x, s1.y, '−', cf.color, r);
  }

  if (script && tags.length) {
    const mono = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    if (sideW > 0) {
      const sx = dw + 6, sw = sideW - 12;
      tags.forEach((t, i) => {
        const y = 18 + i * ((dh - 24) / Math.max(1, tags.length));
        g.font = mono;
        const lines = wrap(g, t.code, sw, 9);
        text(g, t.box, sx, y, col.muted(), 'left', 8);
        lines.forEach((ln, j) => text(g, ln, sx, y + 12 + j * 11, col.text(), 'left', 9));
      });
    } else {
      const y0 = dh + 4, sw = w - 16;
      tags.forEach((t, i) => {
        const y = y0 + i * 14;
        text(g, `${t.box}:  ${t.code}`, 8, y, col.text(), 'left', 9);
      });
    }
  }

  if (cap) {
    const msg = CAPTION[kind];
    if (msg) text(g, msg, padL, h - 6, col.muted(), 'left', 10);
  }
}
