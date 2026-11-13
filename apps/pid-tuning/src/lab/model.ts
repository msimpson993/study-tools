/**
 * The PID Lab model: the original page's controls and presets, run on the core simulator (`simulatePid`, `pidMetrics`).
 * No DOM here, so the unit test can compare it with the frozen legacy PIDSIM.
 */
import { simulatePid, pidMetrics, pidClosedLoopPoles, pidLoopTF, margins, type PlantId, type PidSim, type PidMetrics, type PidSimOptions, type AntiWindup, type Cx, type Margins } from '@study/core/dsp';

export type Gains = [number, number, number];
/** The legacy page's presets: [Kp, Ki, Kd] per plant (null = not offered for that plant). */
export const PRE: Record<PlantId, Record<'P' | 'PI' | 'PID' | 'I' | 'Ku' | 'ZN', Gains | null>> = {
  p3: { P: [2, 0, 0], PI: [1, 0.4, 0], PID: [2, 0.8, 1.6], I: [0, 0.3, 0], Ku: [8, 0, 0], ZN: [4.8, +(4.8 / (Math.PI / Math.sqrt(3))).toFixed(2), +((4.8 * Math.PI) / (4 * Math.sqrt(3))).toFixed(2)] },
  p2: { P: [4, 0, 0], PI: [2, 2, 0], PID: [4, 4, 0.8], I: [0, 0.5, 0], Ku: null, ZN: null },
  p1: { P: [3, 0, 0], PI: [2, 4, 0], PID: [3, 5, 0.2], I: [0, 0.25, 0], Ku: null, ZN: null },
};
/** Time window the legacy page picks for a preset (the I preset is slow). */
export const windowFor = (plant: PlantId, preset: keyof typeof PRE.p3) => (preset === 'I' ? (plant === 'p3' ? 60 : 20) : plant === 'p3' ? 30 : 10);

export interface LabValues { plant: PlantId; Kp: number; Ki: number; Kd: number; N: number; T: number; dist: boolean; noise: boolean; sat: boolean; aw: AntiWindup; dm: boolean }
export const DIST_AMP = -0.5, NOISE_SIGMA = 0.01, UMAX = 1.2, LAB_SEED = 99;

export function labOptions(v: LabValues): PidSimOptions {
  return {
    plant: v.plant, Kp: v.Kp, Ki: v.Ki, Kd: v.Kd, N: v.N, T: v.T, dt: 0.01,
    dist: v.dist ? { t: v.T / 2, amp: DIST_AMP } : null, noise: v.noise ? NOISE_SIGMA : 0, umax: v.sat ? UMAX : null, aw: v.aw, dOnMeasurement: v.dm, seed: LAB_SEED,
  };
}
export interface LabRun { v: LabValues; sim: PidSim; m: PidMetrics; poles: Cx[]; maxRe: number; mg: Margins | null; saturated: boolean }
export function runLab(v: LabValues): LabRun {
  const sim = simulatePid(labOptions(v)), m = pidMetrics(sim, { tEnd: v.dist ? v.T / 2 : undefined });
  let poles: Cx[] = [], mg: Margins | null = null;
  const any = v.Kp || v.Ki || v.Kd;
  if (any) { poles = pidClosedLoopPoles(v.plant, v); mg = margins(pidLoopTF(v.plant, v), 1e-3, 1e3, 700); }
  const maxRe = poles.length ? Math.max(...poles.map((p) => p.re)) : -Infinity;
  const saturated = v.sat ? sim.u.some((x) => Math.abs(x) >= UMAX - 1e-9) : false;
  return { v, sim, m, poles, maxRe, mg, saturated };
}
/** The one-line verdict the legacy page printed under the plot. */
export function verdict(r: LabRun): { level: 'ok' | 'warn' | 'bad'; text: string } {
  let level: 'ok' | 'warn' | 'bad' = 'ok', msg: string;
  if (r.sim.unstable || (r.maxRe > 1e-3 && !r.saturated)) { level = 'bad'; msg = `Unstable: a closed-loop pole has Re = ${r.maxRe.toFixed(3)} > 0, the response diverges.`; }
  else if (r.maxRe > 1e-3) { level = 'bad'; msg = `The linear loop is unstable (max Re = ${r.maxRe.toFixed(3)}); the actuator limit keeps it bounded, so you see a sustained oscillation (a limit cycle).`; }
  else if (r.maxRe > -2e-3) { level = 'warn'; msg = 'Marginally stable: poles on the jω axis, so the oscillation is sustained (this gain is Kᵤ if P-only).'; }
  else { msg = 'Stable: all closed-loop poles are in the left half-plane.'; if (!r.m.settled) msg += ' Not settled inside the window: lengthen it.'; }
  if (r.saturated) { msg += ' The actuator saturates, so poles and margins describe the unsaturated loop only.'; if (level === 'ok') level = 'warn'; }
  return { level, text: msg };
}
