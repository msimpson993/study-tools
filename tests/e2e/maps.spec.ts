import { test, expect } from '@playwright/test';
import { APPS, open, selectMap, measureOverlaps, trackErrors } from './helpers';

for (const app of APPS) {
  test.describe(`${app}: concept maps`, () => {
    test('opens on the question map with no console errors', async ({ page }) => {
      const errs = trackErrors(page);
      await open(page, app);
      await expect(page.getByTestId('concept-map')).toBeVisible();
      await expect(page.getByTestId('central-question')).toContainText('?'); // central question first
      expect(errs).toEqual([]);
    });

    for (const width of [390, 768, 1400]) {
      test(`no node/label overlaps at ${width}px on every map`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await open(page, app);
        const maps: { id: string; title: string; nodes: unknown[]; edges: { label?: string }[] }[] = await page.evaluate(() => (window as any).__study.content.maps);
        for (const m of maps) {
          await selectMap(page, m.title);
          const r = await measureOverlaps(page);
          expect(r.nodes, `${m.id}: nodes drawn`).toBe(m.nodes.length);
          expect(r.labels, `${m.id}: labels drawn`).toBe(m.edges.filter((e) => e.label).length);
          expect({ map: m.id, ...r }).toMatchObject({ nodeNode: 0, labelNode: 0, labelLabel: 0 });
        }
      });
    }

    test('every node and every edge is tappable and shows a popup', async ({ page }) => {
      await open(page, app);
      const maps: { id: string; title: string; nodes: { id: string; label: string }[]; edges: { from: string; to: string }[] }[] = await page.evaluate(() => (window as any).__study.content.maps);
      const panel = page.getByTestId('map-panel');
      for (const m of maps) {
        await selectMap(page, m.title);
        for (const n of m.nodes) {
          await page.locator(`[data-testid=map-node][data-node="${n.id}"]`).dispatchEvent('click');
          await expect(panel, `${m.id}/${n.id}`).toContainText(n.label.slice(0, 12));
          expect((await panel.innerText()).length, `${m.id}/${n.id} popup text`).toBeGreaterThan(40);
        }
        for (const e of m.edges) {
          await page.locator(`[data-testid=map-edge][data-edge="${e.from}__${e.to}"]`).first().dispatchEvent('click');
          await expect(panel, `${m.id}/${e.from}->${e.to}`).toContainText('→');
          expect((await panel.innerText()).length).toBeGreaterThan(40);
        }
        await page.keyboard.press('Escape');
        await expect(panel).not.toContainText('→');
      }
    });

    test('tapping a box highlights the path back to the root', async ({ page }) => {
      await open(page, app);
      const nodes: { id: string }[] = await page.evaluate(() => (window as any).__study.content.maps[0].nodes);
      const last = nodes[nodes.length - 1].id;
      await page.locator(`[data-testid=map-node][data-node="${last}"]`).click();
      await expect(page.locator('.n-sel')).toHaveCount(1);
      expect(await page.locator('.n-path').count()).toBeGreaterThanOrEqual(1);
    });

    test('review mode tracks per-node progress and survives a reload', async ({ page }) => {
      await open(page, app);
      await page.getByRole('button', { name: 'Review', exact: true }).click();
      const nodes = page.locator('[data-testid=map-node]');
      expect(await nodes.evaluateAll((els) => els.every((e) => e.getAttribute('data-status') === 'unseen'))).toBe(true);
      const id = await nodes.nth(1).getAttribute('data-node');
      await nodes.nth(1).click();
      await expect(page.locator(`[data-testid=map-node][data-node="${id}"]`)).toHaveAttribute('data-status', 'seen');
      await page.reload();
      await page.waitForFunction(() => !!(window as any).__study);
      await page.getByRole('button', { name: 'Review', exact: true }).click();
      await expect(page.locator(`[data-testid=map-node][data-node="${id}"]`)).toHaveAttribute('data-status', 'seen');
      page.once('dialog', (d) => d.accept());
      await page.getByTestId('reset-progress').click();
      await expect(page.locator(`[data-testid=map-node][data-node="${id}"]`)).toHaveAttribute('data-status', 'unseen');
    });

    test('quiz this branch opens a quiz limited to the subtree', async ({ page }) => {
      await open(page, app);
      // choose the first non-root node whose branch has questions
      const target = await page.evaluate(() => {
        const s = (window as any).__study; const m = s.content.maps[0];
        const tagOf = (n: any) => n.quizTag ?? n.dive ?? n.id;
        const q = new Set(s.content.quiz.flatMap((x: any) => x.tags));
        const kids = (id: string) => m.edges.filter((e: any) => e.from === id).map((e: any) => e.to);
        const sub = (id: string, seen = new Set<string>()): string[] => { if (seen.has(id)) return []; seen.add(id); return [id, ...kids(id).flatMap((k: string) => sub(k, seen))]; };
        return m.nodes.filter((n: any) => n.id !== 'root').find((n: any) => sub(n.id).some((id) => q.has(tagOf(m.nodes.find((x: any) => x.id === id)))))?.id;
      });
      expect(target).toBeTruthy();
      await page.locator(`[data-testid=map-node][data-node="${target}"]`).click();
      await page.getByTestId('quiz-subtree').click();
      await expect(page).toHaveURL(/#\/quiz\?tags=/);
      await expect(page.getByTestId('qcard').first()).toBeVisible();
    });
  });
}
