import { describe, it, expect } from 'vitest';
import { pickStepCardTarget, type StepCardBox } from '../src/cardlayout';

const pin = 80;
const viewH = 800;
/** Viewport-tall cards stacked with a 8 px gap, card 1 flush at the pin. */
function stack(offset: number): StepCardBox[] {
  const h = viewH, gap = 8;
  return [0, 1, 2].map((i) => {
    const top = pin - offset + i * (h + gap);
    return { top, bottom: top + h };
  });
}

describe('pickStepCardTarget', () => {
  it('does not snap back after a short scroll down from a flush card', () => {
    expect(pickStepCardTarget(stack(100), pin, viewH, 1, 0)).toBe(-1);
  });

  it('snaps to the next card when it is mostly in view', () => {
    expect(pickStepCardTarget(stack(0.58 * viewH), pin, viewH, 1, 0)).toBe(1);
  });

  it('snaps to the next card after a small overshoot past its top', () => {
    expect(pickStepCardTarget(stack(viewH + 40), pin, viewH, 1, 0)).toBe(1);
  });

  it('does not snap back after a short scroll up from a flush card', () => {
    // stack(h+gap) puts card 1 flush; scrolling up 100 px moves every top down the screen
    const start = stack(viewH + 8);
    const scrolled = start.map((c) => ({ top: c.top + 100, bottom: c.bottom + 100 }));
    expect(pickStepCardTarget(scrolled, pin, viewH, -1, 1)).toBe(-1);
  });

  it('snaps to the previous card when it is mostly in view while scrolling up', () => {
    const start = stack(viewH + 8);
    const scrolled = start.map((c) => ({ top: c.top + 0.58 * viewH, bottom: c.bottom + 0.58 * viewH }));
    expect(pickStepCardTarget(scrolled, pin, viewH, -1, 1)).toBe(0);
  });
});
