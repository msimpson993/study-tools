/** Quiz / map-pop-up figure renderers (`lab-*`), registered as quizFigures. */
import { col, text, wipe, rangeFrame, graphAxes, curve, tline, dot, type QuizFigureRegistry, type QuizFigureParams } from '@study/core';
import { C } from '@study/core/dsp';
import { drawSPlane, drawStepResponse } from '@study/core';
import { DESIGNS } from '../model/params';
import { borerPush, borerS, borerStep, borerPoles, borerZero, diskSeek, diskShock, diskPoles, engineStep, motorNumbers, tuner } from '../model/plants';
import { fmtPow10, numList, strList, wrap, drawKeyValueTable } from './util';
import { motorPlotLayout } from './motorScale';
import { drawMachine, drawTunerSliders } from './scenes';
import { drawLabDiagram } from './diagrams';

function pstr(p: QuizFigureParams, k: string, d = '') { const v = p[k]; return v === undefined ? d : String(v); }
function pnum(p: QuizFigureParams, k: string, d = 0) { const v = p[k]; return typeof v === 'number' ? v : v === undefined || v === '' ? d : Number(v); }

const labScene = {
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    drawMachine(g, w, h, pstr(p, 'machine', 'motor'));
  },
};

const labBlock = {
  aspect: 1.9,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    drawLabDiagram(g, w, h, { sys: pstr(p, 'sys', 'motor-open'), show: pstr(p, 'show', '') });
  },
};

export type LabTrace = { label: string; t: number[]; y: number[]; final?: number };

/** Build the traces for a `lab-step` figure. Exported so tests can check loop / T without a canvas. */
export function labStepSeries(p: QuizFigureParams): { traces: LabTrace[]; tEnd: number; yLabel: string } {
  const sys = pstr(p, 'sys', 'motor-open');
  if (sys === 'generic') {
    const order = pnum(p, 'order', 1);
    const t = Array.from({ length: 200 }, (_, i) => i / 40);
    const traces: LabTrace[] = [0.8, 1.6, 3].map((wn, i) => ({
      label: ['low gain', 'mid gain', 'high gain'][i],
      t,
      y: t.map((tt) => {
        if (order === 1) return 1 - Math.exp(-wn * tt);
        const z = 0.3, wd = wn * Math.sqrt(1 - z * z);
        return 1 - Math.exp(-z * wn * tt) * (Math.cos(wd * tt) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * tt));
      }),
      final: 1,
    }));
    return { traces, tEnd: 5, yLabel: '' };
  }
  const Ks = numList(p.K ?? p.Ka);
  const input = pstr(p, 'input', 'command');
  const designs = strList(p.design);
  const Is = numList(p.I);
  const P = pnum(p, 'P', 0.0042253);
  const traces: LabTrace[] = [];
  let yLabel = 'y';
  if (sys.startsWith('motor')) {
    const n = motorNumbers();
    const loopRaw = pstr(p, 'loop', '');
    const fromSys = sys.includes('closed') && !sys.includes('open');
    const mode = (loopRaw === 'open' || loopRaw === 'closed' || loopRaw === 'both')
      ? loopRaw
      : (fromSys ? 'closed' : 'open');
    const T = pnum(p, 'T', mode === 'closed' ? 0.02 : 7);
    const t = Array.from({ length: 400 }, (_, i) => (T * i) / 399);
    if (mode === 'open' || mode === 'both') traces.push({ label: 'open', t, y: t.map(n.wo), final: n.woInf });
    if (mode === 'closed' || mode === 'both') traces.push({ label: 'closed', t, y: t.map(n.wc), final: n.wcInf });
    yLabel = 'ω (rad/s)';
  } else if (sys === 'borer') {
    const ks = Ks.length ? Ks : [100];
    for (const K of ks) {
      const r = input === 'push' ? borerPush(K, 11, 4, 4001) : borerStep(K, 11, 4, 4001);
      traces.push({ label: `K = ${K}`, t: r.t, y: r.y, final: input === 'push' ? 1 / K : 1 });
    }
    yLabel = input === 'push' ? 'y (offset)' : 'y (position)';
  } else if (sys === 'disk') {
    const kas = Ks.length ? Ks : [80];
    const shock = input === 'push' || input === 'shock';
    for (const Ka of kas) {
      const r = shock ? diskShock(Ka, 2, 4001) : diskSeek(Ka, 3, 4001);
      traces.push({ label: `Ka = ${Ka}`, t: r.t, y: r.y, final: shock ? -1 / (5 * Ka) : 1 });
    }
    yLabel = 'y (head position)';
  } else if (sys === 'engine') {
    if (designs.length) {
      for (const d of designs) {
        const D = DESIGNS[d as keyof typeof DESIGNS];
        if (!D) continue;
        const r = engineStep(D.P, D.I, 12, 1e-3);
        traces.push({ label: d, t: r.t, y: r.y, final: 1 });
      }
    } else if (Is.length) {
      for (const I of Is) {
        const r = engineStep(P, I, 10, 1e-3);
        traces.push({ label: I === 0 ? 'P only' : 'P + I', t: r.t, y: r.y, final: 1 });
      }
    } else {
      const r = engineStep(P, pnum(p, 'I', 0.0092411), 10, 1e-3);
      traces.push({ label: 'step', t: r.t, y: r.y, final: 1 });
    }
    yLabel = 'speed (fraction of the step)';
  }
  const tEnd = traces.length ? Math.max(...traces.map((s) => s.t[s.t.length - 1] ?? 0)) : 1;
  return { traces, tEnd, yLabel };
}

