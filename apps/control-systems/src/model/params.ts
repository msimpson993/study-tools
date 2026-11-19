/**
 * The three running examples' parameters, in ONE place (Malcolm: the corner may switch to the linear-systems corner,
 * 350 kg / 20 kN/m / 1.6 kN·s/m; change CORNER here and every corner figure follows; the page text and
 * test/numbers.test.ts quote the tutor's 400 / 25.6 k / 1.6 k numbers and would need the tutor's new numbers too).
 *
 * House: the core HOUSE model, imported unchanged (@study/core/models). Time in HOURS.
 * Corner: single-mass quarter car (rigid tyre, no wheel mass) unless the wheel is switched on (DOM only).
 * Dish: antenna positioner, azimuth axis, torque source at the axis.
 */
import { HOUSE, houseB } from '@study/core/models';

export { HOUSE, houseB };
/** Conductances implied by the core HOUSE A matrix: 1 /h between rooms, 0.2 /h to outdoors, with C_th = 1 MJ/K per room. */
export const HOUSE_WALLS = {
  /** W/K between the rooms (A[0][1] × C_th / 3600) */ Gin: (HOUSE.A[0][1] * HOUSE.Cth) / 3600,
  /** W/K from each room to outdoors */ Gout: ((-HOUSE.A[0][0] - HOUSE.A[0][1]) * HOUSE.Cth) / 3600,
  /** heater limit (W) */ Pmax: HOUSE.P,
} as const;

/** Quarter-car corner (kg, N/m, N·s/m). Alternative (linear-systems' CAR/4): { m: 350, k: 20000, c: 1600 }. */
export const CORNER = { m: 400, k: 25600, c: 1600 } as const;
/** The wheel, for DOM only: unsprung mass (kg) and tyre stiffness (N/m). */
export const WHEEL = { mu: 40, kt: 200000 } as const;
/** Active-suspension design targets (SF, OBS, SEP, REF). */
export const CORNER_DESIGN = { zeta: 0.8, wn: 10, observerSpeed: 5, rideStep: 0.02, bump: { h: 0.05, dur: 0.2 } } as const;

/** Antenna positioner: inertia (kg·m²), viscous friction (N·m·s/rad), torque limit (N·m), wind gust (N·m), amplifier lag (s, METHODS only). */
export const DISH = { J: 10, B: 20, Tmax: 200, wind: 20, lag: 0.05, step: 0.1, windAt: 10, noiseDeg: 0.01, Nf: 200 } as const;
/** The tuned dish PID (D on measurement), chosen by the tutor's grid search. */
export const DISH_TUNED = { Kp: 2000, Ki: 1000, Kd: 200 } as const;
/** A11 with a 50 ms sensor lag that can't be changed (numbers.py build 2): retunes that cut Kp and Ki much more than Kd, and the plain halving that makes it worse. */
export const DISH_LAG_RETUNE = { retune: { Kp: 600, Ki: 150, Kd: 90 }, slower: { Kp: 600, Ki: 150, Kd: 120 }, half: { Kp: 1000, Ki: 500, Kd: 100 } } as const;

/** Thermostat gains used on the page. */
export const THERMOSTAT = { Kp: 1100, Ki: 200, KpSoft: 500, front: -5 } as const;

/** Ku-band 1.2 m dish (P2): 3 dB beamwidth ≈ 70λ/D, pointing loss ≈ 12(θ/θ₃)² dB. */
export const BEAM = { theta3: 1.46 } as const;
