import { test, expect, type Page } from '@playwright/test';
import { APPS, open, trackErrors, noHScroll } from './helpers';

interface Fig { id: string; animate?: { control: string }; controls: { id: string; type: string; min?: number; max?: number; default: unknown; options?: { value: string }[] }[] }
const figuresOf = async (page: Page, app: string): Promise<Fig[]> => { await open(page, app); return page.evaluate(() => (window as any).__study.content.figures); };

/** A cheap fingerprint of every canvas in the figure stage, and how many pixels are non-transparent. */
const stageInk = (page: Page) => page.evaluate(() => {
  const cvs = [...document.querySelectorAll('[data-testid=fig-stage] canvas, .viz-slot canvas')] as HTMLCanvasElement[];
  let ink = 0, sig = '';
  for (const c of cvs) {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 0) n++;
    ink += n; sig += `${c.width}x${c.height}:${c.toDataURL().length}:${c.toDataURL().slice(-120)}|`;
  }
  return { canvases: cvs.length, ink, sig };
});

async function nudge(page: Page, f: Fig) {
  const r = f.controls.find((c) => c.type === 'range' && (c.max ?? 0) > (c.min ?? 0));
  if (r) {
    const target = (r.min as number) + ((r.max as number) - (r.min as number)) * (Math.abs(((r.default as number) - (r.min as number)) / ((r.max as number) - (r.min as number)) - 0.7) < 0.1 ? 0.25 : 0.7);
    await page.locator(`[data-testid=controls] input[type=range][data-k="${r.id}"]`).first().fill(String(target));
    return r.id;
  }
  const s = f.controls.find((c) => c.type === 'select');
  if (s) { const other = s.options!.find((o) => o.value !== s.default)!.value; await page.locator(`[data-testid=controls] select[data-k="${s.id}"]`).selectOption(other); return s.id; }
  throw new Error(`figure ${f.id} has nothing to nudge`);
}

