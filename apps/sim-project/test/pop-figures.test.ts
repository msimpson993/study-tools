import { describe, it, expect, vi } from 'vitest';
import { motorNumbers } from '../src/model/plants';
import { labStepSeries, popFigures } from '../src/figs/pop';
import { labBlockParts, normalizeSys, drawLabDiagram } from '../src/figs/diagrams';

vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#888' }));
vi.stubGlobal('document', { documentElement: {} });

function record(w = 720, h = 360) {
  const texts: string[] = [];
  const arcs: { x: number; y: number; r: number }[] = [];
  const state: any = { font: '11px system-ui', fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, textAlign: 'left', textBaseline: 'alphabetic' };
  const g: any = new Proxy(state, {
    get(o, k: string) {
      if (k === 'canvas') return { width: w, height: h };
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (k === 'measureText') return (s: string) => ({ width: String(s).length * 6 });
      if (k === 'fillText') return (s: string) => { texts.push(String(s)); };
      if (k === 'arc') return (x: number, y: number, r: number) => { arcs.push({ x, y, r }); };
      if (k === 'save' || k === 'restore') return () => {};
      if (k in o) return o[k];
      return () => ({ addColorStop() {} });
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  return { g: g as CanvasRenderingContext2D, texts, arcs, w, h };
}

describe('lab-step honors loop and T (Measure and correct)', () => {
  const n = motorNumbers();

  it('(a) loop=both, T=7: open and closed traces on a 7 s span; closed is nearly flat', () => {
    const a = labStepSeries({ sys: 'motor', loop: 'both', T: 7 });
    expect(a.traces.map((t) => t.label)).toEqual(['open', 'closed']);
    expect(a.tEnd).toBeCloseTo(7, 10);
    for (const t of a.traces) expect(t.t[t.t.length - 1]).toBeCloseTo(7, 8);
    const open = a.traces[0], closed = a.traces[1];
    expect(open.y[open.y.length - 1]).toBeCloseTo(n.wo(7), 6);
    expect(open.final).toBeCloseTo(n.woInf, 6);
    expect(closed.y[closed.y.length - 1]).toBeCloseTo(n.wcInf, 6);
    expect(Math.abs(open.y[open.y.length - 1])).toBeGreaterThan(0.5);
    expect(Math.abs(closed.y[closed.y.length - 1])).toBeLessThan(0.01);
    // closed barely moves on this scale compared with the open sag
    const cSpan = Math.max(...closed.y.map(Math.abs)) - Math.min(...closed.y.map(Math.abs));
    const oSpan = Math.abs(open.y[open.y.length - 1] - open.y[0]);
    expect(cSpan).toBeLessThan(oSpan * 0.05);
  });

  it('(b) loop=closed, T=0.02: only the closed curve, zoomed to 20 ms', () => {
    const b = labStepSeries({ sys: 'motor', loop: 'closed', T: 0.02 });
    expect(b.traces).toHaveLength(1);
    expect(b.traces[0].label).toBe('closed');
    expect(b.tEnd).toBeCloseTo(0.02, 10);
    expect(b.traces[0].t[b.traces[0].t.length - 1]).toBeCloseTo(0.02, 8);
    expect(b.traces[0].y[b.traces[0].y.length - 1]).toBeCloseTo(n.wc(0.02), 6);
    // a real curve, not the 7 s open-loop sag
    const span = Math.max(...b.traces[0].y.map(Math.abs)) - Math.min(...b.traces[0].y.map(Math.abs));
    expect(span).toBeGreaterThan(0.0005);
    expect(Math.abs(b.traces[0].y[b.traces[0].y.length - 1])).toBeLessThan(0.01);
  });

  it('does not treat sys: motor as closed just because loop is missing from a naive string check', () => {
    const open = labStepSeries({ sys: 'motor', loop: 'open', T: 7 });
    expect(open.traces).toHaveLength(1);
    expect(open.traces[0].label).toBe('open');
    expect(open.traces[0].y[open.traces[0].y.length - 1]).toBeCloseTo(n.wo(7), 6);
  });
});

describe('lab-block is a real diagram, not a placeholder row', () => {
  const systems = ['motor-open', 'motor-closed', 'borer', 'disk', 'engine'] as const;

  it('describes summing junctions, feedback and the expected blocks / disturbances', () => {
    for (const sys of systems) {
      const p = labBlockParts(sys);
      expect(p.hasFeedback, sys).toBe(true);
      expect(p.sums, sys).toBeGreaterThanOrEqual(1);
      expect(p.outputs.length, sys).toBeGreaterThan(0);
      if (sys !== 'engine') expect(p.disturbances, sys).toContain('T_d');
    }
    const open = labBlockParts('motor-open');
    expect(open.boxes).toEqual(expect.arrayContaining(['Km/Ra', '1/(Js+b)', 'Kb']));
    expect(open.outputs).toContain('ω');
    const closed = labBlockParts('motor-closed');
    expect(closed.boxes).toEqual(expect.arrayContaining(['Ka', 'Kt', 'Kb', 'Km/Ra', '1/(Js+b)']));
    expect(closed.sums).toBeGreaterThanOrEqual(3);
    const borer = labBlockParts('borer');
    expect(borer.boxes).toEqual(expect.arrayContaining(['K+11s', '1/(s(s+1))']));
    const disk = labBlockParts('disk');
    expect(disk.boxes).toEqual(expect.arrayContaining(['Ka', '5000/(s+1000)', '1/(s(s+20))']));
    const engine = labBlockParts('engine');
    expect(engine.boxes.join(' ')).toMatch(/PI/);
    expect(engine.boxes.join(' ')).toMatch(/delay|0\.015|manifold|vehicle/i);
  });

  it('draws sums, feedback labels and T_d, and never the debug sys name', () => {
    for (const sys of systems) {
      const rec = record();
      popFigures['lab-block'].draw(rec.g, rec.w, rec.h, { sys });
      const blob = rec.texts.join('\n');
      expect(blob, sys).not.toMatch(/\bmotor-open\b/);
      expect(blob, sys).not.toMatch(/\bmotor-closed\b/);
      expect(blob, sys).not.toContain('tf  ·  series  ·  parallel  ·  feedback');
      expect(rec.arcs.length, `${sys} summing junctions`).toBeGreaterThanOrEqual(labBlockParts(sys).sums);
      if (sys !== 'engine') expect(blob, sys).toMatch(/T_d/);
      if (sys.startsWith('motor')) expect(blob).toMatch(/ω/);
    }
  });

  it('show:script puts the handout script lines beside the blocks they build', () => {
    const rec = record(800, 400);
    popFigures['lab-block'].draw(rec.g, rec.w, rec.h, { sys: 'motor-open', show: 'script' });
    const blob = rec.texts.join('\n');
    expect(blob).toMatch(/sys1\s*=\s*tf/);
    expect(blob).toMatch(/feedback\(sys1,\s*sys2\)/);
    expect(blob).toMatch(/1\/\(Js\+b\)/);
    expect(blob).not.toMatch(/\bmotor-open\b/);
  });

  it('normalizeSys maps quiz sys names', () => {
    expect(normalizeSys('motor')).toBe('motor-open');
    expect(normalizeSys('motor-closed')).toBe('motor-closed');
    expect(normalizeSys('borer')).toBe('borer');
    expect(normalizeSys('disk')).toBe('disk');
    expect(normalizeSys('engine')).toBe('engine');
  });

  it('draws at a narrow two-up pop-up width without negative box sizes', () => {
    for (const w of [160, 180, 240, 360]) {
      for (const sys of ['motor-open', 'motor-closed', 'borer', 'disk', 'engine'] as const) {
        const rec = record(w, Math.round(w / 1.9));
        expect(() => popFigures['lab-block'].draw(rec.g, rec.w, rec.h, { sys, show: 'script' })).not.toThrow();
        expect(() => popFigures['lab-block'].draw(rec.g, rec.w, rec.h, { sys })).not.toThrow();
      }
    }
  });

  it('drawLabDiagram is the same renderer the live figure uses', () => {
    const rec = record();
    drawLabDiagram(rec.g, rec.w, rec.h, { sys: 'disk' });
    const blob = rec.texts.join('\n');
    expect(blob).toMatch(/T_d/);
    expect(blob).toMatch(/5000\/\(s\+1000\)/);
  });
});
