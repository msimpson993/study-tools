import { s } from './dom';
import type { Rect } from './maplayout';

/** Tiny pictures of the running examples, drawn in a 10 × 10 box: the per-box marker of `examples` on the map and the legend.
 *  Keyed by the Example node's id (runningExample.refs[].id); an unknown id gets a plain dot. Filled in the example colour by CSS. */
const SHAPES: Record<string, string> = {
  // an earbud: round bud, short stem
  earbud: 'M4.2 0.6a3.7 3.7 0 1 1 0 7.4a3.7 3.7 0 1 1 0-7.4Z M5.6 6.9 L7.2 5.6 L9.6 8.6 L8.1 9.9 Z',
  // a car from the side: body, cabin, two wheels
  car: 'M0.4 7.4 V5.4 L1.6 4.8 L3.1 2.7 H6.9 L8.4 4.8 L9.6 5.3 V7.4 Z M2.6 6.3a1.6 1.6 0 1 1 0 3.2a1.6 1.6 0 1 1 0-3.2Z M7.4 6.3a1.6 1.6 0 1 1 0 3.2a1.6 1.6 0 1 1 0-3.2Z',
  house: 'M5 0.6 L9.6 4.6 H8.4 V9.4 H1.6 V4.6 H0.4 Z',
  corner: 'M2 0.6 H8 V3 H2 Z M3 3.4 L7 4.4 L3 5.4 L7 6.4 L3 7.4 L5 8 V9.4 H4.4 V8.3 Z',
  dish: 'M0.8 2.4 A5 5 0 0 0 7.6 9.2 Z M4.4 5.6 L8.6 1.4 L9.4 2.2 L5.2 6.4 Z',
};
const DOT = 'M5 2.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5Z';
export const glyphPath = (id: string): string => SHAPES[id] ?? DOT;

/** one glyph at rect r (an svg <path> in the example colour) */
export function exampleGlyph(id: string, r: Rect, extra: Record<string, string> = {}): SVGPathElement {
  const k = r.w / 10;
  return s('path', { class: `qm-exg`, d: glyphPath(id), transform: `translate(${r.x} ${r.y}) scale(${k})`, 'data-ex': id, 'data-testid': 'map-exglyph', 'aria-hidden': 'true', ...extra });
}
