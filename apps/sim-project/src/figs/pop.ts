/** Quiz / map-pop-up figure renderers (`lab-*`), registered as quizFigures. */
import { col, text, wipe, rangeFrame, graphAxes, curve, tline, dot, type QuizFigureRegistry, type QuizFigureParams } from '@study/core';
import { C } from '@study/core/dsp';
import { drawSPlane, drawStepResponse } from '@study/core';
import { DESIGNS } from '../model/params';
import { borerPush, borerS, borerStep, borerPoles, borerZero, diskSeek, diskShock, diskPoles, engineStep, motorNumbers, simEngine, tuner, metrics } from '../model/plants';
import { f, numList, strList } from './util';
import { drawMachine, drawTunerSliders } from './scenes';
function pstr(p: QuizFigureParams, k: string, d = '') { const v = p[k]; return v === undefined ? d : String(v); }
function pnum(p: QuizFigureParams, k: string, d = 0) { const v = p[k]; return typeof v === 'number' ? v : v === undefined || v === '' ? d : Number(v); }

const labScene = {
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    drawMachine(g, w, h, pstr(p, 'machine', 'motor'));
  },
};

const labBlock = {
  aspect: 1.8,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    wipe(g, w, h);
    const sys = pstr(p, 'sys', 'motor-open');
    const show = pstr(p, 'show', '');
    text(g, sys, 8, 14, col.muted(), 'left', 10);
    const boxes = sys.includes('motor')
      ? [['Va / Td', 20, 40], ['1/(Js+b)', 120, 40], ['ω', 240, 40]]
      : sys.includes('borer')
        ? [['R', 16, 40], ['K+11s', 90, 40], ['1/(s(s+1))', 190, 40], ['Y', 300, 40]]
        : sys.includes('disk')
          ? [['R', 10, 40], ['Ka', 70, 40], ['coil', 140, 40], ['arm', 220, 40], ['Y', 300, 40]]
          : [['rpm*', 16, 40], ['PI', 90, 40], ['engine', 190, 40], ['rpm', 300, 40]];
    boxes.forEach((b, i) => {
      const x = Number(b[1]), y = Number(b[2]);
      g.strokeStyle = col.text(); g.lineWidth = 1.5;
      g.strokeRect(x, y, 70, 28);
      text(g, String(b[0]), x + 35, y + 18, col.text(), 'center', 10);
      if (i < boxes.length - 1) {
        const x2 = Number(boxes[i + 1][1]);
        g.beginPath(); g.moveTo(x + 70, y + 14); g.lineTo(x2, y + 14); g.stroke();
      }
    });
    if (show === 'script') text(g, 'tf  ·  series  ·  parallel  ·  feedback', 8, h - 10, col.muted(), 'left', 10);
  },
};

const labStep = {
  aspect: 1.7,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    const sys = pstr(p, 'sys', 'motor-open');
    if (sys === 'generic') {
      wipe(g, w, h);
      const order = pnum(p, 'order', 1);
      const t = Array.from({ length: 200 }, (_, i) => i / 40);
      const traces = [0.8, 1.6, 3].map((wn) => t.map((tt) => {
        if (order === 1) return 1 - Math.exp(-wn * tt);
        const z = 0.3, wd = wn * Math.sqrt(1 - z * z);
        return 1 - Math.exp(-z * wn * tt) * (Math.cos(wd * tt) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * tt));
      }));
      const fr = rangeFrame(w, h, [0, 5], [0, 1.6], 36, 10, 8, 24);
      graphAxes(g, fr, [0, 5], [0, 1.6], '', '');
      traces.forEach((y, i) => curve(g, fr, t, y, [col.muted(), col.a(), col.e()][i], 2));
      return;
    }
    const Ks = numList(p.K ?? p.Ka);
    const input = pstr(p, 'input', 'command');
    const designs = strList(p.design);
    const Is = numList(p.I);
    const P = pnum(p, 'P', 0.0042253);
    type Tr = { t: number[]; y: number[]; final?: number };
    const series: Tr[] = [];
    if (sys.startsWith('motor')) {
      const n = motorNumbers();
      const t = Array.from({ length: 300 }, (_, i) => (sys.includes('closed') ? 0.02 : 7) * i / 299);
      series.push({ t, y: t.map(sys.includes('closed') ? n.wc : n.wo), final: sys.includes('closed') ? n.wcInf : n.woInf });
    } else if (sys === 'borer') {
      const ks = Ks.length ? Ks : [100];
      for (const K of ks) {
        const r = input === 'push' ? borerPush(K, 11, 4, 4001) : borerStep(K, 11, 4, 4001);
        series.push({ t: r.t, y: r.y, final: input === 'push' ? 1 / K : 1 });
      }
    } else if (sys === 'disk') {
      const kas = Ks.length ? Ks : [80];
      for (const Ka of kas) {
        const r = input === 'push' || input === 'shock' ? diskShock(Ka, 2, 4001) : diskSeek(Ka, 3, 4001);
        series.push({ t: r.t, y: r.y, final: (input === 'push' || input === 'shock') ? -1 / (5 * Ka) : 1 });
      }
    } else if (sys === 'engine') {
      if (designs.length) {
        for (const d of designs) {
          const D = DESIGNS[d as keyof typeof DESIGNS];
          if (!D) continue;
          const r = engineStep(D.P, D.I, 12, 1e-3);
          series.push({ t: r.t, y: r.y, final: 1 });
        }
      } else if (Is.length) {
        for (const I of Is) {
          const r = engineStep(P, I, 10, 1e-3);
          series.push({ t: r.t, y: r.y, final: 1 });
        }
      } else {
        const r = engineStep(P, pnum(p, 'I', 0.0092411), 10, 1e-3);
        series.push({ t: r.t, y: r.y, final: 1 });
      }
    }
    if (!series.length) { wipe(g, w, h); return; }
    const tEnd = Math.max(...series.map((s) => s.t[s.t.length - 1]));
    const ys = series.flatMap((s) => s.y);
    const y0 = Math.min(0, ...ys), y1 = Math.max(...ys, 1);
    const fr = rangeFrame(w, h, [0, tEnd], [y0 - 0.05 * (y1 - y0), y1 + 0.1 * (y1 - y0)], 42, 10, 8, 26);
    graphAxes(g, fr, [0, tEnd], [y0, y1], 'time (s)', 'y');
    const pal = [col.a(), col.muted(), col.e(), col.c()];
    series.forEach((s, i) => {
      curve(g, fr, s.t, s.y, pal[i % pal.length], 2);
      if (s.final !== undefined) tline(g, fr, [0, s.final], [tEnd, s.final], pal[i % pal.length], 1, [5, 4]);
    });
  },
};

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
      drawSPlane(g, w, h, { range: 30, reCenter: -12, poles, labels: true, zetaRays: [0.7] });
      text(g, 'coil pole at −1000 (off scale)', 8, 16, col.muted(), 'left', 9);
    }
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
      const fr = rangeFrame(w, h, [-1, 3], [-3, 0.3], 44, 10, 8, 26);
      graphAxes(g, fr, [-1, 3], [-3, 0.3], 'log₁₀ ω', 'log₁₀ |S|');
      curve(g, fr, ws.map(Math.log10), pts.map((q) => Math.log10(Math.max(q.mag, 1e-6))), col.a(), 2);
      curve(g, fr, ws.map(Math.log10), ws.map((ww) => Math.log10(Math.max(ww / K, 1e-6))), col.muted(), 1.4, [5, 4]);
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
    const fr = rangeFrame(w, h, xr, yLog, 48, 10, 8, 26);
    graphAxes(g, fr, xr, yLog, 'overshoot (%)', 'offset (log)');
    curve(g, fr, xs, ys.map((y) => Math.log10(y)), col.muted(), 2);
    const marks = isDisk ? [10, 80] : [20, 100];
    marks.forEach((k) => {
      const x = isDisk ? diskSeek(k, 3, 2001).m.os : borerStep(k, 11, 6, 2001).m.os;
      const y = isDisk ? 1 / (5 * k) : 1 / k;
      dot(g, fr, [x, Math.log10(y)], col.e(), 4);
    });
  },
};