const labStep = {
  aspect: 1.7,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    const sys = pstr(p, 'sys', 'motor-open');
    const { traces, tEnd, yLabel } = labStepSeries(p);
    wipe(g, w, h);
    if (!traces.length) return;
    const openTr = traces.find((s) => s.label === 'open');
    const closedTr = traces.find((s) => s.label === 'closed');
    const motorBoth = sys.startsWith('motor') && openTr && closedTr;
    const layout = motorBoth ? motorPlotLayout(openTr.y, closedTr.y, 'both') : undefined;
    const ys = traces.flatMap((s) => s.y);
    const finals = traces.map((s) => s.final).filter((v): v is number => v !== undefined);
    const yMin = Math.min(0, ...ys, ...finals);
    const yMax = Math.max(...ys, ...finals);
    const span = Math.max(yMax - yMin, 1e-9);
    const yr: [number, number] = layout?.main ?? [yMin - 0.08 * span, yMax + 0.16 * span];
    const insetH = layout?.inset ? Math.round(Math.max(80, h * 0.36)) : 0;
    const xName = sys === 'generic' ? '' : 'time (s)';
    const yName = sys === 'generic' ? '' : yLabel;
    const fr = rangeFrame(w, h - insetH, [0, tEnd], yr, 48, 10, 8, 26);
    graphAxes(g, fr, [0, tEnd], yr, xName, yName);
    const pal = traces[0]?.label === 'open' && traces.length > 1
      ? [col.muted(), col.a(), col.e(), col.c()]
      : [col.a(), col.muted(), col.e(), col.c()];
    traces.forEach((s, i) => {
      curve(g, fr, s.t, s.y, pal[i % pal.length], 2);
      if (s.final !== undefined) tline(g, fr, [0, s.final], [tEnd, s.final], pal[i % pal.length], 1, [5, 4]);
    });
    if (layout?.inset && layout.insetFor && insetH) {
      const tr = traces.find((s) => s.label === layout.insetFor);
      const color = layout.insetFor === 'closed' ? col.a() : col.muted();
      if (tr) {
        g.save(); g.translate(0, h - insetH);
        text(g, layout.note ?? 'y zoomed', 12, 12, col.text(), 'left', 10);
        const ifr = rangeFrame(w, insetH, [0, tEnd], layout.inset, 48, 10, 18, 22);
        graphAxes(g, ifr, [0, tEnd], layout.inset, 'time (s)', 'ω (rad/s)');
        curve(g, ifr, tr.t, tr.y, color, 2);
        if (tr.final !== undefined) tline(g, ifr, [0, tr.final], [tEnd, tr.final], color, 1, [5, 4]);
        g.restore();
      }
    }
    // legend (top-right) and a key for the dashed finals
    const lx = fr.box.r - 6;
    traces.forEach((s, i) => {
      const y = fr.box.t + 12 + i * 13;
      text(g, s.label, lx, y, pal[i % pal.length], 'right', 10);
    });
    if (traces.some((s) => s.final !== undefined) && sys !== 'generic') {
      text(g, 'dashed = final value', fr.box.l + 6, fr.box.t + 12, col.muted(), 'left', 9);
    }
  },
};

function zetaOf(re: number, im: number): number {
  const wn = Math.hypot(re, im);
  return wn > 1e-9 ? Math.abs(re) / wn : 1;
}

