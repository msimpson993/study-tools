import { test, expect, type Page } from '@playwright/test';
import { open, trackErrors } from './helpers';

/* Browser Back at 700 px and up (CS pass 3, Nov 21): each box or line opened adds a history step, so Back walks back up the
   chain and finally closes the entry onto the map; it never leaves the site. ✕ closes onto the map in one go. */
type M = { id: string; edges: { from: string; to: string; dashed?: boolean; side?: boolean }[] };
const firstMap = (page: Page): Promise<M> => page.evaluate(() => (window as any).__study.content.maps[0]);
const sel = (page: Page) => page.locator('.qm-node.n-sel');
for (const app of ['control-systems', 'linear-systems', 'sim-project'])
  for (const [W, H] of [[923, 1300], [1280, 900]] as const) test(`${app} @${W}: Back walks back up the chain, then closes onto the map; ✕ closes in one go`, async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: W, height: H });
    await page.goto('about:blank');
    await open(page, app);
    const m = await firstMap(page), main = m.edges.filter((e) => !e.dashed && !e.side);
    const a = main[0], b = main.find((e) => e.from === a.to)!;
    const steps: { kind: string; id: string }[] = [{ kind: 'node', id: a.from }, { kind: 'edge', id: `${a.from}__${a.to}` }, { kind: 'node', id: a.to }, { kind: 'node', id: b.to }];
    const click = (s: { kind: string; id: string }) => page.locator(s.kind === 'node' ? `[data-testid=map-node][data-node="${s.id}"]` : `[data-testid=map-edge][data-edge="${s.id}"]`).first().dispatchEvent('click');
    const hashes: string[] = [];
    for (const s of steps) { await click(s); await page.waitForTimeout(120); hashes.push(await page.evaluate(() => location.hash)); }
    expect(new Set(hashes).size, 'each entry has its own URL').toBe(steps.length);
    for (let i = steps.length - 2; i >= 0; i--) {
      await page.goBack(); await page.waitForTimeout(120);
      expect(await page.evaluate(() => location.hash), `back to step ${i}`).toBe(hashes[i]);
      await expect(page.getByTestId('map-panel')).not.toHaveClass(/idle/);
      if (steps[i].kind === 'node') await expect(page.locator(`.qm-node[data-node="${steps[i].id}"]`)).toHaveClass(/n-sel/);
    }
    // one more Back closes the entry onto the map, still on the site
    await page.goBack(); await page.waitForTimeout(120);
    expect(page.url()).toContain(`/${app}/`);
    await expect(page.getByTestId('map-panel')).toHaveClass(/idle/); await expect(sel(page)).toHaveCount(0);
    // ✕ after several entries: straight back to the map, and the history above it is gone (Back leaves only then)
    for (const s of steps) { await click(s); await page.waitForTimeout(80); }
    await page.getByTestId('panel-close').click(); await page.waitForTimeout(150);
    await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    expect(page.url()).toContain(`/${app}/`);
    await page.goForward(); await page.waitForTimeout(150); // Forward re-opens the entries (normal browser behaviour)
    await page.goBack(); await page.waitForTimeout(150);
    expect(errs).toEqual([]);
  });
