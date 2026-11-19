import { test, expect } from '@playwright/test';
import { open, trackErrors } from './helpers';

/** The opt-in sound players (earbud only): nothing plays until Play is pressed; Stop silences everything. */
const stats = (page: import('@playwright/test').Page) => page.evaluate(() => { const a = (window as any).__studyAudio; return a ? { ...a.stats, playing: a.playing() } : null; });
const openPop = async (page: import('@playwright/test').Page, id: string) => { await page.locator(`[data-testid=map-node][data-node="${id}"]`).dispatchEvent('click'); await page.getByTestId('pop-audio').first().waitFor(); };

test.describe('linear-systems: sound examples', () => {
  test('pop-ups show players but nothing is created or played without a click', async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'linear-systems', '#/');
    for (const id of ['LIN', 'KICK', 'TONE', 'FOUR']) {
      await openPop(page, id);
      expect(await page.getByTestId('audio').count()).toBeGreaterThanOrEqual(1);
      const s = await stats(page); expect(s?.contextCreated).toBe(false); expect(s?.started).toBe(0);
    }
    // no car box has sound
    for (const id of ['STATE', 'MODES', 'STAB', 'INOUT', 'WORK']) { await page.locator(`[data-testid=map-node][data-node="${id}"]`).dispatchEvent('click'); await page.waitForTimeout(150); expect(await page.getByTestId('audio').count(), id).toBe(0); }
    expect(await page.locator('audio').count()).toBe(0);
    expect((await stats(page))?.contextCreated).toBe(false);
    expect(errs).toEqual([]);
  });

  test('Play starts one short clip at a low level, Stop ends it, the volume is a master control', async ({ page }) => {
    await open(page, 'linear-systems', '#/');
    await openPop(page, 'TONE');
    await page.getByTestId('audio-play').first().click();
    await expect.poll(async () => (await stats(page))?.playing).toBe(1);
    let s = await stats(page); expect(s?.contextCreated).toBe(true); expect(s?.started).toBe(1);
    await page.waitForTimeout(400); // the cursor moves on the gain curve while it plays
    await page.getByTestId('audio-stop').first().click();
    await expect.poll(async () => (await stats(page))?.playing).toBe(0);
    s = await stats(page); expect(s?.stopped).toBeGreaterThanOrEqual(1);
    await page.getByTestId('audio-volume').first().fill('0.2');
    expect(await page.evaluate(() => (window as any).__studyAudio.volume())).toBeCloseTo(0.2, 5);
    // closing the pop-up also stops its sound
    await page.getByTestId('audio-play').first().click(); await expect.poll(async () => (await stats(page))?.playing).toBe(1);
    await page.keyboard.press('Escape'); await page.locator('[data-testid=map-node][data-node="SYS"]').dispatchEvent('click');
    await expect.poll(async () => (await stats(page))?.playing).toBe(0);
  });
});
