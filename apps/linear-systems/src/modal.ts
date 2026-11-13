import { stateTransition, companion2, eig2, type Mat } from '@study/core/dsp';

export interface ModalModel {
  A: Mat;
  eig: [number, number][];
  /** true when the eigenvalues are real and distinct, so V is real and invertible */
  diagonalizable: boolean;
  V?: Mat;
  Vinv?: Mat;
}

/** Companion matrix of s² + a1 s + a0 and, when it exists, its real eigenbasis V = [v1 v2], v_i = [1, λ_i]ᵀ. */
export function modalModel(a1: number, a0: number): ModalModel {
  const A = companion2(a1, a0);
  const eig = eig2(A);
  const distinctReal = eig[0][1] === 0 && Math.abs(eig[0][0] - eig[1][0]) > 1e-6;
  if (!distinctReal) return { A, eig, diagonalizable: false };
  const [l1, l2] = [eig[0][0], eig[1][0]];
  const V: Mat = [[1, 1], [l1, l2]];
  const det = l2 - l1;
  const Vinv: Mat = [[l2 / det, -1 / det], [-l1 / det, 1 / det]];
  return { A, eig, diagonalizable: true, V, Vinv };
}

/** x(t) = e^{At} x0 on a uniform grid. */
export function stateTrajectory(A: Mat, x0: [number, number], tmax: number, n = 240) {
  const t: number[] = [], x1: number[] = [], x2: number[] = [];
  for (let i = 0; i <= n; i++) {
    const ti = (tmax * i) / n;
    const P = stateTransition(A, ti);
    t.push(ti); x1.push(P[0][0] * x0[0] + P[0][1] * x0[1]); x2.push(P[1][0] * x0[0] + P[1][1] * x0[1]);
  }
  return { t, x1, x2 };
}

/** ξ_i(t) = ξ_i(0) e^{λ_i t} with ξ(0) = V⁻¹ x0 (only when diagonalizable). */
export function modalTrajectory(m: ModalModel, x0: [number, number], tmax: number, n = 240) {
  if (!m.diagonalizable || !m.Vinv) return null;
  const xi0 = [m.Vinv[0][0] * x0[0] + m.Vinv[0][1] * x0[1], m.Vinv[1][0] * x0[0] + m.Vinv[1][1] * x0[1]];
  const t: number[] = [], z1: number[] = [], z2: number[] = [];
  for (let i = 0; i <= n; i++) {
    const ti = (tmax * i) / n;
    t.push(ti); z1.push(xi0[0] * Math.exp(m.eig[0][0] * ti)); z2.push(xi0[1] * Math.exp(m.eig[1][0] * ti));
  }
  return { t, z1, z2, xi0 };
}