const labSplane = {
  aspect: 1,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    const sys = pstr(p, 'sys', 'borer');
    if (sys === 'borer') {
      const Ks = numList(p.K).length ? numList(p.K) : [100];
      const poles = Ks.flatMap((K) => borerPoles(K));
      const zeros = Ks.map((K) => borerZero(K)).filter((z): z is number => z !== null).map((z) => C(z, 0));
      drawSPlane(g, w, h, { range: 14, reCenter: -7, poles, zeros, labels: true, zetaRays: [1, 0.6] });
    } else {
      const Kas = numList(p.Ka).length ? numList(p.Ka) : [80];
      const poles = Kas.flatMap((Ka) => diskPoles(Ka).filter((q) => q.re > -40));
      const imMax = Math.max(8, ...poles.map((q) => Math.abs(q.im)));
      const reExt = Math.max(8, ...poles.map((q) => Math.abs(q.re)));
      const range = Math.max(20, imMax * 1.25, reExt * 1.15);
      const zetas = [...new Set(poles.filter((q) => Math.abs(q.im) > 0.5).map((q) => zetaOf(q.re, q.im)).map((z) => Math.abs(z) < 0.005 ? 0 : Number(z.toPrecision(2))).filter((z) => z !== 0))];
      drawSPlane(g, w, h, { range, reCenter: -range * 0.4, poles, labels: true, zetaRays: zetas.length ? zetas : undefined });
      text(g, 'coil pole at −1000 (off scale)', 8, 16, col.muted(), 'left', 9);
    }
    text(g, '× poles   ○ zeros   dashed = ζ   shaded = unstable', 8, h - 8, col.muted(), 'left', 9);
  },
};

const labSens = {
  aspect: 1.3,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    const K = pnum(p, 'K', 20), panel = pstr(p, 'panel', 'mag');
    const ws = Array.from({ length: 400 }, (_, i) => 10 ** (-1 + (4 * i) / 399));
    const pts = ws.map((ww) => borerS(K, { re: 0, im: ww }));
    if (panel === 'path') {
      wipe(g, w, h);
      const fr = rangeFrame(w, h, [-0.2, 1.15], [-0.15, 1.05], 40, 10, 8, 26);
      graphAxes(g, fr, [-0.2, 1.15], [-0.15, 1.05], 'Re S', 'Im S');
      curve(g, fr, pts.map((q) => q.re), pts.map((q) => q.im), col.a(), 2);
    } else {
      wipe(g, w, h);
      const fr = rangeFrame(w, h, [-1, 3], [-3, 0.3], 48, 10, 8, 28);
      graphAxes(g, fr, [-1, 3], [-3, 0.3], 'ω (rad/s)', '|S|', 1, 1, fmtPow10, fmtPow10);
      curve(g, fr, ws.map(Math.log10), pts.map((q) => Math.log10(Math.max(q.mag, 1e-6))), col.a(), 2);
      curve(g, fr, ws.map(Math.log10), ws.map((ww) => Math.log10(Math.max(ww / K, 1e-6))), col.muted(), 1.4, [5, 4]);
      text(g, '|S|', fr.box.l + 6, fr.box.t + 12, col.a(), 'left', 10);
      text(g, '|s/K|', fr.box.l + 6, fr.box.t + 25, col.muted(), 'left', 10);
    }
  },
};

const labTrade = {
  aspect: 1.3,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    const sys = pstr(p, 'sys', 'borer'), isDisk = sys.includes('disk');
    const Ks = Array.from({ length: 40 }, (_, i) => 5 * (isDisk ? 10 ** (i / 12) : 1 + i * 10));
    const xs: number[] = [], ys: number[] = [];
    for (const K of Ks) {
      if (isDisk) { xs.push(diskSeek(K, 3, 2001).m.os); ys.push(1 / (5 * K)); }
      else { xs.push(borerStep(K, 11, 6, 2001).m.os); ys.push(1 / K); }
    }
    wipe(g, w, h);
    const xr: [number, number] = [0, Math.max(30, ...xs)], yLog: [number, number] = [Math.log10(Math.min(...ys)), Math.log10(Math.max(...ys))];
    const fr = rangeFrame(w, h, xr, yLog, 68, 10, 8, 26);
    graphAxes(g, fr, xr, yLog, 'overshoot (%)', 'offset', 0, 1, undefined, fmtPow10);
    curve(g, fr, xs, ys.map((y) => Math.log10(y)), col.muted(), 2);
    const marks = isDisk ? [[10, 'Ka = 10'], [80, 'Ka = 80']] as const : [[20, 'K = 20'], [100, 'K = 100']] as const;
    for (const [k, lab] of marks) {
      const x = isDisk ? diskSeek(k, 3, 2001).m.os : borerStep(k, 11, 6, 2001).m.os;
      const y = isDisk ? 1 / (5 * k) : 1 / k;
      dot(g, fr, [x, Math.log10(y)], col.e(), 4);
      text(g, lab, fr.X(x) + 6, fr.Y(Math.log10(y)) - 4, col.e(), 'left', 10);
    }
  },
};

