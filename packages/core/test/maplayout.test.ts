import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadApp, listApps, repoRoot } from '../../build/src';
import { edgeCrossings, edgeOverlaps, ACTUAL_MIN_WIDTH, layoutWidth, computeGeometry, placeLabels, overlapReport, pathToRoot, edgeKey, mapHighlight } from '../src/maplayout';

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

/** crossings / overlapping line pieces of the shipped maps BEFORE the crossing-minimising layout (measured on the previous layout), at widths 362 560 775 980 1400 */
const BEFORE: Record<string, [number, number][]> = {
  'control-systems/chain': [[5, 13], [9, 11], [7, 2], [3, 1], [3, 1]], 'control-systems/splane': [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  'linear-systems/overview': [[0, 1], [0, 1], [2, 0], [2, 0], [2, 0]], 'linear-systems/ops': [[37, 71], [39, 68], [55, 5], [60, 6], [53, 4]],
  'linear-systems/signals': [[28, 134], [29, 133], [24, 2], [34, 1], [15, 0]], 'pid-tuning/chain': [[21, 271], [21, 271], [47, 12], [30, 4], [39, 1]],
  'transforms/chain': [[2, 1], [2, 1], [1, 0], [1, 0], [1, 0]],
};
const WIDTHS5 = [362, 560, 775, 980, 1400];
const shipped = () => listApps().flatMap((app) => loadApp(path.join(repoRoot, 'apps', app)).content.maps.map((m) => ({ id: `${app}/${m.id}`, m })));
describe('layout: fewer crossings, every line in its own lane', () => {
  it('crossings never exceed the old layout at any width, and the busy maps lose most of them', () => {
    let before = 0, after = 0;
    for (const { id, m } of shipped()) WIDTHS5.forEach((w, i) => {
      const c = edgeCrossings(computeGeometry(m.nodes, m.edges, w)).length; before += BEFORE[id][i][0]; after += c;
      expect(c, `${id} @${w}`).toBeLessThanOrEqual(BEFORE[id][i][0]);
    });
    expect(after, `total ${after} vs ${before}`).toBeLessThan(before * 0.4);
  });
  it('lines no longer run on top of each other (the old layout stacked up to 271 pieces)', () => {
    for (const { id, m } of shipped()) WIDTHS5.forEach((w) => {
      const o = edgeOverlaps(computeGeometry(m.nodes, m.edges, w)); expect(o, `${id} @${w}`).toBeLessThanOrEqual(w < 600 ? 3 : 0);
    });
  });
  it('is deterministic (same input, same drawing) and the node order is shared by widths with the same column count', () => {
    for (const { m } of shipped()) {
      const a = computeGeometry(m.nodes, m.edges, 775), b = computeGeometry(m.nodes, m.edges, 775); expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      const rowsOf = (w: number) => { const g = computeGeometry(m.nodes, m.edges, w); return g.order.map((id) => `${id}:${g.boxes[id].row}`).join(); };
      expect(rowsOf(362)).toBe(rowsOf(560)); expect(rowsOf(775)).toBe(rowsOf(800));
    }
  });
  it('boxes never overlap and every line goes down and ends on its boxes, at every width', () => {
    for (const { id, m } of shipped()) for (const w of [320, 362, 600, 775, 980, 1200, 1400, 1800]) {
      const g = computeGeometry(m.nodes, m.edges, w), r = overlapReport(g, placeLabels(g, m.edges, [])); expect(r, `${id} @${w}`).toEqual({ nodeNode: 0, labelNode: 0, labelLabel: 0 });
      for (const e of g.edges) { const p = e.points, f = g.boxes[e.from], t = g.boxes[e.to]; expect(p[0].y).toBeCloseTo(f.y + f.h, 3); expect(p[p.length - 1].y).toBeCloseTo(t.y, 3); expect(p[0].x).toBeGreaterThan(f.x); expect(p[0].x).toBeLessThan(f.x + f.w); for (let i = 1; i < p.length; i++) expect(p[i].y).toBeGreaterThanOrEqual(p[i - 1].y - 0.01); }
    }
  });
  it('a hand-made case: the order search uncrosses two chains that start crossed', () => {
    const nodes = ['root', 'a', 'b', 'c', 'd'].map((id) => ({ id, label: id }));
    const edges = [{ from: 'root', to: 'a' }, { from: 'root', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'd' }];
    expect(edgeCrossings(computeGeometry(nodes, edges, 1000)).length).toBe(0);
  });
});
