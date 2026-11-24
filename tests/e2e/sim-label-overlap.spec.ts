import { test, expect, type Page } from '@playwright/test';
import { open } from './helpers';

/**
 * Every Simulation Project step-card tile and its expanded view, at the sizes the reviews use:
 * drawn text boxes (from core text()'s __textLog) must not overlap each other and must stay on the canvas.
 *
 * Allow known intentional overlaps only with an explicit, commented entry below.
 */
interface L {
  s: string; x0: number; x1: number; y0?: number; y1?: number; role?: string;
  skipped: boolean; gen: number; cv: number; id: string; W: number; H: number;
  where?: string; step?: string;
}

/** Intentional overlaps the check may see and should ignore. Tick-vs-tick and exact duplicate (outline) pairs are skipped in code, not here. */
const ALLOWLIST: { comment: string; match: (p: L, q: L, at: string) => boolean }[] = [
  // none yet — add a commented entry if a genuine, intended overlap appears
];

const TABS = ['engine', 'motor', 'borer', 'disk'] as const;
const VIEWPORTS = [
  { w: 320, h: 700, label: '320' },
  { w: 390, h: 844, label: '390' },
  { w: 844, h: 390, label: '844x390' },
  { w: 923, h: 1300, label: '923' },
  { w: 1280, h: 900, label: '1280' },
  { w: 1920, h: 1080, label: '1920' },
] as const;

const start = (page: Page) => page.evaluate(() => { (window as any).__textLog = []; (window as any).__textCanvases = []; });
const redraw = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('study-theme')));
const take = (page: Page) => page.evaluate(() => {
  const w = window as any, cvs: HTMLCanvasElement[] = w.__textCanvases, l = w.__textLog ?? [];
  w.__textLog = [];
  return (l as L[]).filter((e) => {
    const c = cvs[e.cv];
    return c && c.isConnected && c.width === e.W && c.height === e.H && c.getBoundingClientRect().width > 0;
  });
}) as Promise<L[]>;

const allowed = (p: L, q: L, at: string) => ALLOWLIST.some((a) => a.match(p, q, at));

const collisions = (log: L[], at: string) => {
  const last = new Map<number, number>();
  for (const e of log) last.set(e.cv, Math.max(last.get(e.cv) ?? 0, e.gen));
  const by = new Map<number, L[]>();
  for (const e of log) if (!e.skipped && e.y0 !== undefined && e.s.trim() && e.gen === last.get(e.cv)) {
    const a = by.get(e.cv) ?? []; a.push(e); by.set(e.cv, a);
  }
  const out: string[] = [];
  for (const a of by.values()) for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
    const p = a[i], q = a[j];
    // two tick numbers may share a corner at the origin; the same string in the same place is an outline
    if (p.role === 'tick' && q.role === 'tick') continue;
    if (p.s === q.s && Math.abs(p.x0 - q.x0) < 1 && Math.abs((p.y0 ?? 0) - (q.y0 ?? 0)) < 1) continue;
    if (allowed(p, q, at)) continue;
    const w = Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0), h = Math.min(p.y1!, q.y1!) - Math.max(p.y0!, q.y0!);
    if (w > 1.5 && h > 1.5) out.push(`${at} ${p.id || 'canvas'}: “${p.s}” (${p.role ?? '?'}) × “${q.s}” (${q.role ?? '?'})`);
  }
  return out;
};

/** a pixel or two of descender box past the edge is fine */
const clipped = (log: L[], at: string) => {
  const out: string[] = [];
  for (const e of log) if (!e.skipped && e.s.trim() && e.y0 !== undefined && (e.x0 < -1 || e.x1 > e.W + 1 || e.y0 < -3 || e.y1! > e.H + 3)) {
    out.push(`${at} ${e.id || 'canvas'}: “${e.s}” runs off the canvas [${Math.round(e.x0)}–${Math.round(e.x1)} of ${e.W}, ${Math.round(e.y0)}–${Math.round(e.y1!)} of ${e.H}]`);
  }
  return out;
};

async function waitTiles(page: Page, card: ReturnType<Page['locator']>) {
  await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await expect.poll(async () => card.locator('.step-thumbs canvas[data-fig], .tile-frame canvas[data-fig]').count(), { timeout: 12_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(200);
}

for (const vp of VIEWPORTS) {
  test(`sim-project @${vp.label}: step-card tiles and expanded views keep labels apart and on the canvas`, async ({ page }) => {
    test.setTimeout(420_000);
    await page.addInitScript(() => { (window as any).__textLog = []; (window as any).__textCanvases = []; });
    await page.setViewportSize({ width: vp.w, height: vp.h });
    const bad: string[] = [];
    let seen = 0;
    for (const tab of TABS) {
      await open(page, 'sim-project', `#/tab/${tab}`);
      await page.waitForTimeout(300);
      const n = await page.locator('[data-testid=step-card]').count();
      for (let i = 0; i < n; i++) {
        const card = page.locator('[data-testid=step-card]').nth(i);
        const step = (await card.getAttribute('data-step')) ?? String(i + 1);
        await waitTiles(page, card);
        await start(page);
        await redraw(page);
        await page.waitForTimeout(250);
        const tiles = (await take(page)).filter((e) => e.where === 'tile' && e.step === step);
        seen += tiles.length;
        const atTile = `${tab} step ${step} tile @${vp.label}`;
        bad.push(...collisions(tiles, atTile), ...clipped(tiles, atTile));

        const thumbs = card.locator('.step-thumbs canvas[data-fig]');
        const tcount = await thumbs.count();
        for (let k = 0; k < tcount; k++) {
          const thumb = thumbs.nth(k);
          if (!(await thumb.isVisible().catch(() => false))) continue;
          const fig = (await thumb.getAttribute('data-fig')) ?? String(k);
          await thumb.click();
          const overlay = card.getByTestId('fig-overlay').locator('visible=true');
          await expect(overlay).toHaveCount(1, { timeout: 8_000 });
          await expect(overlay.locator('canvas[data-big]')).toBeVisible();
          await page.waitForTimeout(200);
          await start(page);
          await redraw(page);
          await page.waitForTimeout(250);
          const exp = (await take(page)).filter((e) => e.where === 'expand');
          seen += exp.length;
          const atExp = `${tab} step ${step} expand ${fig} @${vp.label}`;
          bad.push(...collisions(exp, atExp), ...clipped(exp, atExp));
          await overlay.locator('[data-testid=fig-close]').click();
          await expect(overlay).toHaveCount(0, { timeout: 8_000 });
        }
      }
    }
    const uniq = [...new Set(bad)];
    expect(seen, `expected drawn labels at ${vp.label}`).toBeGreaterThan(0);
    expect(uniq, uniq.slice(0, 50).join('\n')).toEqual([]);
  });
}
