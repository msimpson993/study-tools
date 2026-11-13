import { test, expect } from '@playwright/test';
import { open, trackErrors } from './helpers';

const FIG = '#/figure/expm';

test.describe('linear-systems: live figure (core Figure component)', () => {
  test('renders inline panels, presets and a collapsed More controls drawer', async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: 1400, height: 900 });
    await open(page, 'linear-systems', FIG);
    await expect(page.getByTestId('fig-stage')).toBeVisible();
    expect(await page.locator('[data-testid=fig-stage] canvas').count()).toBeGreaterThanOrEqual(2);
    expect(await page.locator('[data-testid=controls] details.st-more').evaluate((e) => (e as HTMLDetailsElement).open)).toBe(false);
    await expect(page.locator('[data-testid=controls] .st-presets button')).not.toHaveCount(0);
    expect(errs).toEqual([]);
  });

  test('expanded view covers only the figure area; sliders stay uncovered and live', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await open(page, 'linear-systems', FIG);
    const before = await page.locator('[data-testid=fig-stage] canvas').first().evaluate((c) => (c as HTMLCanvasElement).toDataURL().length);
    await page.locator('.st-xp').first().click();
    const overlay = page.getByTestId('fig-overlay');
    await expect(overlay).toBeVisible();
    const stage = (await page.getByTestId('fig-stage').boundingBox())!;
    const ov = (await overlay.boundingBox())!;
    expect(ov.x).toBeGreaterThanOrEqual(stage.x - 1); expect(ov.y).toBeGreaterThanOrEqual(stage.y - 1);
    expect(ov.x + ov.width).toBeLessThanOrEqual(stage.x + stage.width + 1); expect(ov.y + ov.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
    const slider = page.locator('[data-testid=controls] input[type=range]').first();
    await slider.scrollIntoViewIfNeeded();
    const sb = (await slider.boundingBox())!;
    expect(await page.evaluate(([x, y]) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest('[data-testid=fig-overlay]') === null, [sb.x + sb.width / 2, sb.y + sb.height / 2])).toBe(true);
    await slider.fill('-0.2');
    await expect.poll(() => page.locator('[data-testid=fig-overlay] canvas').first().evaluate((c) => (c as HTMLCanvasElement).toDataURL().length)).not.toBe(before);
    await expect(page.getByTestId('how-to-read')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });

  test('pair view shows both directions; legends are expandable and independent', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await open(page, 'linear-systems', FIG);
    await page.locator('.st-xp').first().click();
    await page.getByTestId('pair-open').click();
    await expect(page.getByTestId('fig-overlay')).toBeVisible();
    expect(await page.locator('[data-testid=fig-overlay] canvas').count()).toBe(2);
    await expect(page.getByTestId('pair-strip')).toBeVisible();
    const chips = page.getByTestId('legend-chip');
    expect(await chips.count()).toBe(2);
    await expect(page.getByTestId('legend-box').first()).toBeHidden();
    await chips.nth(0).click();
    await expect(page.getByTestId('legend-box').first()).toBeVisible();
    await expect(page.getByTestId('legend-box').nth(1)).toBeHidden();
    await page.getByTestId('fig-close').click();
    await expect(page.getByTestId('fig-overlay')).toBeHidden();
  });

  test('a preset is a setting of visible controls and round-trips through the URL', async ({ page }) => {
    await open(page, 'linear-systems', FIG);
    await page.locator('[data-testid=controls] .st-presets button', { hasText: /critical/i }).click();
    const hash = await page.evaluate(() => location.hash);
    expect(hash).toMatch(/a1=/);
    const vals = await page.locator('[data-testid=controls] input[type=range]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    await page.goto(`/linear-systems/index.html${hash}`); await page.reload(); await page.waitForFunction(() => !!(window as any).__study);
    const vals2 = await page.locator('[data-testid=controls] input[type=range]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    expect(vals2).toEqual(vals);
  });

  test('on a phone the figure stacks and nothing overflows', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'linear-systems', FIG);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.locator('[data-testid=fig-stage] canvas').first().click(); // on a phone a tap on the panel expands it
    await expect(page.getByTestId('fig-overlay')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
