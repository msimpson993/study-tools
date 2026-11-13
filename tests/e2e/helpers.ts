import { expect, type Page } from '@playwright/test';

export const APPS = ['transforms', 'linear-systems', 'control-systems', 'pid-tuning'] as const;
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
