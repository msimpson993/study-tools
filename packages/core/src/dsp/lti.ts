export type Mat = number[][];

export const eye = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
export const matMul = (A: Mat, B: Mat): Mat => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
export const matAdd = (A: Mat, B: Mat): Mat => A.map((r, i) => r.map((v, j) => v + B[i][j]));
export const matScale = (A: Mat, k: number): Mat => A.map((r) => r.map((v) => v * k));
const norm1 = (A: Mat) => Math.max(...A[0].map((_, j) => A.reduce((s, r) => s + Math.abs(r[j]), 0)));

/** Matrix exponential e^{A} by scaling-and-squaring with a Taylor series (fine for small, well-scaled A). */
export function expm(A: Mat): Mat {
  const n = A.length;
  const s = Math.max(0, Math.ceil(Math.log2(Math.max(norm1(A), 1e-16))) + 1);
  const As = matScale(A, 1 / 2 ** s);
  let term = eye(n), sum = eye(n);
  for (let k = 1; k <= 20; k++) { term = matScale(matMul(term, As), 1 / k); sum = matAdd(sum, term); }
  for (let i = 0; i < s; i++) sum = matMul(sum, sum);
  return sum;
}

/** State transition matrix Φ(t) = e^{At}. */
export const stateTransition = (A: Mat, t: number): Mat => expm(matScale(A, t));

/** Eigenvalues of a real 2×2 matrix: returns [re, im] pairs. */
export function eig2(A: Mat): [number, number][] {
  const tr = A[0][0] + A[1][1], det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const disc = tr * tr / 4 - det;
  if (disc >= 0) { const r = Math.sqrt(disc); return [[tr / 2 + r, 0], [tr / 2 - r, 0]]; }
  const r = Math.sqrt(-disc); return [[tr / 2, r], [tr / 2, -r]];
}

/** Companion matrix of s² + a1 s + a0 (phase variables x1 = y, x2 = y'). */
export const companion2 = (a1: number, a0: number): Mat => [[0, 1], [-a0, -a1]];

/** Controllability matrix [B AB … A^{n−1}B] (B as a column vector). */
export function ctrbMatrix(A: Mat, B: number[]): Mat {
  const n = A.length;
  const cols: number[][] = [];
  let v = B.slice();
  for (let k = 0; k < n; k++) { cols.push(v); v = A.map((r) => r.reduce((s, a, j) => s + a * v[j], 0)); }
  return A.map((_, i) => cols.map((c) => c[i]));
}

/** Observability matrix [C; CA; …; CA^{n−1}] (C as a row vector). */
export function obsvMatrix(A: Mat, C: number[]): Mat {
  const n = A.length;
  const rows: number[][] = [];
  let v = C.slice();
  for (let k = 0; k < n; k++) { rows.push(v); v = A[0].map((_, j) => v.reduce((s, c, i) => s + c * A[i][j], 0)); }
  return rows;
}

/** Numerical rank by Gaussian elimination with partial pivoting. */
export function rank(M: Mat, tol = 1e-9): number {
  const A = M.map((r) => r.slice());
  let rnk = 0;
  const rows = A.length, cols = A[0].length;
  for (let c = 0; c < cols && rnk < rows; c++) {
    let p = rnk;
    for (let r = rnk + 1; r < rows; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < tol) continue;
    [A[rnk], A[p]] = [A[p], A[rnk]];
    for (let r = rnk + 1; r < rows; r++) { const f = A[r][c] / A[rnk][c]; for (let k = c; k < cols; k++) A[r][k] -= f * A[rnk][k]; }
    rnk++;
  }
  return rnk;
}