for (const app of APPS) {
  test.describe(`${app}: every new figure renders and responds`, () => {
    test('each figure draws ink, reacts to a control, its presets apply, and it animates (play/pause)', async ({ page }) => {
      test.setTimeout(240_000);
      const errs = trackErrors(page);
      const figs = (await figuresOf(page, app)).filter((f) => f.id !== 'expm');
      expect(figs.length).toBeGreaterThanOrEqual(app === 'linear-systems' ? 18 : app === 'transforms' ? 5 : 0);
      for (const f of figs) {
        await page.goto(`/${app}/index.html#/figure/${f.id}`);
        await page.reload();
        await expect(page.getByTestId('fig-stage'), f.id).toBeVisible();
        await expect.poll(async () => (await stageInk(page)).ink, { message: `${f.id} draws something`, timeout: 6000 }).toBeGreaterThan(40);
        const before = await stageInk(page);
        expect(before.canvases, `${f.id} canvases`).toBeGreaterThanOrEqual(2);
        const k = await nudge(page, f);
        await expect.poll(async () => (await stageInk(page)).sig, { message: `${f.id} responds to ${k}`, timeout: 5000 }).not.toBe(before.sig);
        // presets
        const presets = page.locator('[data-testid=controls] .st-presets button');
        expect(await presets.count(), `${f.id} presets`).toBeGreaterThan(0);
        for (let i = 0; i < Math.min(await presets.count(), 4); i++) { await presets.nth(i).click(); expect((await stageInk(page)).ink, `${f.id} preset ${i}`).toBeGreaterThan(20); }
        // the look-for line is present
        await expect(page.getByTestId('look-for'), `${f.id} look-for`).toBeVisible();
        if (f.animate) {
          await page.getByTestId('reset').click();
          const btn = page.getByTestId('play');
          await expect(btn).toContainText('Play');
          const s0 = (await stageInk(page)).sig;
          await btn.click();
          await expect(btn).toHaveAttribute('aria-pressed', 'true');
          await expect.poll(async () => (await stageInk(page)).sig, { message: `${f.id} animates`, timeout: 5000 }).not.toBe(s0);
          await btn.click();
          await expect(btn).toHaveAttribute('aria-pressed', 'false');
          const s1 = (await stageInk(page)).sig; await page.waitForTimeout(250);
          expect((await stageInk(page)).sig, `${f.id} stops when paused`).toBe(s1);
        }
      }
      expect(errs).toEqual([]);
    });

    test('with prefers-reduced-motion there is no autoplay and a Step button advances the figure', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const figs = (await figuresOf(page, app)).filter((f) => f.animate);
      expect(figs.length).toBeGreaterThanOrEqual(['linear-systems', 'transforms'].includes(app) ? 4 : 0);
      for (const f of figs.slice(0, 5)) {
        await page.goto(`/${app}/index.html#/figure/${f.id}`); await page.reload();
        const btn = page.getByTestId('play');
        await expect(btn).toContainText('Step');
        await expect.poll(async () => (await stageInk(page)).ink).toBeGreaterThan(40);
        const a = (await stageInk(page)).sig; await page.waitForTimeout(400);
        expect((await stageInk(page)).sig, `${f.id} idle`).toBe(a);
        await btn.click();
        await expect.poll(async () => (await stageInk(page)).sig, { message: `${f.id} steps` }).not.toBe(a);
      }
    });

    test('every dive with a figure shows it inline with ink, and fits a 390px phone', async ({ page }) => {
      test.setTimeout(180_000);
      await open(page, app);
      const dives: { id: string; html: string }[] = await page.evaluate(() => (window as any).__study.content.dives);
      const withFig = dives.filter((d) => d.html.includes('data-figure='));
      expect(withFig.length).toBe(dives.length); // every deep dive gets at least one visual
      for (const d of withFig) {
        for (const width of [1300, 390]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`/${app}/index.html#/dive/${d.id}`); await page.reload();
          await expect(page.locator('.viz-slot canvas').first(), `${d.id}@${width}`).toBeVisible();
          await expect.poll(async () => (await stageInk(page)).ink, { message: `${d.id}@${width} ink` }).toBeGreaterThan(30);
          if (width === 390) {
            expect(await noHScroll(page), `${d.id}: no horizontal scroll at 390px`).toBe(true);
            const box = await page.locator('.viz-slot').first().boundingBox();
            expect(box!.x + box!.width, `${d.id}: figure inside viewport`).toBeLessThanOrEqual(391);
          }
        }
      }
    });

    test('the running example appears on the map, in node popups and on dives', async ({ page }) => {
      await open(page, app);
      const c = await page.evaluate(() => (window as any).__study.content);
      expect(c.subject.runningExample.title.length).toBeGreaterThan(5);
      const fold = page.getByTestId('running-example');
      await expect(fold).toBeVisible();
      await fold.locator('summary').click();
      await expect(fold).toContainText(c.subject.runningExample.title.slice(0, 10));
      const node = c.maps.flatMap((m: any) => m.nodes.map((n: any) => ({ ...n, map: m }))).find((n: any) => n.id !== 'root' && n.addsToExample);
      const mi = c.maps.indexOf(node.map);
      if (mi > 0) await page.locator('[data-testid=concept-map] [role=tab]').nth(mi).click();
      await page.locator(`[data-testid=map-node][data-node="${node.id}"]`).dispatchEvent('click');
      await expect(page.getByTestId('adds-to-example')).toBeVisible();
      await expect(page.getByTestId('accounts-for')).toBeVisible();
      const dive = c.dives[0];
      if (!dive) return; // apps ported verbatim (legacy board) have no dives yet
      await page.goto(`/${app}/index.html#/dive/${dive.id}`); await page.reload();
      await expect(page.getByTestId('dive-example')).toContainText(/adds/i);
    });
  });
}
