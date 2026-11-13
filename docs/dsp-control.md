# Control math (`@study/core/dsp`: `tf`, `pid`)

Pure, DOM-free, unit-tested math for the control-systems pages. Import from `@study/core/dsp`.
The authoritative conventions live in the file headers (`packages/core/src/dsp/tf.ts`, `pid.ts`); this page is the map.

## Conventions (one-line each)
- Polynomials: `number[]`, **highest power first** (MATLAB order). `[1,3,2]` = s²+3s+2.
- `TF {num, den}`; `tf(num, den)` trims leading zeros and makes `den` monic. SISO, continuous time, real coefficients.
- Phase in **degrees**, continuously **unwrapped**; magnitude linear plus `magDb`. Frequencies in rad/s.
- Step/impulse/lsim use the **exact ZOH** discretisation of the controllable canonical form (a step is exact, no Euler error).
- `stepinfo` follows MATLAB: Tr 10→90 %, Ts = last time outside ±2 % (interpolated), %OS relative to |final|, ess = ref − final.
- PID: `u = Kp(b·r − y) + Ki∫(r − y) + Kd·N·s/(s+N)·e`. **Ki and Kd are gains** (Ki = Kp/Ti, Kd = Kp·Td); `N` is the filter pole in rad/s.

## `tf.ts` API
| Group | Exports |
|---|---|
| Polynomials | `polyTrim(p,tol?)`, `polyAdd/polySub/polyMul(a,b)`, `polyScale(p,k)`, `polyDeg`, `polyDeriv`, `polyEval(p,s:Cx):Cx`, `polyEvalReal(p,x)`, `polyFromRoots(roots:Cx[],k=1)`, `polyRoots(p):Cx[]` |
| Build | `tf(num,den)`, `tfFromPolesZeros(zeros,poles,gain=1)`, `tfSecondOrder(wn,zeta)` |
| Algebra | `tfSeries(a,b)`, `tfParallel(a,b)`, `tfFeedback(G,H=1,sign=-1)`, `tfClosedLoop(L)` (unity −), `tfSensitivity(L)` = 1/(1+L) |
| Queries | `tfPoles`, `tfZeros`, `dcGain`, `isProper`, `isStrictlyProper`, `isStable(G,tol)` |
| Frequency | `tfEval(G,s)`, `freqresp(G,w)`, `logspace(wmin,wmax,n)`, `bode(G,w[]) → {w,mag,magDb,phaseDeg}`, `margins(L,wmin=1e-3,wmax=1e3,n=4000) → {gm,gmDb,wcg,pm,wcp,all}` |
| Time | `tf2ss(G) → {A,B,C,D}`, `c2dZoh(ss,dt)`, `timeGrid(tEnd,n)`, `lsim(G,u[],t[],x0?)`, `step(G,tEnd or t[],n=2000)`, `impulse(G,tEnd or t[],n=2000)` → `{t,y}` |
| Metrics | `stepMetrics(t,y,{final?,ref?,band?,lo?,hi?})`, `stepinfo(G,{…,tEnd?,n?})` → `{yFinal,riseTime,t10,t90,peak,peakTime,overshootPct,undershootPct,settlingTime,settled,ess,band,stable}` |

Errors are `TFError` (non-finite coefficients, zero denominator, improper TF in a time-domain call, bad grid…).

### Limitations (deliberate, documented)
- Root finder: Aberth–Ehrlich + Newton polish; good to degree ≈ 12 with sane scaling. A root of multiplicity *m* is accurate only to ≈ ε^(1/m) (e.g. (s+1)³ ≈ 1e-5).
- Improper TFs have a frequency response only; `impulse` of a biproper TF omits the D·δ(t) term.
- No delays (Padé yourself), no MIMO, no discrete-time TFs.
- `stepinfo` of an unstable TF returns NaNs with `stable:false` (never a made-up number). `margins` scans a log grid (default 1e-3…1e3 rad/s, 4000 pts) and interpolates linearly in log ω: crossings outside the grid are not found, `gm/pm` report the worst crossing (`all` lists every one), and it does not run a Nyquist test, so read margins only for loops whose closed loop is stable.

