/** Y-range and an optional zoomed inset for the motor open/closed load-response plot. */

export type LoopView = 'open' | 'closed' | 'both';

/** Pad a range around `vals` so a curve fills the frame without sitting on the axis. */
export function paddedRange(vals: number[], ref = 0): [number, number] {
  const lo = Math.min(ref, ...vals);
  const hi = Math.max(ref, ...vals);
  const span = Math.max(hi - lo, 1e-12);
  return [lo - 0.08 * span, hi + 0.12 * span];
}

export function seriesSpan(vals: number[]): number {
  if (!vals.length) return 0;
  return Math.max(...vals) - Math.min(...vals);
}

/** How much of a y-range a curve covers (0–1). */
export function spanFraction(vals: number[], range: [number, number]): number {
  const rs = range[1] - range[0];
  return rs > 0 ? seriesSpan(vals) / rs : 0;
}

export interface MotorPlotLayout {
  main: [number, number];
  /** Zoomed range for a curve that would be a flat line on the main plot. */
  inset?: [number, number];
  insetFor?: 'closed' | 'open';
  shrinkFactor?: number;
  note?: string;
}

/**
 * Autoscale the motor plot.
 * - open or closed only: the y range fits that curve.
 * - both: the main range fits both; if one curve covers less than `minFrac` of that
 *   range (the closed loop on a 7 s axis is ~0.3 %), it gets a zoomed inset.
 */
export function motorPlotLayout(
  openY: number[],
  closedY: number[],
  loop: LoopView,
  opts?: { minFrac?: number },
): MotorPlotLayout {
  const minFrac = opts?.minFrac ?? 0.30;
  if (loop === 'open') return { main: paddedRange(openY) };
  if (loop === 'closed') return { main: paddedRange(closedY) };
  const both = paddedRange([...openY, ...closedY]);
  const closedFrac = spanFraction(closedY, both);
  const openFrac = spanFraction(openY, both);
  if (closedFrac < minFrac && closedFrac <= openFrac) {
    const factor = seriesSpan(openY) / Math.max(seriesSpan(closedY), 1e-12);
    return {
      main: both,
      inset: paddedRange(closedY),
      insetFor: 'closed',
      shrinkFactor: factor,
      note: `y zoomed · closed loop ×${Math.round(factor)} smaller`,
    };
  }
  if (openFrac < minFrac) {
    const factor = seriesSpan(closedY) / Math.max(seriesSpan(openY), 1e-12);
    return {
      main: both,
      inset: paddedRange(openY),
      insetFor: 'open',
      shrinkFactor: factor,
      note: `y zoomed · open loop ×${Math.round(factor)} smaller`,
    };
  }
  return { main: both };
}
