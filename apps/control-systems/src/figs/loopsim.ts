// Port of the original page's appendix simulator (LOOPSIM): teaching plants with a delay, a lagged sensor, a nonlinearity, rate limits and a dead zone,
// which the core simulator does not model. Plant = optional static nonlinearity, K·(series of first-order lags), after an optional dead time.
export interface LoopOpts {
  taus?: number[]; K?: number; f?: (v: number) => number; delay?: number; sensTau?: number; Kp?: number; Ki?: number; Kd?: number; N?: number; b?: number; dmeas?: boolean;
  r?: (t: number) => number; d?: (t: number) => number; umax?: number; rmax?: number; dz?: number; aw?: boolean; T?: number; dt?: number;
}
export interface LoopOut { t: number[]; y: number[]; ym: number[]; u: number[] }
export function runLoop(o: LoopOpts): LoopOut {
  const dt = o.dt ?? 0.005, T = o.T ?? 20, n = Math.round(T / dt), taus = o.taus ?? [1], K = o.K ?? 1, m = taus.length;
  const Kp = o.Kp ?? 0, Ki = o.Ki ?? 0, Kd = o.Kd ?? 0, N = o.N ?? 20, b = o.b ?? 1, umax = o.umax ?? Infinity, rmax = o.rmax ?? Infinity, dz = o.dz ?? 0;
  const rf = o.r ?? (() => 1), df = o.d ?? (() => 0), f = o.f ?? ((v: number) => v);
  const nd = Math.round((o.delay ?? 0) / dt), buf = new Array<number>(nd).fill(0); let bi = 0;
  let x = new Array<number>(m).fill(0), ys = 0, xi = 0, xf = 0, uprev = 0;
  const tauS = o.sensTau ?? 0, out: LoopOut = { t: [], y: [], ym: [], u: [] };
  const deriv = (xx: number[], yss: number, vin: number, y: number) => {
    const d = new Array<number>(m + 1), inp = K * f(vin);
    for (let i = 0; i < m; i++) { const src = i === 0 ? inp : xx[i - 1]; d[i] = taus[i] === Infinity ? src : (src - xx[i]) / taus[i]; }
    d[m] = tauS ? (y - yss) / tauS : 0; return d;
  };
  for (let k = 0; k <= n; k++) {
    const t = k * dt, y = x[m - 1], ymeas = tauS ? ys : y, r = rf(t), e = r - ymeas, ed = o.dmeas ? -ymeas : e;
    const up = Kp * (b * r - ymeas), ud = Kd ? Kd * N * (ed - xf) : 0, uu = up + Ki * xi + ud;
    let us = Math.max(-umax, Math.min(umax, uu));
    if (rmax < Infinity) { const lim = rmax * dt; us = Math.max(uprev - lim, Math.min(uprev + lim, us)); }
    uprev = us;
    const va = Math.abs(us) <= dz ? 0 : us - Math.sign(us) * dz; let vd: number;
    if (nd > 0) { vd = buf[bi]; buf[bi] = va; bi = (bi + 1) % nd; } else vd = va;
    const vin = vd + df(t);
    out.t.push(t); out.y.push(y); out.ym.push(ymeas); out.u.push(us);
    if (!Number.isFinite(y) || Math.abs(y) > 1e5) break;
    let integ = e; if (o.aw && uu !== us && (uu - us) * e > 0) integ = 0;
    xi += Ki ? integ * dt : 0; xf += Kd ? N * (ed - xf) * dt : 0;
    const s0 = x.concat([ys]), k1 = deriv(x, ys, vin, y);
    const adv = (h: number, kk: number[]) => s0.map((v, i) => v + h * kk[i]);
    let a = adv(dt / 2, k1); const k2 = deriv(a.slice(0, m), a[m], vin, a[m - 1]);
    a = adv(dt / 2, k2); const k3 = deriv(a.slice(0, m), a[m], vin, a[m - 1]);
    a = adv(dt, k3); const k4 = deriv(a.slice(0, m), a[m], vin, a[m - 1]);
    x = x.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); ys += (dt / 6) * (k1[m] + 2 * k2[m] + 2 * k3[m] + k4[m]);
  }
  return out;
}
