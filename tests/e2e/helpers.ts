import { expect, type Page } from '@playwright/test';

export const APPS = ['linear-systems', 'control-systems', 'sim-project'] as const;
export const url = (app: string, hash = '') => `/${app}/index.html${hash}`;

/** Collect console errors / page errors during a test. */
export function trackErrors(page: Page): string[] {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text()}`); });
  return errs;
}

export async function open(page: Page, app: string, hash = '') {
  await page.goto(url(app, hash));
  await page.waitForFunction(() => !!(window as any).__study);
}

/** Selects a map tab by its visible title (maps with a single tab have one too). */
export async function selectMap(page: Page, title: string) {
  await page.locator('[data-testid=concept-map] [role=tab]', { hasText: title }).first().click();
  await expect(page.getByTestId('map-svg')).toBeVisible();
}

/** Overlap counts measured from the real DOM boxes (independent of the layout code). */
export async function measureOverlaps(page: Page) {
  return page.evaluate(() => {
    const rect = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const hit = (a: any, b: any, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
    const nodes = [...document.querySelectorAll('[data-testid=map-node]')].map((e) => ({ id: e.getAttribute('data-node'), ...rect(e.querySelector('rect') ?? e) }));
    const labels = [...document.querySelectorAll('[data-testid=map-label]')].map((e) => ({ id: e.getAttribute('data-label'), ...rect(e.querySelector('rect') ?? e) }));
    let nn = 0, ln = 0, ll = 0;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) if (hit(nodes[i], nodes[j])) nn++;
    for (const l of labels) for (const n of nodes) if (hit(l, n)) ln++;
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) if (hit(labels[i], labels[j])) ll++;
    return { nodes: nodes.length, labels: labels.length, nodeNode: nn, labelNode: ln, labelLabel: ll };
  });
}

export const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

/** Example nodes (runningExample.refs) measured in the real SVG: what lies under each node, and what its dotted link runs
 *  into. Boxes, labels and other nodes by their rects; lines by points sampled every 2 px along each drawn path. */
export async function exampleNodeClashes(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('[data-testid=map-svg]') as SVGSVGElement | null; if (!svg) return { nodes: 0, links: 0, clashes: ['no map'] };
    const bb = (e: Element) => { const b = (e as SVGGraphicsElement).getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    const hit = (a: any, b: any, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
    const inR = (p: { x: number; y: number }, r: any, pad = 0) => p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad;
    const boxes = [...svg.querySelectorAll('.qm-node')].map((g) => ({ id: g.getAttribute('data-node')!, ...bb(g.querySelector('.shape')!) }));
    const labels = [...svg.querySelectorAll('.qm-label rect')].map((r) => ({ id: r.parentElement!.getAttribute('data-label')!, ...bb(r) }));
    const pts: { k: string; x: number; y: number }[] = [];
    for (const p of svg.querySelectorAll('.qm-edge path.line')) { const path = p as SVGPathElement, L = path.getTotalLength(), k = p.parentElement!.getAttribute('data-edge')!; for (let s = 0; s <= L; s += 2) { const q = path.getPointAtLength(s); pts.push({ k, x: q.x, y: q.y }); } }
    const refs = [...svg.querySelectorAll('.qm-ref')].map((g) => ({ id: g.getAttribute('data-ref')!, at: g.getAttribute('data-at')!, ...bb(g.querySelector('.chip')!) }));
    const out: string[] = [];
    for (const r of refs) {
      for (const b of boxes) if (hit(r, b)) out.push(`${r.id} on box ${b.id}`);
      for (const l of labels) if (hit(r, l)) out.push(`${r.id} on label ${l.id}`);
      const p = pts.find((q) => inR(q, r)); if (p) out.push(`${r.id} on line ${p.k}`);
      for (const o of refs) if (o.id < r.id && hit(r, o)) out.push(`${r.id} on ${o.id}`);
    }
    const links = [...svg.querySelectorAll('.qm-exlink')];
    for (const l of links) {
      const id = l.getAttribute('data-ref')!, at = l.getAttribute('data-at')!, n = (a: string) => +l.getAttribute(a)!;
      const x1 = n('x1'), y1 = n('y1'), x2 = n('x2'), y2 = n('y2'), seg = { x: Math.min(x1, x2) + 1, y: Math.min(y1, y2) + 1, w: Math.max(0, Math.abs(x2 - x1) - 2), h: Math.max(0, Math.abs(y2 - y1) - 2) };
      for (const b of boxes) if (b.id !== at && hit(seg, b)) out.push(`${id} link into box ${b.id}`);
      const p = pts.find((q) => inR(q, seg, 1.5)); if (p) out.push(`${id} link crosses line ${p.k}`);
      const host = boxes.find((b) => b.id === at)!, me = refs.find((r) => r.id === id)!;
      const onEdge = (q: { x: number; y: number }, r: any) => inR(q, r, 1.5) && !inR(q, { x: r.x + 1.5, y: r.y + 1.5, w: r.w - 3, h: r.h - 3 });
      if (!onEdge({ x: x1, y: y1 }, host)) out.push(`${id} link does not start on ${at}`);
      if (!onEdge({ x: x2, y: y2 }, me)) out.push(`${id} link does not end on its node`);
    }
    return { nodes: refs.length, links: links.length, clashes: out };
  });
}

/** Example glyphs (per-box `examples`): each must sit inside its box's outline, clear of every text line in that box and of every
 *  line label on the map. Rendered boxes (getBBox in svg units), so it checks the real text, not the wrap's estimate. */
export async function exampleGlyphClashes(page: Page) {
  return page.evaluate(() => {
    const out: string[] = []; let n = 0;
    const svg = document.querySelector('[data-testid=map-svg]') as SVGSVGElement | null; if (!svg) return { glyphs: 0, clashes: ['no map'] };
    const bb = (e: Element) => { const r = (e as SVGGraphicsElement).getBBox(); const m = (e as SVGGraphicsElement).getAttribute('transform'); if (!m) return r; const t = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)/.exec(m)!; const k = +t[3]; return { x: +t[1] + r.x * k, y: +t[2] + r.y * k, width: r.width * k, height: r.height * k }; };
    const hit = (a: { x: number; y: number; width: number; height: number }, b: typeof a) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const labels = [...svg.querySelectorAll('[data-testid=map-label] rect')].map((r) => bb(r));
    for (const node of svg.querySelectorAll('.qm-node[data-uses]')) {
      const id = (node as HTMLElement).dataset.node, shape = bb(node.querySelector('.shape')!), texts = [...node.querySelectorAll('text')].filter((t) => t.textContent?.trim()).map((t) => ({ t: t.textContent, r: bb(t) }));
      const gs = [...node.querySelectorAll('[data-testid=map-exglyph]')];
      if (gs.length !== ((node as HTMLElement).dataset.uses ?? '').split(' ').length) out.push(`${id}: ${gs.length} glyphs for uses "${(node as HTMLElement).dataset.uses}"`);
      for (const g of gs) {
        n++; const r = bb(g);
        if (r.x < shape.x || r.y < shape.y || r.x + r.width > shape.x + shape.width || r.y + r.height > shape.y + shape.height) out.push(`${id}: glyph ${(g as SVGElement).dataset.ex} outside its box`);
        for (const t of texts) if (hit(r, t.r)) out.push(`${id}: glyph ${(g as SVGElement).dataset.ex} on "${t.t}"`);
        for (const l of labels) if (hit(r, l)) out.push(`${id}: glyph ${(g as SVGElement).dataset.ex} on a line label`);
      }
    }
    return { glyphs: n, clashes: out };
  });
}
