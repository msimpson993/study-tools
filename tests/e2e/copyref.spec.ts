import { test, expect, type Page } from '@playwright/test';
import { APPS, open } from './helpers';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const readClipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

async function clickCopy(page: Page, scope: ReturnType<Page['getByTestId']> | Page) {
  const btn = 'getByTestId' in scope && scope !== page
    ? (scope as ReturnType<Page['getByTestId']>).getByTestId('copy-ref').first()
    : page.getByTestId('copy-ref').first();
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(btn).toHaveAttribute('aria-label', /copied/i);
  const text = await readClipboard(page);
  expect(text, 'clipboard packet').toMatch(/^\[study-tools\] /);
  expect(text).toMatch(/^Path: /m);
  expect(text).toMatch(/^Viewing: /m);
  expect(text).toMatch(/^Link: /m);
  expect(text).toMatch(/^Context: /m);
  return { btn, text };
}

for (const app of APPS) {
  test.describe(`${app}: copy reference`, () => {
    test('copies a packet from a node panel, a dive and a figure', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await open(page, app);

      const loc = await page.evaluate(() => {
        const c = (window as any).__study.content;
        const m = c.maps[0];
        const node = m.nodes.find((n: { id: string }) => n.id !== 'root') ?? m.nodes[0];
        const fig = c.figures[0];
        const dive = c.dives[0];
        return { nodeId: node.id, nodeLabel: node.label, figId: fig.id, figTitle: fig.title, diveId: dive.id, diveTitle: dive.title, pageTitle: c.subject.title };
      });

      // --- node panel ---
      await page.locator(`[data-testid=map-node][data-node="${loc.nodeId}"]`).dispatchEvent('click');
      const panel = page.getByTestId('map-panel');
      await expect(panel).toContainText(loc.nodeLabel.slice(0, 12));
      await expect(page).toHaveURL(new RegExp(`#/node/${loc.nodeId}`));
      const node = await clickCopy(page, panel);
      expect(node.text).toContain(`[study-tools] ${loc.pageTitle} > `);
      expect(node.text).toContain('Viewing: node panel');
      expect(node.text).toMatch(new RegExp(`Link: .*#/node/${loc.nodeId}`));
      // opening the copied deep link after a fresh load still shows the panel
      await page.goto(`/${app}/index.html#/node/${loc.nodeId}`);
      await page.waitForFunction(() => !!(window as any).__study);
      await expect(page.getByTestId('map-panel')).toContainText(loc.nodeLabel.slice(0, 12));
      await expect(page.getByTestId('map-panel').getByTestId('copy-ref')).toBeVisible();

      // --- deep dive ---
      await page.goto(`/${app}/index.html#/dive/${loc.diveId}`);
      await page.waitForFunction(() => !!(window as any).__study);
      const diveEl = page.getByTestId('dive');
      await expect(diveEl).toBeVisible();
      const dive = await clickCopy(page, diveEl);
      expect(dive.text).toContain('Viewing: deep dive');
      expect(dive.text).toMatch(new RegExp(`Link: .*#/dive/${loc.diveId}`));
      expect(dive.text).toContain(loc.diveTitle);

      // --- live figure (nudge a slider when there is one, so values appear) ---
      await page.goto(`/${app}/index.html#/figure/${loc.figId}`);
      await page.waitForFunction(() => !!(window as any).__study);
      await expect(page.getByTestId('fig-stage')).toBeVisible();
      const sliders = page.locator('[data-testid=controls] input[type=range]');
      if (await sliders.count()) {
        const id = await sliders.first().getAttribute('data-k');
        await sliders.first().fill(await sliders.first().evaluate((el) => {
          const r = el as HTMLInputElement;
          const min = Number(r.min), max = Number(r.max), cur = Number(r.value);
          const mid = min + (max - min) * 0.7;
          return String(Math.abs(cur - mid) < (max - min) * 0.05 ? min + (max - min) * 0.3 : mid);
        }));
        // values are read at click time
        void id;
      }
      const fig = await clickCopy(page, page.getByTestId('fig-stage'));
      expect(fig.text).toContain(`figure '${loc.figTitle}'`);
      expect(fig.text).toMatch(new RegExp(`Link: .*#/figure/${loc.figId}`));
      if (await sliders.count()) {
        const k = await sliders.first().getAttribute('data-k');
        expect(fig.text).toContain(`${k}=`);
      }
    });
  });
}
