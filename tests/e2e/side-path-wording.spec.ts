import { test, expect } from '@playwright/test';
import { open } from './helpers';

/* Side-path wording (CS pass 3, Nov 21): a side line's header, its box's tag and the legend use the same term. A detour is never
   called a shortcut or a quicker way. Both apps (shared core; Malcolm, Nov 21); header text from the tutor's pass 3 L1. */
test('control-systems Full detail: every side line reads as a detour, in the header and the legend', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, 'control-systems');
  await page.locator('button[role=tab][data-map="detail"]').first().click(); await page.waitForTimeout(100);
  const sides: string[] = await page.evaluate(() => (window as any).__study.content.maps[1].edges.filter((e: any) => e.side).map((e: any) => `${e.from}__${e.to}`));
  expect(sides.length).toBe(18); // pass 4: TUNE → TOOLKIT joins the 17
  await expect(page.locator('[data-legend=side]')).toHaveText(/side path \(a detour; come back here\)/);
  for (const k of sides) {
    await page.locator(`[data-testid=map-edge][data-edge="${k}"]`).first().dispatchEvent('click');
    const kind = page.getByTestId('edge-kind');
    await expect(kind, k).toHaveText('Side path (a detour; come back here): an extra question off the main path');
    await expect(kind, k).not.toContainText(/shortcut|quicker/i);
  }
});
// both apps share the wording (Malcolm, Nov 21); LS PZ → STAB really leads on, so it is a shortcut
test('linear-systems: the PZ → STAB shortcut keeps its name in the header and the legend', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, 'linear-systems');
  await expect(page.locator('[data-legend=side]')).toHaveText(/side path \(shortcut\)/);
  await page.locator('[data-testid=map-edge][data-edge="PZ__STAB"]').first().dispatchEvent('click');
  await expect(page.getByTestId('edge-kind')).toHaveText('Side path (shortcut): an extra question off the main path');
});
