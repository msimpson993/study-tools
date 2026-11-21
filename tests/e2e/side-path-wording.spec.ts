import { test, expect } from '@playwright/test';
import { open } from './helpers';

/* Side-path wording (CS pass 3, Nov 21): a side line's header, its box's tag and the legend use the same term. A detour is never
   called a shortcut or a quicker way; a line that really skips ahead (LS PZ → STAB) stays a shortcut. */
test('control-systems Full detail: every side line reads as a detour, in the header and the legend', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, 'control-systems');
  await page.locator('button[role=tab][data-map="detail"]').first().click(); await page.waitForTimeout(100);
  const sides: string[] = await page.evaluate(() => (window as any).__study.content.maps[1].edges.filter((e: any) => e.side).map((e: any) => `${e.from}__${e.to}`));
  expect(sides.length).toBe(17);
  await expect(page.locator('[data-legend=side]')).toHaveText(/side path \(a detour; come back here\)/);
  for (const k of sides) {
    await page.locator(`[data-testid=map-edge][data-edge="${k}"]`).first().dispatchEvent('click');
    const kind = page.getByTestId('edge-kind');
    await expect(kind, k).toContainText('Side path (a detour; come back here)');
    await expect(kind, k).not.toContainText(/shortcut|quicker/i);
  }
});
test('linear-systems: the PZ → STAB shortcut keeps its name in the header and the legend', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, 'linear-systems');
  await expect(page.locator('[data-legend=side]')).toHaveText(/side path \(shortcut\)/);
  await page.locator('[data-testid=map-edge][data-edge="PZ__STAB"]').first().dispatchEvent('click');
  await expect(page.getByTestId('edge-kind')).toContainText('Side path (shortcut)');
  await expect(page.getByTestId('edge-kind')).not.toContainText(/quicker/i);
});