const labKnob = {
  aspect: 1.4,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    wipe(g, w, h);
    const Kas = Array.from({ length: 40 }, (_, i) => 10 ** (-1 + (3 * i) / 39));
    const ratio = Kas.map((Ka) => motorNumbers({ Ka }).ratio);
    const xr: [number, number] = [-1, 2], yr: [number, number] = [-3, 0.2];
    const fr = rangeFrame(w, h, xr, yr, 48, 10, 8, 26);
    graphAxes(g, fr, xr, yr, 'log₁₀ Ka', 'log₁₀ (sag ratio)');
    curve(g, fr, Kas.map(Math.log10), ratio.map((r) => Math.log10(r)), col.a(), 2);
    tline(g, fr, [-1, Math.log10(0.02)], [2, Math.log10(0.02)], col.e(), 1.2, [4, 3]);
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
  maxWidth: 560,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    wipe(g, w, h);
    if (pstr(p, 'table', 'tuner3') !== 'tuner3') return;
    const head = ['design', 'resp', 'rob', 'P', 'I', 'Tr', 'Ts', 'OS %', 'PM°', 'GM dB'];
    const rows = (Object.entries(DESIGNS) as [string, (typeof DESIGNS)[keyof typeof DESIGNS]][]).map(([k, d]) =>
      [k, String(d.resp), String(d.rob), String(d.P), String(d.I), String(d.tr), String(d.ts), String(d.os), String(d.pm), String(d.gmDb)]);
    const cw = w / head.length;
    [head, ...rows].forEach((row, i) => row.forEach((c, j) => {
      text(g, c, 4 + j * cw, 16 + i * 18, i === 0 ? col.muted() : col.text(), 'left', 9);
    }));
    text(g, 'Handout tables, pp. 3–5 (verbatim)', 4, h - 8, col.muted(), 'left', 9);
  },
};

const labFlow = {
  aspect: 2.4,
  draw(g: CanvasRenderingContext2D, w: number, h: number, p: QuizFigureParams) {
    wipe(g, w, h);
    const steps = ['linearize', 'tune', 'Update Block', 'simulate full model'];
    const bw = (w - 40) / 4 - 10;
    steps.forEach((s, i) => {
      const x = 16 + i * (bw + 26);
      g.strokeStyle = col.accent(); g.lineWidth = 1.6; g.strokeRect(x, h * 0.3, bw, h * 0.32);
      text(g, s, x + bw / 2, h * 0.3 + h * 0.18, col.text(), 'center', 10);
      if (i < 3) { g.beginPath(); g.moveTo(x + bw, h * 0.46); g.lineTo(x + bw + 22, h * 0.46); g.stroke(); }
    });
    // retry loop
    g.strokeStyle = col.muted(); g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(16 + 3 * (bw + 26) + bw / 2, h * 0.3 + h * 0.32);
    g.lineTo(16 + 3 * (bw + 26) + bw / 2, h * 0.82);
    g.lineTo(16 + bw / 2, h * 0.82);
    g.lineTo(16 + bw / 2, h * 0.3 + h * 0.32);
    g.stroke(); g.setLineDash([]);
    text(g, '↺ if it fails', w / 2, h * 0.9, col.muted(), 'center', 10);
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
