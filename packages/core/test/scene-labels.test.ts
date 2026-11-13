import { describe, it, expect, vi } from 'vitest';
import { drawSceneFrame, sceneLayout, sceneDuration } from '../src/scene';
import { SCENES, sceneProblems } from '../src/scenedefs';

/** Draw every scene/overlay set with a recording 2D context (text width = 0.52·px per character) and check that no two labels of one panel overlap and none leaves its panel. */
vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#888' }));
vi.stubGlobal('document', { documentElement: {} });

interface Lab { s: string; x0: number; x1: number; y0: number; y1: number }
function record(scene: string, overlays: string[], w: number, compact: boolean, t: number, params: Record<string, number> = {}) {
  const labs: Lab[] = []; let px = 11;
  const state: any = { font: '', save() {}, restore() {} };
  const g: any = new Proxy(state, {
    get(o, k: string) {
      if (k === 'measureText') return (s: string) => { px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(o.font)![1]); return { width: s.length * px * 0.52 }; };
      if (k === 'fillText') return (s: string, x: number, y: number) => { px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(o.font)![1]); labs.push({ s, x0: x, x1: x + s.length * px * 0.52, y0: y - px * 0.85, y1: y + px * 0.25 }); };
      if (k in o) return o[k];
      return () => ({ addColorStop() {} });
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  const L = sceneLayout(scene, overlays, w, compact);
  drawSceneFrame(g, L, scene, overlays, t, params);
  const panels = [L.main, ...L.insets.map((i) => i.rect)];
  return { labs, panels, L };
}
const overlap = (a: Lab, b: Lab) => a.x0 < b.x1 - 0.5 && a.x1 > b.x0 + 0.5 && a.y0 < b.y1 - 0.5 && a.y1 > b.y0 + 0.5;

const SETS: [string, string[], Record<string, number>?][] = [
  ['cart', ['forces']], ['cart', ['forces', 'sensor']], ['cart', ['sensor']], ['cart', ['modes', 'poles']], ['cart', ['flow', 'phase']], ['cart', ['observe', 'trace']], ['cart', ['push', 'forces']],
  ['cart', ['loop']], ['cart', ['loop', 'poles']], ['cart', ['loop', 'phase']], ['cart', ['pid']], ['cart', ['disturb'], { d: 2 }], ['cart', ['noise']], ['cart', ['limit'], { umax: 1 }], ['cart', ['delay']], ['cart', ['lag'], { K: 8 }], ['cart', ['loop', 'forces']], ['cart', ['pid', 'forces']],
  ['tine', ['envelope', 'poles']], ['tine', ['spectrum']], ['tine', ['zpoles']],
];

describe('labels never collide (every panel, hero and phone widths, several moments)', () => {
  for (const [scene, overlays, params] of SETS) {
    for (const [w, compact] of [[300, true], [340, false], [390, false], [760, false]] as const) {
      it(`${scene}:${overlays.join('+')} at ${w}px${compact ? ' (hero)' : ''}`, () => {
        for (const frac of [0.02, 0.25, 0.6, 1]) {
          const t = frac * Math.min(sceneDuration(scene, overlays), 10), { labs, panels } = record(scene, overlays, w, compact, t, params);
          for (let i = 0; i < labs.length; i++) {
            const a = labs[i];
            expect(panels.some((p) => a.x0 >= p.x - 0.5 && a.x1 <= p.x + p.w + 0.5 && a.y0 >= p.y - 1 && a.y1 <= p.y + p.h + 1), `"${a.s}" stays inside its panel (t=${t})`).toBe(true);
            for (let j = i + 1; j < labs.length; j++) if (overlap(a, labs[j])) {
              // two labels in different panels cannot touch (panels do not overlap); same-panel overlaps are bugs
              expect.soft(false, `"${a.s}" overlaps "${labs[j].s}" (t=${t})`).toBe(true);
            }
          }
        }
      });
    }
  }
  it('the catalogue sets above are all valid scene references', () => {
    for (const [scene, overlays, params] of SETS) expect(sceneProblems(scene, overlays, 'x', params), `${scene}:${overlays}`).toEqual([]);
    expect(Object.keys(SCENES)).toContain('cart');
  });
});
