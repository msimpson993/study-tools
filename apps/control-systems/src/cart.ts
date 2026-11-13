/** The running example for this subject: the 1 kg cart, G(s) = 1/(s² + 3s + 2), under a proportional loop u = K·(r − y),
 *  optionally with a controller zero (PD): C(s) = K·(1 + s/|z|). Pure math on top of @study/core/dsp. */
import { tf, tfClosedLoop, polyMul, step, stepinfo, rlocus, rlocusRootsAt, type TF, type Cx } from '@study/core/dsp';

export const CART = tf([1], [1, 3, 2]);

/** Open-loop L(s)/K for the loop: plant, times (1 + s/zAbs) when zAbs > 0 (a controller zero at −zAbs). */
export function loopShape(zAbs: number): TF {
  return zAbs > 0 ? tf(polyMul([1 / zAbs, 1], CART.num), CART.den) : CART;
}
export const loopTF = (K: number, zAbs: number): TF => { const l = loopShape(zAbs); return tf(l.num.map((c) => c * K), l.den); };
export const closedLoop = (K: number, zAbs: number): TF => tfClosedLoop(loopTF(K, zAbs));
export const polesAt = (K: number, zAbs: number): Cx[] => rlocusRootsAt(loopShape(zAbs), K);
export const locusOf = (zAbs: number) => rlocus(loopShape(zAbs), { kmax: 40 });

/** Step metrics of the closed loop (unity feedback, unit step command). */
export function cartStepInfo(K: number, zAbs = 0) { return stepinfo(closedLoop(K, zAbs), { tEnd: 12, n: 1200 }); }
export const cartStep = (K: number, zAbs: number, tEnd = 8, n = 400) => step(closedLoop(K, zAbs), tEnd, n);
/** Damping ratio and natural frequency of the dominant closed-loop pair for the P-only loop: s² + 3s + (2 + K). */
export const pOnly = (K: number) => ({ wn: Math.sqrt(2 + K), zeta: 3 / (2 * Math.sqrt(2 + K)), ess: 2 / (2 + K) });
