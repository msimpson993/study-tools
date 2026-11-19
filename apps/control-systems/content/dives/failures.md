---
id: failures
order: 21
title: "When it misbehaves: 14 symptom cards"
category: pid
neighbors: [tuning, lab, windup, derivative]
level: Conceptual
check: [q-fail, ck-fail-1]
---

**The question:** the loop misbehaves; which symptom is it, what causes it, and which knob fixes it? This is the side box *When it misbehaves*, under *Choosing the three gains*.

### The big idea

Most PID trouble falls into a handful of patterns you can recognise from the plots: read the symptom, name the cause, turn one knob. Each card below shows the problem (solid) against a fixed version (dashed green).

### See it

The table sums up all 14 cards; each card below has its own figure, in order from A1 to A14.

#### The cards at a glance

| card | symptom | cause | fix | in the chain |
|---|---|---|---|---|
| A1 · Slow response | sluggish slew | gains too low (dish: Tₛ 4.92 s at (400, 100, 80)) | raise the gains | [Turn up the gain](#/dive/ctrl) |
| A2 · Steady-state offset | sits off-target in wind | no I (dish: 1.15° at Kp 1000) | add Ki | [Why it stops short](#/dive/sse) |
| A3 · Overshoot | big overshoot | too little Kd or too much Ki (dish: 80 % at (1000, 500, 0)) | add Kd or cut Ki | [Derivative action](#/dive/derivative) |
| A4 · Sustained oscillation | keeps ringing | Ki near the bound (2 + 0.1Kd)Kp | back off | [Integral action](#/dive/integral) |
| A5 · Poor disturbance rejection | blown off by gusts | gains too low (dish: 2.08° at (500, 250, 100)) | raise Kp, Ki and Kd | [Choosing the three gains](#/dive/tuning) |
| A6 · Noisy, jittery actuator | jittery torque | Kd too high, no filter | lower N_f or Kd | [Why not infinite gain?](#/dive/fb) |
| A7 · Integrator windup | huge overshoot after a long slew | integrator windup (dish: 21.6 % at 2 rad) | anti-windup | [When the push hits its limit](#/dive/windup) |
| A8 · Derivative kick | torque spike at a command step | D on error | D on measurement | [Derivative action](#/dive/derivative) |
| A9 · Actuator limits | can't slew faster | torque limit | accept it, or a bigger motor | [When the push hits its limit](#/dive/windup) |
| A10 · Time delay | oscillates at gains that simulate fine | dead time (dish: 40.3 % at 50 ms) | lower gains | — |
| A11 · Sensor lag | extra lag | slow encoder or filter | faster sensor | [Recipes: by hand, Ziegler–Nichols, PID Tuner](#/dive/methods) |
| A12 · Nonlinearity | fine big, bad small | stiction (dish: 23.5 % short on a 0.02 rad step) | no gain fix | [Write the plant down](#/dive/model) |
| A13 · Tracking against gust rejection | good tracking or good gust rejection, not both | one-degree-of-freedom compromise | set-point weighting | [Follow a command](#/dive/refin) |
| A14 · Limit cycle | small steady hunting | stiction plus I (dish: ±0.15°, 23.9 s period) | integrator dead band | [Integral action](#/dive/integral) |

Twelve cards run on the antenna dish, G = 0.1/(s(s + 2)), with D on the measurement, a 0.1 rad step and 20 N·m of wind unless noted; A12 and A14 run on the dish with stiction (illustrative values; not in lecture notes).

<a id="fail-slow"></a>

#### A1 · Slow response

**Symptom:** sluggish slew. **Cause:** gains too low. **Fix:** raise them.

**On the dish:** (400, 100, 80) overshoots only 7.7 % but rises in 0.352 s and settles in 4.92 s; the tuned (2000, 1000, 200) gives 7.4 %, 0.156 s and 2.20 s.

```figure:fail-slow
```

<a id="fail-offset"></a>

#### A2 · Steady-state offset

**Symptom:** sits off-target in wind. **Cause:** no I. **Fix:** add Ki.

**On the dish:** PD (1000, 0, 120) is left 1.146° off for good in 20 N·m of wind; (1000, 500, 120) peaks at 1.13° and clears it (< 0.05°) in 6.09 s.

```figure:fail-offset
```

<a id="fail-overshoot"></a>

#### A3 · Overshoot

**Symptom:** big overshoot. **Cause:** too little Kd or too much Ki. **Fix:** add Kd or cut Ki.

**On the dish:** (1000, 500, 0), no D: 80.2 % overshoot. Kd = 120: 11.7 %, settled in 2.68 s.

```figure:fail-overshoot
```

<a id="fail-oscillation"></a>

#### A4 · Sustained oscillation

**Symptom:** keeps ringing. **Cause:** Ki near the bound (2 + 0.1Kd)Kp. **Fix:** back off.

**On the dish:** (1000, 1900, 0) sits just inside the 2Kp bound: 98.8 % overshoot and still ringing at 20 s. (1000, 500, 120): 11.7 %, 2.68 s.

```figure:fail-oscillation
```

<a id="fail-disturbance"></a>

#### A5 · Poor disturbance rejection

**Symptom:** blown off by gusts. **Cause:** gains too low. **Fix:** raise Kp, Ki and Kd together.

**On the dish:** (500, 250, 100): the gust peaks at 2.08° and takes 7.16 s to clear. Tuned: 0.554°, cleared in 4.82 s.

```figure:fail-disturbance
```

<a id="fail-noise"></a>

#### A6 · Noisy, jittery actuator

**Symptom:** jittery torque. **Cause:** Kd too high, no filter. **Fix:** filter the D term (N_f) or lower Kd.

**On the dish:** tuned with 0.01° rms sensor noise and Kd = 200 unfiltered, the torque chatters; the filter or Kd = 120 calms it (qualitative, as in the PID Lab).

```figure:fail-noise
```

<a id="fail-windup"></a>

#### A7 · Integrator windup

**Symptom:** huge overshoot after a long slew. **Cause:** integrator windup. **Fix:** anti-windup.

**On the dish:** a 2 rad slew at the 200 N·m limit with no anti-windup: 21.6 % overshoot, Tₛ 4.64 s. Clamping: 3.8 %, 0.79 s.

```figure:fail-windup
```

<a id="fail-kick"></a>

#### A8 · Derivative kick

**Symptom:** torque spike at a command step. **Cause:** D on error. **Fix:** D on measurement.

**On the dish:** with N_f = 200, D on the error spikes the torque to 4200 N·m (16.6 % overshoot unlimited, 6.1 % at the 200 N·m limit). D on the measurement starts at 200 N·m: 6.3 %.

```figure:fail-kick
```

<a id="fail-limits"></a>

#### A9 · Actuator limits

**Symptom:** can't slew faster. **Cause:** torque limit. **Fix:** accept it, or a bigger motor.

**On the dish:** a 2 rad slew, clamped: the rise takes 0.362 s at 200 N·m, 0.260 s at 400 N·m and 0.188 s at 1000 N·m. A bigger motor, not more gain.

```figure:fail-limits
```

<a id="fail-delay"></a>

#### A10 · Time delay

**Symptom:** oscillates at gains that simulate fine. **Cause:** a dead time T_dead between command and motion. **Fix:** lower gains.

**On the dish:** the tuned gains give 6.5 % with a 20 ms delay, 40.3 % with 50 ms, and go unstable at 80 ms. At 50 ms, (800, 200, 110) gives 13.0 %, Tₛ 3.07 s.

```figure:fail-delay
```

<a id="fail-sensorlag"></a>

#### A11 · Sensor lag

**Symptom:** extra lag. **Cause:** slow encoder or filter. **Fix:** a faster sensor.

**On the dish:** a 50 ms sensor lag (τ_m = 0.05 s) gives 32.1 % overshoot with the tuned gains; a 20 ms sensor, 7.6 %. If the sensor can't be changed, retune for a slower loop with relatively more damping: (600, 150, 90) gives 16.8 % but settles in 3.56 s instead of 2.20 s, and (600, 150, 120) gives 5.1 % but settles in 4.61 s. Simply scaling all three gains down makes it worse (half gains: 40.0 %).

```figure:fail-sensorlag
```

<a id="fail-nonlinear"></a>

#### A12 · Nonlinearity

**Symptom:** fine on big moves, bad on small ones. **Cause:** stiction: the gear needs 20 N·m to break free, then drags at 10 N·m (illustrative values; not in lecture notes). **Fix:** none by gain. Fix the mechanics, or add integral action and expect A14.

**On the dish, PD (2000, 0, 200):**
- a 0.2 rad step stops 0.064° short (0.6 % of the step);
- a 0.02 rad step stops 0.269° short (23.5 %);
- without friction both overshoot 2.0 % and end exactly on target.

Near the target Kp × error falls below the 20 N·m needed to restart, so the dish stays wherever it stopped.

```figure:fail-nonlinear
```

<a id="fail-twodof"></a>

#### A13 · Tracking against gust rejection

**Symptom:** good tracking or good gust rejection, not both. **Cause:** one-degree-of-freedom compromise. **Fix:** set-point weighting.

**On the dish:** b = 1: 7.4 % overshoot, wind 0.556°, cleared in 4.82 s. b = 0.9: no overshoot, Tₛ 1.67 s, rise 0.195 s, the same wind response. b = 0.5 is too slow (Tₛ 6.07 s).

```figure:fail-twodof
```

<a id="fail-limitcycle"></a>

#### A14 · Limit cycle

**Symptom:** small steady hunting. **Cause:** stiction plus integral action: while the gear is stuck, the integrator keeps building torque until it breaks free and jumps past the target, then builds the other way (not in lecture notes). **Fix:** an integrator dead band: stop integrating while |e| < δ = 0.003 rad (0.17°).

**On the dish, tuned PID (2000, 1000, 200), same stiction as A12, 0.1 rad step:**
- without the dead band it hunts between −0.145° and +0.147°, period 23.9 s, forever (11 crossings in 60–200 s);
- with the dead band it sticks at +0.149° and stays.

A small, steady error inside the band is the price of no hunting.

```figure:fail-limitcycle
```

### Worked example: on the dish

Jittery torque but a smooth angle points at Kd: unfiltered D on encoder noise (card A6). An overshoot that grows after long slews but not short ones is windup (card A7: 7.9 % at 0.2 rad, 21.6 % at 2 rad without anti-windup).

**What each symbol means.**

- **θ_r, θ, e**: commanded angle, measured angle, error (rad).
- **Kp, Ki, Kd, N_f**: as in the Lab: N·m/rad, N·m/(rad·s), N·m·s/rad, rad/s.
- **T, T_max**: motor torque and its limit (N·m; 200).
- **T_d**: wind torque (N·m; 20).
- **T_dead**: dead time between command and motion (s; A10).
- **τ_m**: sensor lag time constant (s; A11): the controller sees θ through 1/(τ_m s + 1).
- **b**: set-point weight (no unit; A13): P acts on bθ_r − θ.
- **T_st, T_c**: stiction break-free torque (20 N·m) and sliding (Coulomb) friction (10 N·m) (A12, A14).
- **δ**: integrator dead band (rad; 0.003 = 0.17°; A14).
- **%OS, Tₛ**: percent overshoot; 2 % settling time (s).

### What it can't do

The cards diagnose one fault at a time; real loops often show two at once (stiction and windup, say).

<p class="src">Sources: LN1 s.62–72 (P, I and D actions). Not in lecture notes: the cards themselves and the dead-time, sensor-lag, stiction, set-point-weight and dead-band models.</p>
