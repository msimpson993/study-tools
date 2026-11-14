import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadApp, listApps, repoRoot } from '../../build/src';
import { ACTUAL_MIN_WIDTH, layoutWidth, computeGeometry, placeLabels, overlapReport, pathToRoot, edgeKey, mapHighlight } from '../src/maplayout';

const WIDTHS = [360, 390, 480, 640, 768, 900, 1024, 1150, 1280, 1400];

describe.each(listApps())('%s concept maps', (app) => {
  const { content } = loadApp(path.join(repoRoot, 'apps', app));
  for (const map of content.maps) {
    describe(`map ${map.id}`, () => {
      it.each(WIDTHS)('has no node/node, label/node or label/label overlaps at %ipx', (w) => {
        const geom = computeGeometry(map.nodes, map.edges, w);
        const labels = placeLabels(geom, map.edges, []);
        expect(overlapReport(geom, labels)).toEqual({ nodeNode: 0, labelNode: 0, labelLabel: 0 });
      });
      it('keeps every box and label inside the canvas', () => {
        for (const w of [390, 1400]) {
          const geom = computeGeometry(map.nodes, map.edges, w);
          const labels = placeLabels(geom, map.edges, []);
          for (const b of Object.values(geom.boxes)) {
            expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.w).toBeLessThanOrEqual(geom.width + 0.5);
          }
          for (const l of labels) { expect(l.x).toBeGreaterThanOrEqual(-0.5); expect(l.x + l.w).toBeLessThanOrEqual(geom.width + 0.5); }
        }
      });
      it('draws a label for every labelled edge and a path to the root from every node', () => {
        for (const w of [390, 768, 1000, 1400]) {
          const geom = computeGeometry(map.nodes, map.edges, w);
          const labels = placeLabels(geom, map.edges, []);
          const want = map.edges.filter((e) => e.label).map((e) => edgeKey(e.from, e.to));
          for (const k of want) expect(labels.some((l) => l.key === k), `label for ${k} at ${w}px`).toBe(true);
        }
        for (const n of map.nodes) expect(pathToRoot(n.id, map.edges)[0]).toBe('root');
      });
    });
  }
});

describe('mapHighlight: what a tap lights up', () => {
  // root → a → b → c, with a side branch a → d
  const edges = [{ from: 'root', to: 'a' }, { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'a', to: 'd' }];
  it('no pick lights nothing', () => {
    const h = mapHighlight(null, edges); expect([h.path, h.neigh, h.edges].map((s) => s.size)).toEqual([0, 0, 0]); expect(h.selected).toBeNull();
  });
  it('a box tap keeps the old behaviour: the box, its chain to the root, its neighbours, the chain lines', () => {
    const h = mapHighlight({ kind: 'node', id: 'c' }, edges);
    expect(h.selected).toBe('c'); expect([...h.path].sort()).toEqual(['a', 'b', 'c', 'root']); expect([...h.neigh]).toEqual([]);
    expect([...h.edges].sort()).toEqual([edgeKey('a', 'b'), edgeKey('b', 'c'), edgeKey('root', 'a')].sort());
    const m = mapHighlight({ kind: 'node', id: 'a' }, edges); expect([...m.neigh].sort()).toEqual(['b', 'd']);
  });
  it('a line tap lights everything up to the arrow: the source box and its chain exactly as a tap on the source does, plus the line; the target stays unlit', () => {
    const h = mapHighlight({ kind: 'edge', id: edgeKey('b', 'c') }, edges), src = mapHighlight({ kind: 'node', id: 'b' }, edges);
    expect([...h.path].sort()).toEqual(['a', 'b', 'root']); expect([...h.path].sort()).toEqual([...src.path].sort());
    expect(h.path.has('c'), 'the target is not lit').toBe(false); expect(h.selected).toBeNull(); expect(h.neigh.size, 'no neighbours').toBe(0);
    expect([...h.edges].sort()).toEqual([...src.edges, edgeKey('b', 'c')].sort()); expect(h.priority[0]).toBe(edgeKey('b', 'c'));
    // a line out of a branch: only its own chain, not the sibling branch
    const d = mapHighlight({ kind: 'edge', id: edgeKey('a', 'd') }, edges); expect([...d.path].sort()).toEqual(['a', 'root']); expect(d.path.has('d') || d.path.has('b')).toBe(false);
    // the first line of the map: just the root and the line
    const r = mapHighlight({ kind: 'edge', id: edgeKey('root', 'a') }, edges); expect([...r.path]).toEqual(['root']); expect([...r.edges]).toEqual([edgeKey('root', 'a')]);
  });
  it('an unknown line key (stale state) lights nothing instead of throwing', () => { const h = mapHighlight({ kind: 'edge', id: 'x__y' }, edges); expect(h.edges.size + h.path.size + h.neigh.size).toBe(0); expect(h.selected).toBeNull(); });
  it('no endpoint style exists: the source has no `ends` field and the CSS has no n-end', () => {
    const src = (f: string) => fs.readFileSync(path.join(repoRoot, 'packages/core/src', f), 'utf8');
    expect('ends' in mapHighlight({ kind: 'edge', id: edgeKey('b', 'c') }, edges)).toBe(false); expect(src('conceptmap.ts')).not.toMatch(/n-end|isEnd|hl\.ends/); expect(src('styles/core.css')).not.toMatch(/n-end/);
  });
  it('holds for every line of every shipped map: path = the source box\'s own path, target never lit, target is never on that path', () => {
    for (const app of listApps()) for (const m of loadApp(path.join(repoRoot, 'apps', app)).content.maps) for (const e of m.edges) {
      const h = mapHighlight({ kind: 'edge', id: edgeKey(e.from, e.to) }, m.edges), src = mapHighlight({ kind: 'node', id: e.from }, m.edges);
      expect([...h.path].sort(), `${e.from}→${e.to}`).toEqual([...src.path].filter((id) => id !== e.to).sort());
      expect(h.path.has(e.to)).toBe(false); expect(h.edges.has(edgeKey(e.from, e.to))).toBe(true); expect(h.selected).toBeNull(); expect(h.neigh.size).toBe(0);
      for (const k of h.edges) if (k !== edgeKey(e.from, e.to)) expect(src.edges.has(k)).toBe(true);
    }
  });
});

describe('map view: Fit to screen vs Actual size', () => {
  it('fit follows the container, actual never goes below the natural width', () => {
    for (const w of [320, 390, 640, 980, 1400]) { expect(layoutWidth('fit', w)).toBe(w); expect(layoutWidth('actual', w)).toBe(Math.max(w, ACTUAL_MIN_WIDTH)); }
  });
  it('on a phone, actual size keeps the full 184 px boxes (fit squeezes them) and is wider than the screen', () => {
    for (const app of listApps()) for (const m of loadApp(path.join(repoRoot, 'apps', app)).content.maps) {
      const fit = computeGeometry(m.nodes, m.edges, layoutWidth('fit', 374)), act = computeGeometry(m.nodes, m.edges, layoutWidth('actual', 374));
      expect(fit.nodeW).toBeLessThan(180); expect(act.nodeW).toBe(184); expect(act.width).toBeGreaterThan(374 * 2);
      expect(overlapReport(act, placeLabels(act, m.edges, []))).toEqual({ nodeNode: 0, labelNode: 0, labelLabel: 0 });
    }
  });
});
