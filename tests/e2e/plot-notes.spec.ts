import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';

/* A1: no in-plot label or note may run off its canvas at a 1366 px desktop width (or on a phone).
   core/viz text() fits labels (shrink, slide in, or split over two lines); this checks every drawn label on every dive. */
const DIVES = readdirSync('apps/linear-systems/content/dives').filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));

for (const width of [1366, 390]) {
  test(`linear-systems: no plot label overflows its canvas at ${width} px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => { (window as unknown as { __textLog: unknown[] }).__textLog = []; });
    const bad: string[] = []; let fitted = 0;
    for (const id of DIVES) {
      await page.goto(`/linear-systems/index.html#/dive/${id}`);
      await page.waitForTimeout(500);
      await page.evaluate(() => document.querySelectorAll('canvas').forEach((c) => c.scrollIntoView()));
      await page.waitForTimeout(250);
      const log = await page.evaluate(() => { const w = window as unknown as { __textLog: { s: string; x0: number; x1: number; W: number; id: string; fitted: boolean }[] }; const l = w.__textLog.splice(0); return l; });
      for (const e of log) { if (e.x0 < -1 || e.x1 > e.W + 1) bad.push(`${id}/${e.id}: "${e.s}" ${e.x0.toFixed(0)}..${e.x1.toFixed(0)} of ${e.W}`); if (e.fitted) { fitted++; if (process.env.SHOW_FIT) console.log(`fit ${id}/${e.id}: ${e.s}`); } }
    }
    console.log(`${width}px: ${fitted} label draws were fitted (shrunk, slid in or split)`);
    expect([...new Set(bad)]).toEqual([]);
  });
}
