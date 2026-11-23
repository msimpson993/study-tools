import { test, expect } from '@playwright/test';
import { open } from './helpers';

/* CS pass 5 (student findings on 45013a8): box lists render as bullet lists, the toolkit's Next questions name the side path once,
   the copy button is a phone tap target. */
async function openBox(page: import('@playwright/test').Page, id: string) {
  await open(page, 'control-systems');
  await page.locator('button[role=tab][data-map="detail"]').first().click(); await page.waitForTimeout(100);
  await page.locator(`[data-testid=map-node][data-node="${id}"]`).first().dispatchEvent('click'); await page.waitForTimeout(200);
}
for (const W of [1280, 390]) {
  test(`@${W}: Tuning toolkit and When it misbehaves show real bullet lists, no stray dashes`, async ({ page }) => {
    await page.setViewportSize({ width: W, height: 900 });
    for (const [id, n] of [['TOOLKIT', 3], ['FAIL', 5]] as const) {
      await openBox(page, id);
      const ans = page.getByTestId('pop-answer');
      await expect(ans.locator('ul > li'), id).toHaveCount(n);
      await expect(ans.locator('li strong').first(), id).toBeVisible();
      expect(await ans.locator('p').evaluateAll((ps) => ps.some((p) => /(^|\s)- \S/.test(p.textContent ?? ''))), `${id}: no '- ' inside a paragraph`).toBe(false);
    }
  });
  test(`@${W}: the toolkit's Next questions say 'Side path (a detour; come back here)' once, over six questions`, async ({ page }) => {
    await page.setViewportSize({ width: W, height: 900 });
    await openBox(page, 'TOOLKIT');
    const nx = page.getByTestId('pop-next');
    await expect(nx.getByTestId('pop-next-group-tag')).toHaveCount(1);
    expect(((await nx.innerText()).match(/side path \(a detour; come back here\)/gi) ?? []).length).toBe(1);
    await expect(nx.getByTestId('pop-next-link')).toHaveCount(6);
  });
}
test('@390: the pop-up copy button is at least 32 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openBox(page, 'TOOLKIT');
  const b = await page.getByTestId('map-panel').getByTestId('copy-ref').boundingBox();
  expect(b!.height).toBeGreaterThanOrEqual(31.5); expect(b!.width).toBeGreaterThanOrEqual(31.5);
});
