---
id: failures
order: 21
title: "When tuning goes wrong: 14 symptom cards"
category: pid
neighbors: [tuning, lab, windup, derivative]
level: Conceptual
check: [q-fail, ck-fail-1]
---

**The question:** the loop misbehaves; which symptom is it, what causes it, and which knob fixes it? This is the side box *When tuning goes wrong*, under *Tuning by hand*.

### The big idea

Most PID trouble falls into a handful of patterns you can recognise from the plots: read the symptom, name the cause, turn one knob. Each card below shows the problem (solid) against a fixed version (dashed green).

### See it

Start with the most common surprise on a real motor: windup after a long slew. The other 13 cards follow, each with its own figure.

```figure:fail-windup
```

### The cards at a glance

| card | symptom | cause | fix | in the chain |
|---|---|---|---|---|
| A1 · Slow response | sluggish slew | gains too low (dish: Tₛ 4.92 s at (400, 100, 80)) | raise the gains | [Turn up the gain](#/dive/ctrl) |
| A2 · Steady-state offset | sits off-target in wind | no I (dish: 1.15° at Kp 1000) | add Ki | [Why it stops short](#/dive/sse) |
| A3 · Overshoot | big overshoot | too little Kd or too much Ki (dish: 80 % at (1000, 500, 0)) | add Kd or cut Ki | [Derivative action](#/dive/derivative) |
| A4 · Sustained oscillation | keeps ringing | Ki near the bound (2 + 0.1Kd)Kp | back off | [Integral action](#/dive/integral) |
| A5 · Poor disturbance rejection | blown off by gusts | gains too low (dish: 2.08° at (500, 250, 100)) | raise Kp, Ki and Kd | [Tuning by hand](#/dive/tuning) |
| A6 · Noisy, jittery actuator | jittery torque | Kd too high, no filter | lower N_f or Kd | [The price of feedback](#/dive/fb) |
| A7 · Integrator windup | huge overshoot after a long slew | integrator windup (dish: 21.6 % at 2 rad) | anti-windup | [When the push hits its limit](#/dive/windup) |
| A8 · Derivative kick | torque spike at a command step | D on error | D on measurement | [Derivative action](#/dive/derivative) |
| A9 · Actuator limits | can't slew faster | torque limit | accept it, or a bigger motor | [When the push hits its limit](#/dive/windup) |
| A10 · Time delay | oscillates at gains that simulate fine | dead time (added; dish: 40.3 % at 50 ms) | lower gains | *preview* |
| A11 · Sensor lag | extra lag | slow encoder or filter (added) | faster sensor | [Recipes (the lag)](#/dive/methods) |
| A12 · Nonlinearity | fine small, bad big | gear backlash, stiction (added) | — (no gain fix) | [Write the plant down](#/dive/model) |
| A13 · Tracking against gust rejection | good tracking or good gust rejection, not both | one-degree-of-freedom compromise (added) | set-point weighting | [Follow a command](#/dive/refin) |
| A14 · Limit cycle | small steady hunting | backlash plus I (added) | a dead band | — |

*Added* marks causes that are not in the notes. Twelve cards run on the antenna dish, G = 0.1/(s(s + 2)), with D on the measurement, a 0.1 rad step and 20 N·m of wind unless noted; A12 and A14 keep a generic teaching plant, because their effect needs a nonlinearity the dish model doesn't have.

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

**Symptom:** huge overshoot after a long slew. **Cause:** integrator windup. **Fix:** anti-windup. Its figure is the one under *See it* above.

**On the dish:** a 2 rad slew at the 200 N·m limit with no anti-windup: 21.6 % overshoot, Tₛ 4.64 s. Clamping: 3.8 %, 0.79 s.

<a id="fail-kick"></a>

#### A8 · Derivative kick

**Symptom:** torque spike at a command step. **Cause:** D on error. **Fix:** D on measurement.

**On the dish:** with N_f = 200, D on the error spikes the torque to 4200 N·m (17.0 % overshoot unlimited, 6.4 % at the 200 N·m limit). D on the measurement starts at 200 N·m: 6.6 %.

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

**Symptom:** oscillates at gains that simulate fine. **Cause:** dead time (added). **Fix:** lower gains.

**On the dish:** the tuned gains give 6.5 % with a 20 ms delay, 40.3 % with 50 ms, and go unstable at 80 ms. At 50 ms, (800, 200, 110) gives 13.0 %, Tₛ 3.07 s.

```figure:fail-delay
```

<a id="fail-sensorlag"></a>

#### A11 · Sensor lag

**Symptom:** extra lag. **Cause:** slow encoder or filter (added). **Fix:** a faster sensor.

**On the dish:** a 50 ms sensor lag gives 32.1 % overshoot with the tuned gains; a 20 ms sensor, 7.6 %. If the sensor can't be changed, retune for a slower loop with relatively more damping: (600, 150, 90) gives 16.8 % but settles in 3.56 s instead of 2.20 s, and (600, 150, 120) gives 5.1 % but settles in 4.61 s. Simply scaling all three gains down makes it worse (half gains: 40.0 %).

```figure:fail-sensorlag
```

<a id="fail-nonlinear"></a>

#### A12 · Nonlinearity

**Symptom:** fine small, bad big. **Cause:** gear backlash, stiction (added). **Fix:** — (no gain fix).

*Generic teaching plant (not the dish): the effect needs a nonlinearity the dish model doesn't have.*

```figure:fail-nonlinear
```

<a id="fail-twodof"></a>

#### A13 · Tracking against gust rejection

**Symptom:** good tracking or good gust rejection, not both. **Cause:** one-degree-of-freedom compromise (added). **Fix:** set-point weighting.

**On the dish:** b = 1: 7.4 % overshoot, wind 0.556°, cleared in 4.82 s. b = 0.9: no overshoot, Tₛ 1.67 s, rise 0.195 s, the same wind response. b = 0.5 is too slow (Tₛ 6.07 s).

```figure:fail-twodof
```

<a id="fail-limitcycle"></a>

#### A14 · Limit cycle

**Symptom:** small steady hunting. **Cause:** backlash plus I (added). **Fix:** a dead band.

*Generic teaching plant (not the dish): the effect needs a nonlinearity the dish model doesn't have.*

```figure:fail-limitcycle
```

### Worked example: on the dish

Jittery torque but a smooth angle points at Kd: unfiltered D on encoder noise (card A6). An overshoot that grows after long slews but not short ones is windup (card A7: 7.9 % at 0.2 rad, 21.6 % at 2 rad without anti-windup).

### What it can't do

The cards diagnose one fault at a time; real loops often show two at once (backlash and windup, say), and several causes here are *added*, beyond LN1/2/4.
