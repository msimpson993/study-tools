import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadApp, listApps, repoRoot } from '../../build/src';
import { computeGeometry, placeLabels, overlapReport, pathToRoot, edgeKey, mapHighlight } from '../src/maplayout';

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
    const h = mapHighlight(null, edges); expect([h.path, h.neigh, h.ends, h.edges].map((s) => s.size)).toEqual([0, 0, 0, 0]); expect(h.selected).toBeNull();
  });
  it('a box tap keeps the old behaviour: the box, its chain to the root, its neighbours, the chain lines', () => {
    const h = mapHighlight({ kind: 'node', id: 'c' }, edges);
    expect(h.selected).toBe('c'); expect([...h.path].sort()).toEqual(['a', 'b', 'c', 'root']); expect([...h.neigh]).toEqual([]); expect(h.ends.size).toBe(0);
    expect([...h.edges].sort()).toEqual([edgeKey('a', 'b'), edgeKey('b', 'c'), edgeKey('root', 'a')].sort());
    const m = mapHighlight({ kind: 'node', id: 'a' }, edges); expect([...m.neigh].sort()).toEqual(['b', 'd']);
  });
  it('a line tap lights ONLY that line and its two end boxes: no chain, no selected box, no neighbours', () => {
    const h = mapHighlight({ kind: 'edge', id: edgeKey('b', 'c') }, edges);
    expect([...h.ends].sort()).toEqual(['b', 'c']); expect([...h.edges]).toEqual([edgeKey('b', 'c')]); expect(h.priority).toEqual([edgeKey('b', 'c')]);
    expect(h.selected).toBeNull(); expect(h.path.size).toBe(0); expect(h.neigh.size).toBe(0);
  });
  it('an unknown line key (stale state) lights nothing instead of throwing', () => { const h = mapHighlight({ kind: 'edge', id: 'x__y' }, edges); expect(h.ends.size + h.edges.size).toBe(0); });
  it('holds for every line of every shipped map', () => {
    for (const app of listApps()) for (const m of loadApp(path.join(repoRoot, 'apps', app)).content.maps) for (const e of m.edges) {
      const h = mapHighlight({ kind: 'edge', id: edgeKey(e.from, e.to) }, m.edges);
      expect([...h.edges]).toEqual([edgeKey(e.from, e.to)]); expect([...h.ends].sort()).toEqual([...new Set([e.from, e.to])].sort()); expect(h.path.size + h.neigh.size).toBe(0);
    }
  });
});
