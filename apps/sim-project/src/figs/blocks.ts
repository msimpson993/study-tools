/** Figure `blocks`: step through a handout script, lighting the block each line builds. */
import { figureOf, col, text, wipe, type FigurePanel } from '@study/core';
import { arrow, box, str, num, type V } from './util';

type Step = { code: string; note?: string; warn?: string; frac: string; highlight: string };

const SCRIPTS: Record<string, Step[]> = {
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

function layout(kind: string): { id: string; x: number; y: number; w: number; h: number; label: string }[] {
  // normalised 0..100 box placements
  if (kind.startsWith('motor-open')) return [
    { id: 'sys1', x: 20, y: 40, w: 28, h: 18, label: '1/(Js+b)' },
    { id: 'sys2', x: 55, y: 68, w: 28, h: 16, label: 'Km·Kb/Ra' },
  ];
  if (kind.startsWith('motor-closed')) return [
    { id: 'sys2', x: 8, y: 18, w: 22, h: 14, label: 'Ka·Kt' },
    { id: 'sys3', x: 8, y: 40, w: 22, h: 14, label: 'Kb' },
    { id: 'sysa', x: 36, y: 28, w: 16, h: 14, label: '∥' },
    { id: 'sys4', x: 56, y: 28, w: 20, h: 14, label: 'Km/Ra' },
    { id: 'sys1', x: 56, y: 58, w: 24, h: 16, label: '1/(Js+b)' },
  ];
  if (kind.startsWith('borer')) return [
    { id: 'sys1', x: 10, y: 36, w: 28, h: 18, label: 'K + 11s' },
    { id: 'sysg', x: 50, y: 36, w: 32, h: 18, label: '1/(s(s+1))' },
  ];
  return [
    { id: 'sysf', x: 8, y: 36, w: 30, h: 18, label: '5000/(s+1000)' },
    { id: 'sysg', x: 52, y: 36, w: 32, h: 18, label: '1/(s(s+20))' },
  ];
}

export const blocksPanels = (/* c, def */): FigurePanel[] => [
  {
    id: 'code', title: 'The handout script, one line at a time', x: '', y: '',
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const id = str(v, 'script', 'motor-open');
      const steps = SCRIPTS[id] ?? SCRIPTS['motor-open'];
      const line = Math.max(1, Math.min(Math.round(num(v, 'line', 1)), steps.length));
      text(g, id, 8, 14, col.muted(), 'left', 10);
      const rowH = Math.min(22, (h - 24) / steps.length);
      steps.forEach((s, i) => {
        const y = 24 + i * rowH, on = i === line - 1;
        if (on) { g.fillStyle = col.e(); g.globalAlpha = 0.18; g.fillRect(4, y - 12, w - 8, rowH); g.globalAlpha = 1; }
        g.font = `11px ui-monospace, SFMono-Regular, Menlo, monospace`;
        g.fillStyle = on ? col.text() : col.muted();
        g.textAlign = 'left'; g.fillText(s.code, 10, y);
        if (on && s.warn) { text(g, '⚠ ' + s.warn, 10, y + 11, col.e(), 'left', 9); }
      });
    },
  },
  {
    id: 'diag', title: 'Block this line builds', x: 'block diagram', y: '',
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const id = str(v, 'script', 'motor-open');
      const steps = SCRIPTS[id] ?? SCRIPTS['motor-open'];
      const line = Math.max(1, Math.min(Math.round(num(v, 'line', 1)), steps.length));
      const hi = steps[line - 1].highlight;
      const built = new Set(steps.slice(0, line).map((s) => s.highlight));
      const units = layout(id);
      const X = (x: number) => 8 + (x / 100) * (w - 16), Y = (y: number) => 8 + (y / 100) * (h - 36);
      const W = (ww: number) => ww / 100 * (w - 16), H = (hh: number) => hh / 100 * (h - 36);
      // simple left-to-right arrows
      g.strokeStyle = col.muted(); g.lineWidth = 1.2;
      if (units.length >= 2) {
        const a = units[0], b = units[units.length - 1];
        arrow(g, X(a.x) - 16, Y(a.y) + H(a.h) / 2, X(a.x), Y(a.y) + H(a.h) / 2, col.muted());
        arrow(g, X(b.x) + W(b.w), Y(b.y) + H(b.h) / 2, X(b.x) + W(b.w) + 16, Y(b.y) + H(b.h) / 2, col.muted());
      }
      for (const u of units) {
        const done = built.has(u.id) || (u.id === 'sysa' && built.has('sysa')) || (hi === 'loop' || hi === 'minreal' || hi === 'sign' || hi === 'step' || hi === 'series');
        const lit = hi === u.id || (hi === 'loop' && (u.id === 'sys1' || u.id === 'sysg' || u.id === 'sys1')) || (hi === 'series' && (u.id === 'sys1' || u.id === 'sysg' || u.id === 'sysf')) || (hi === 'sysb' && (u.id === 'sys4' || u.id === 'sysa'));
        const stroke = lit ? col.e() : done ? col.text() : col.muted();
        g.lineWidth = lit ? 2.6 : 1.4;
        box(g, X(u.x), Y(u.y), W(u.w), H(u.h), u.label, stroke, lit ? undefined : undefined, 10);
      }
      if (hi === 'loop' || hi === 'minreal') {
        // feedback arc
        const y = Y(20);
        g.strokeStyle = col.e(); g.lineWidth = 1.8; g.setLineDash([]);
        g.beginPath(); g.moveTo(w - 28, Y(36) + 20); g.lineTo(w - 28, y); g.lineTo(20, y); g.stroke();
        arrow(g, 20, y, 20, Y(36) + 8, col.e());
        text(g, 'feedback', w / 2, y - 8, col.e(), 'center', 10);
      }
      text(g, steps[line - 1].highlight === 'sign' ? 'then flip the sign (load slows the output)' : '', 8, h - 8, col.muted(), 'left', 9);
    },
  },
  {
    id: 'frac', title: 'Fraction so far', x: '', y: '',
    height: 64,
    draw(g, w, h, v: V) {
      wipe(g, w, h);
      const id = str(v, 'script', 'motor-open');
      const steps = SCRIPTS[id] ?? SCRIPTS['motor-open'];
      const line = Math.max(1, Math.min(Math.round(num(v, 'line', 1)), steps.length));
      text(g, steps[line - 1].frac, w / 2, h / 2 + 4, col.text(), 'center', 14);
    },
  },
];

export const blocksFigure = figureOf(() => blocksPanels());
