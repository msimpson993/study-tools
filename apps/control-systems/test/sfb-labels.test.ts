/**
 * Label-collision check for the state-feedback chapter figures (the scene-labels
 * test covers the cart + staged diagrams, not these plot legends or pole tags).
 */
import { describe, it, expect, vi } from 'vitest';
import { ccPanels, sfPanels, obsPanels, sepPanels, refinPanels } from '../src/figs/sfb';

vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (k: string) => (k.includes('bad') ? '#c00' : k.includes('ok') ? '#0a0' : '#888') }));
vi.stubGlobal('document', { documentElement: {}, createElement: () => ({ getContext: () => ({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }), width: 0, height: 0 }) });

interface Lab { s: string; x0: number; x1: number; y0: number; y1: number; align: string; size: number }
function record(draw: (g: CanvasRenderingContext2D, w: number, h: number, v: Record<string, number | string | boolean>) => void, w: number, h: number, v: Record<string, number | string | boolean> = {}) {
  const labs: Lab[] = [];
  const state: any = { font: '11px system-ui', textAlign: 'left', textBaseline: 'middle' };
  const widthOf = (s: string) => {
    const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(state.font)?.[1] ?? '11');
    return s.length * px * 0.52;
  };
  const g: any = new Proxy(state, {
    get(o, k: string) {
      if (k === 'measureText') return (s: string) => ({ width: widthOf(s) });
      if (k === 'fillText') return (s: string, x: number, y: number) => {
        const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(o.font)?.[1] ?? '11');
        const tw = s.length * px * 0.52;
        const align = o.textAlign as string;
        const base = o.textBaseline as string;
        const x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
        // viz.text defaults to baseline 'middle'
        const y0 = base === 'alphabetic' ? y - px * 0.85 : y - px * 0.5;
        const y1 = base === 'alphabetic' ? y + px * 0.25 : y + px * 0.5;
        labs.push({ s, x0, x1: x0 + tw, y0, y1, align, size: px });
      };
      if (k in o) return o[k];
      if (k === 'canvas') return { width: w, height: h };
      return () => ({ addColorStop() {} });
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  // viz.text sets font as `${size}px system-ui,sans-serif` then fillText
  draw(g, w, h, v);
  return labs;
}
const overlap = (a: Lab, b: Lab) => a.x0 < b.x1 - 0.5 && a.x1 > b.x0 + 0.5 && a.y0 < b.y1 - 0.5 && a.y1 > b.y0 + 0.5;

const builders = [
  ['cc', ccPanels], ['sf', sfPanels], ['obs', obsPanels], ['sep', sepPanels], ['refin', refinPanels],
] as const;

describe('state-feedback figure labels do not collide', () => {
  const sizes: [number, number][] = [[360, 220], [390, 240], [520, 280], [700, 320]];
  for (const [name, build] of builders) {
    for (const [w, h] of sizes) {
      it(`${name} panels at ${w}×${h}`, () => {
        for (const p of build()) {
          const labs = record(p.draw, w, h, { k1: 23, k2: 5, Kcmp: 7, speed: 5, e0: 0.2, Nbar: 25, hidden: false });
          const num = (s: string) => /^[-−+]?\d+(?:\.\d+)?$/.test(s.trim());
          for (let i = 0; i < labs.length; i++) {
            const a = labs[i];
            for (let j = i + 1; j < labs.length; j++) {
              if (overlap(a, labs[j])) {
                // grid ticks may sit next to each other; rotated y-labels are recorded at the origin
                if (num(a.s) && num(labs[j].s)) continue;
                if (a.x0 < 16 && labs[j].x0 < 16 && (a.y0 < 16 || labs[j].y0 < 16)) continue;
                expect.soft(false, `"${a.s}" overlaps "${labs[j].s}" in ${name}/${p.id} (${w}×${h})`).toBe(true);
              }
            }
          }
        }
      });
    }
  }
});
