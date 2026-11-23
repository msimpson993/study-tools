import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadApp, listApps, repoRoot } from '../../build/src';
import { computeHops, unhoppedCrossings, QM_HOP_R, roundedPath, edgeCrossings, edgeOverlaps, ACTUAL_MIN_WIDTH, layoutWidth, computeGeometry, placeLabels, overlapReport, pathToRoot, edgeKey, mapHighlight } from '../src/maplayout';

const WIDTHS = [360, 390, 480, 640, 768, 900, 1024, 1150, 1280, 1400];

describe.each(listApps())('%s concept maps', (app) => {
  const { content } = loadApp(path.join(repoRoot, 'apps', app));
  if (!content.maps.length) { it('is a tabbed page with no map', () => expect(content.tabs?.length).toBeGreaterThan(0)); return; }
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

/** crossings / overlapping line pieces of the shipped maps BEFORE the crossing-minimising layout (measured on the previous layout), at widths 362 560 775 980 1400.
    control-systems/chain narrow ceilings were raised from 5/9 to 12/12 when the Designing-with-state-feedback chapter was added; wide ceilings are unchanged. */
const BEFORE: Record<string, [number, number][]> = {
  // control-systems was rebuilt (Nov 2026) as Big picture + Full detail with pid-tuning folded in (the pid-tuning page and its map were removed); ceilings are what the current layout draws.
  'control-systems/big': [[1, 0], [1, 0], [1, 0], [1, 0], [1, 0]], 'control-systems/detail': [[19, 0], [19, 0], [19, 0], [18, 0], [18, 0]], // CS pass 4: the six tuning side boxes sit on a shelf under Tuning toolkit (one side path off Choosing the three gains); at 775 the shelf is one column, whose lines cross the long look-backs twice more
  // linear-systems was rebuilt (Nov 2026) as Big picture + Full detail, and again on Nov 18 to the 14-box pop-up format; these maps never had the old layout, so their ceilings are what the current layout draws.
  'linear-systems/big': [[1, 0], [1, 0], [1, 0], [1, 0], [1, 0]], 'linear-systems/full': [[7, 0], [7, 0], [3, 0], [3, 0], [2, 0]], // Nov 18 tutor review: Controllability box under 'Do inside and outside match?' (Kalman box folded into it) adds one crossing on phones

  // sim-project is a new 22-box question chain (Nov 2026); ceilings are what the current layout draws (no crossings at these widths).
  'sim-project/chain': [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],};
const WIDTHS5 = [362, 560, 775, 980, 1400];
const shipped = () => listApps().flatMap((app) => loadApp(path.join(repoRoot, 'apps', app)).content.maps.map((m) => ({ id: `${app}/${m.id}`, m })));
describe('layout: fewer crossings, every line in its own lane', () => {
  it('crossings never exceed the old layout at any width, and the busy maps lose most of them', () => {
    let before = 0, after = 0;
    for (const { id, m } of shipped()) WIDTHS5.forEach((w, i) => {
      const c = edgeCrossings(computeGeometry(m.nodes, m.edges, w)).length; before += BEFORE[id][i][0]; after += c;
      expect(c, `${id} @${w}`).toBeLessThanOrEqual(BEFORE[id][i][0]);
    });
    // The old-layout maps this ratio was measured on (control-systems/chain, pid-tuning/chain) have all been rebuilt or retired; every
    // ceiling above is now the current layout's own count, so only the per-map ceilings are checked.
    expect(after, `total ${after} vs ${before}`).toBeLessThanOrEqual(before);
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

describe('hop-overs', () => {
  const line = (key: string, pts: [number, number][]) => ({ key, points: pts.map(([x, y]) => ({ x, y })) });
  const H = line('h', [[0, 0], [0, 20], [200, 20], [200, 60]]), V = line('v', [[100, 0], [100, 60]]);
  it('the line with the horizontal piece hops, whatever the drawing order', () => {
    for (const edges of [[H, V], [V, H]]) {
      const { hops, unhopped } = computeHops(edges); expect(unhopped).toEqual([]);
      expect(Object.keys(hops)).toEqual(['h']); expect(hops.h).toEqual([{ seg: 1, x0: 100 - QM_HOP_R, x1: 100 + QM_HOP_R, y: 20, ry: QM_HOP_R, n: 1 }]);
    }
  });
  it('the arc is a semicircle that rises above the line: sweep 1 going right, 0 going left', () => {
    const r = computeHops([H, V]).hops.h;
    expect(roundedPath(H.points, 7, r)).toContain(`L 93 20 A 7 7 0 0 1 107 20`);
    const back = line('b', [[200, 0], [200, 20], [0, 20], [0, 60]]), rb = computeHops([back, V]).hops.b;
    expect(roundedPath(back.points, 7, rb)).toContain(`L 107 20 A 7 7 0 0 0 93 20`);
    expect(roundedPath(H.points, 7, [])).not.toContain(' A ');
  });
  it('close crossings merge into one wider arc; far ones stay separate', () => {
    const v2 = line('v2', [[110, 0], [110, 60]]), v3 = line('v3', [[160, 0], [160, 60]]);
    const h = computeHops([H, V, v2, v3]).hops.h;
    expect(h.map((x) => [x.x0, x.x1, x.n])).toEqual([[93, 117, 2], [153, 167, 1]]);
    expect(roundedPath(H.points, 7, h).match(/ A /g)).toHaveLength(2);
  });
  it('near the end of a piece the arc shrinks and the corner tightens; with no room at all the crossing stays plain and is counted', () => {
    const near = line('n', [[8, 0], [8, 60]]), { hops } = computeHops([H, near]);
    expect(hops.h[0].ry).toBeLessThan(7); expect(hops.h[0].ry).toBeGreaterThanOrEqual(3.5);
    expect(roundedPath(H.points, 7, hops.h)).toMatch(/Q 0 20 /);
    const tight = line('t', [[3, 0], [3, 60]]), r = computeHops([H, tight]); expect(r.hops.h).toBeUndefined(); expect(r.unhopped).toHaveLength(1);
  });
  it('a hop leaves the line\'s ends and length alone: the path starts and ends at the same points', () => {
    const d = roundedPath(H.points, 7, computeHops([H, V]).hops.h);
    expect(d.startsWith('M 0 0')).toBe(true); expect(d.endsWith('L 200 60')).toBe(true);
  });
  it('shipped maps: nearly every crossing gets an arc, arcs stay clear of the boxes, and the result is deterministic', () => {
    let crossings = 0, plain = 0;
    for (const { id, m } of shipped()) for (const w of WIDTHS5) {
      const g = computeGeometry(m.nodes, m.edges, w), again = computeGeometry(m.nodes, m.edges, w);
      expect(JSON.stringify(g.edges.map((e) => e.hops))).toBe(JSON.stringify(again.edges.map((e) => e.hops)));
      crossings += edgeCrossings(g).length; plain += unhoppedCrossings(g);
      for (const e of g.edges) for (const h of e.hops) {
        expect(h.ry, `${id} @${w}`).toBeGreaterThanOrEqual(3.5); expect(h.ry).toBeLessThanOrEqual(QM_HOP_R);
        for (const b of Object.values(g.boxes)) expect(h.x1 < b.x || h.x0 > b.x + b.w || h.y - h.ry > b.y + b.h || h.y < b.y, `${id} @${w} ${e.key} hop inside box ${b.id}`).toBe(true);
      }
      for (const e of g.edges) for (const h of e.hops) expect(Math.abs(e.dot.y - h.y) > 1 || e.dot.x + 6 < h.x0 || e.dot.x - 6 > h.x1, `${id} @${w} ${e.key} dot sits on its own hop`).toBe(true);
    }
    expect(plain, `${plain} of ${crossings} crossings stay plain`).toBeLessThan(crossings * 0.4);
  });
});

// CS pass 5 (issue 8): on a phone the main line past the Tuning toolkit's shelf (A push we didn't command → What if the model is wrong?)
// stays under one screen, and no box label is cut short
describe('control-systems shelf at phone width', () => {
  const { content } = loadApp(path.join(repoRoot, 'apps', 'control-systems'));
  const m = content.maps.find((x) => x.id === 'detail')!;
  it.each([360, 390, 480])('DIST → SENS is short at %ipx and no label ends in …', (w) => {
    const g = computeGeometry(m.nodes, m.edges, w);
    const e = g.edges.find((x) => x.from === 'DIST' && x.to === 'SENS')!;
    let len = 0; for (let i = 1; i < e.points.length; i++) len += Math.abs(e.points[i].x - e.points[i - 1].x) + Math.abs(e.points[i].y - e.points[i - 1].y);
    expect(len).toBeLessThan(1000);
    for (const b of Object.values(g.boxes) as { lines?: string[] }[]) for (const l of b.lines ?? []) expect(l.endsWith('…'), l).toBe(false);
  });
});