const labKnob = {
  aspect: 1.4,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    wipe(g, w, h);
    const Kas = Array.from({ length: 40 }, (_, i) => 10 ** (-1 + (3 * i) / 39));
    const ratio = Kas.map((Ka) => motorNumbers({ Ka }).ratio);
    const xr: [number, number] = [-1, 2], yr: [number, number] = [-3, 0.2];
    const fr = rangeFrame(w, h, xr, yr, 68, 10, 8, 28);
    graphAxes(g, fr, xr, yr, 'Ka', 'sag ratio', 1, 1, fmtPow10, fmtPow10);
    curve(g, fr, Kas.map(Math.log10), ratio.map((r) => Math.log10(r)), col.a(), 2);
    tline(g, fr, [-1, Math.log10(0.02)], [2, Math.log10(0.02)], col.e(), 1.2, [4, 3]);
    text(g, '0.02 (spec)', fr.box.r - 4, fr.Y(Math.log10(0.02)) - 6, col.e(), 'right', 10);
    for (const k of [7.35, 54]) {
      const r = motorNumbers({ Ka: k }).ratio;
      dot(g, fr, [Math.log10(k), Math.log10(r)], col.e(), 4);
      text(g, `Ka=${k}`, fr.X(Math.log10(k)) + 4, fr.Y(Math.log10(r)) - 6, col.e(), 'left', 9);
    }
  },
};

const labTuner = {
  aspect: 1.5,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    const resp = pnum(p, 'resp', 0.678), rob = pnum(p, 'rob', 0.6);
    const { P, I } = tuner(resp, rob);
    const r = engineStep(P, I, 10, 1e-3);
    const mid = Math.round(h * 0.32);
    drawTunerSliders(g, w, mid, resp, rob);
    g.save(); g.translate(0, mid);
    drawStepResponse(g, w, h - mid, { t: r.t, y: r.y, final: 1, ref: 1, tEnd: 8, color: col.a(), show: { overshoot: true, settling: true } });
    g.restore();
  },
};

const labTable = {
  aspect: 2.2,
  maxWidth: 640,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    wipe(g, w, h);
    if (pstr(p, 'table', 'tuner3') !== 'tuner3') return;
    const head = ['design', 'resp', 'rob', 'P', 'I', 'Tr', 'Ts', 'OS %', 'PM°', 'GM dB'];
    const rows = (Object.entries(DESIGNS) as [string, (typeof DESIGNS)[keyof typeof DESIGNS]][]).map(([k, d]) =>
      [k, String(d.resp), String(d.rob), String(d.P), String(d.I), String(d.tr), String(d.ts), String(d.os), String(d.pm), String(d.gmDb)]);
    drawKeyValueTable(g, w, h, [head, ...rows], {
      footer: 'Handout tables, pp. 3–5 (verbatim)',
      key: 'Tr rise  ·  Ts settling  ·  OS overshoot  ·  PM phase margin  ·  GM gain margin',
    });
  },
};

const labFlow = {
  aspect: 2.4,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    wipe(g, w, h);
    const steps = ['linearize', 'tune', 'Update Block', 'simulate full model'];
    const bw = (w - 40) / 4 - 10;
    const bh = Math.max(h * 0.36, 36);
    const y = h * 0.28;
    steps.forEach((s, i) => {
      const x = 16 + i * (bw + 26);
      g.strokeStyle = col.accent(); g.lineWidth = 1.6; g.strokeRect(x, y, bw, bh);
      const lines = wrap(g, s, Math.max(20, bw - 8), 10);
      const start = y + bh / 2 - ((lines.length - 1) * 12) / 2 + 4;
      lines.forEach((ln, j) => text(g, ln, x + bw / 2, start + j * 12, col.text(), 'center', 10));
      if (i < 3) { g.beginPath(); g.moveTo(x + bw, y + bh / 2); g.lineTo(x + bw + 22, y + bh / 2); g.stroke(); }
    });
    g.strokeStyle = col.muted(); g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(16 + 3 * (bw + 26) + bw / 2, y + bh);
    g.lineTo(16 + 3 * (bw + 26) + bw / 2, h * 0.82);
    g.lineTo(16 + bw / 2, h * 0.82);
    g.lineTo(16 + bw / 2, y + bh);
    g.stroke(); g.setLineDash([]);
    text(g, '↺ if it fails', w / 2, h * 0.92, col.muted(), 'center', 10);
  },
};

export const popFigures: QuizFigureRegistry = {
  'lab-scene': labScene,
  'lab-block': labBlock,
  'lab-step': labStep,
  'lab-splane': labSplane,
  'lab-sens': labSens,
  'lab-trade': labTrade,
  'lab-knob': labKnob,
  'lab-tuner': labTuner,
  'lab-table': labTable,
  'lab-flow': labFlow,
};