## `pid.ts` API
| Export | Meaning |
|---|---|
| `PID_PLANTS` | `{p1,p2,p3}` → `{name,label,tf}`: 1/(s+1), 1/(0.5s²+1.5s+1), 1/(s+1)³ (the legacy page's plants) |
| `pidTF({Kp,Ki,Kd,N?})` | C(s) = Kp + Ki/s + Kd·N·s/(s+N) (N default 20; Kd=0 drops the filter) |
| `pidLoopTF(plant,g)`, `pidClosedLoopTF(plant,g)`, `pidClosedLoopPoles(plant,g)` | L = C·G; T = L/(1+L); poles of 1+L (use with the s-plane / root-locus views) |
| `simulatePid(o: PidSimOptions): PidSim` | fixed-step closed loop; see below |
| `pidMetrics(sim,{tEnd?,ref?,band?})` | `{iae,ise,overshootPct,settlingTime,ess,peakU,riseTime,peak,peakTime,yFinal,settled,unstable}` |
| `seededRng(seed)` | the legacy xorshift32 uniform generator (for reproducible noise) |

`PidSimOptions`: `plant: 'p1' or 'p2' or 'p3' or TF` (must be **strictly proper**), `Kp,Ki,Kd,N=20`, `b=1` (setpoint weight, 0…1), `dOnMeasurement=false`, `T=20`, `dt=0.01`, `r=1`, `umax` (null/Infinity = none), `aw='none' or 'clamp' or 'backcalc'`, `Kt` (back-calc gain; default Ki/Kp, else 1), `dist={t,amp}` (step added at the **plant input**), `noise` (σ), `noiseTs=0.01`, `seed=12345`.
`PidSim`: `t, r, y, u` (applied, saturated), `e` (true r−y), `ym` (measured), `up, ui, ud, d`, `unstable`, `substeps`, `dt`, `warnings`.

### Numerics
RK4 with automatic substeps so that h·|λ|max ≤ 0.2 (RK4 is stable to 2.78) for the fastest of the plant poles, `N` and the closed-loop poles; capped at 400 substeps with a `warnings` entry when the cap binds. Setpoint/disturbance/saturation discontinuities are resolved to O(h). A loop with |y| > 1e4 stops with `unstable:true`.

### Agreement with the legacy page (`pid-tuning/src/pidsim.js`)
Frozen fixture `packages/core/test/fixtures/pidsim-legacy.json` (6 cases: PI/PID/P, saturation + disturbance, clamp AW, D-on-measurement + seeded noise). y/u/e agree to 1e-9 when `substeps = 1` and to 2e-5 where we substep (legacy is plain RK4 at `dt`). Deliberate differences: (1) substepping; (2) metrics — overshoot is relative to |final| (legacy returns NaN for a final ≤ 0) and Ts is interpolated to the band edge (legacy: first sample after the last violation); (3) additions — `b`, `'backcalc'`, IAE/ISE, `noiseTs`. The linear (unsaturated, noise-free) loop is also checked against `step()` of the analytic closed-loop TF to 1e-7, including `b` and D-on-measurement.

## `rlocus.ts` API (root locus)
Locus of the closed-loop poles of **D(s) + K·N(s) = 0**, K ≥ 0 (`negative: true`: D − K·N, the complement/positive-feedback locus). `L` must be **strictly proper**; N carries its own gain (a negative leading coefficient of N flips which side is the K > 0 locus, and the asymptote angles account for it).

| Export | Meaning |
|---|---|
| `rlocus(L, {negative?, kmax?, rmax?, tol?=0.03, maxSteps?=4000}): RLocus` | traces the locus; throws `TFError` for improper / zero-numerator L or degree > 14 |
| `RLocus` | `{poles, zeros, n, m, sign, K[], branches[b][i], centroid, asymptoteAngles[] (deg), breakaways[{s,K,kind:'breakaway' or 'break-in'}], crossings[{w,K}], scale, warnings[]}`; branch *b* starts at open-loop pole *b* and `branches[b][i]` is its position at gain `K[i]` |
| `rlocusRootsAt(L, K, sign=1)` | closed-loop poles at one gain (exact root finding, not interpolated) |
| `rlocusPolesAt(rl, K, L)` | the same, **ordered by branch** (matched to the nearest swept gain) so a slider dot can take its branch colour |
| `rlocusGainAt(L, s, sign=1)` | `{K: Cx, kMag, angleErrDeg}`: the complex gain that would put a pole at s (on the locus ⇔ real ≥ 0) and the angle-criterion error |
| `rlocusNearest(rl, s)` | nearest swept sample `{branch, index, s, K, dist}` (for click-to-read-gain) |
| `rlocusStableIntervals(L, rl)` | gain intervals `[K1, K2≤∞]` with all poles in the open LHP (uses the jω crossings) |

Method: numeric sweep with an adaptive step (optimal Kuhn–Munkres matching of old to new roots; a step is accepted only if the biggest root move is < `tol·scale` and < 0.4× the smallest root separation, so branches cannot swap) plus **algebraic** special points that do not depend on the sweep: asymptote centroid/angles from coefficients, real breakaway/break-in points from the real roots of D′N − DN′ with K = −D/N ≥ 0, and jω crossings from Re D·Im N − Im D·Re N = 0 (ω = 0 separately), each crossing verified by its residual.

Limitations: built on `polyRoots`, so degree ≲ 10 (crossings ≲ 6 because that polynomial has degree 2n−1; they are never reported unverified, but can be missed); repeated open-loop poles start from roots good to ε^(1/m) (shape right, `warnings` notes a reached step floor); the sweep stops at radius `rmax` (default 5·scale), `kmax` or `maxSteps` (a warning says which); no delays, MIMO or discrete time.
