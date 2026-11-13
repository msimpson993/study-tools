import type { M2, V2 } from '@study/core';
import { eig2 } from '@study/core/dsp';

/** The running example: m = 1 kg, c = 3 N·s/m, k = 2 N/m;  x = (position, velocity), u = force, y = position. */
export const CART_A: M2 = [[0, 1], [-2, -3]];
export const CART_B: V2 = [0, 1];
export const CART_C: V2 = [1, 0];
export const num = (v: Record<string, number | string | boolean>, k: string) => v[k] as number;

export interface EigPair { lam: number; v: V2 }
/** Real eigenpairs of a 2×2 matrix with unit eigenvectors (none for a complex pair; one for a defective repeated eigenvalue). */
export function eigPairs(A: M2): EigPair[] {
  const ev = eig2(A);
  if (Math.abs(ev[0][1]) > 1e-9) return [];
  const out: EigPair[] = [];
  const lams = Math.abs(ev[0][0] - ev[1][0]) < 1e-9 ? [ev[0][0]] : [ev[0][0], ev[1][0]];
  for (const lam of lams) {
    let v: V2;
    if (Math.abs(A[0][1]) > 1e-9) v = [A[0][1], lam - A[0][0]];
    else if (Math.abs(A[1][0]) > 1e-9) v = [lam - A[1][1], A[1][0]];
    else v = Math.abs(lam - A[0][0]) < 1e-9 ? [1, 0] : [0, 1];
    const n = Math.hypot(v[0], v[1]); out.push({ lam, v: [v[0] / n, v[1] / n] });
  }
  // a diagonal matrix with a repeated eigenvalue is a multiple of I: every direction is an eigenvector (return the axes)
  if (lams.length === 1 && Math.abs(A[0][1]) < 1e-9 && Math.abs(A[1][0]) < 1e-9) return [{ lam: lams[0], v: [1, 0] }, { lam: lams[0], v: [0, 1] }];
  return out;
}
export const fmt = (x: number, d = 2) => (Math.abs(x) < 5e-3 ? '0' : x.toFixed(d)).replace('-', '−');
export const clampN = (x: number, lim: number) => Math.max(-lim, Math.min(lim, x));
