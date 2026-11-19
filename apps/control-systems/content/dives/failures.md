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
| A1 · Slow response | sluggish slew | Kp too low | raise Kp | [Turn up the gain](#/dive/ctrl) |
| A2 · Steady-state offset | sits off-target in wind | no I (dish: 1.15° at Kp 1000) | add Ki | [Why it stops short](#/dive/sse) |
| A3 · Overshoot | big overshoot | too little Kd or too much Ki (dish: 80 % at (1000, 500, 0)) | add Kd or cut Ki | [Derivative action](#/dive/derivative) |
| A4 · Sustained oscillation | keeps ringing | Ki near the bound (2 + 0.1Kd)Kp | back off | [Integral action](#/dive/integral) |
| A5 · Poor disturbance rejection | blown off by gusts | low Kp, no I | raise Kp, add Ki | [Tuning by hand](#/dive/tuning) |
| A6 · Noisy, jittery actuator | jittery torque | Kd too high, no filter | lower N_f or Kd | [The price of feedback](#/dive/fb) |
| A7 · Integrator windup | huge overshoot after a long slew | integrator windup (dish: 21.6 % at 2 rad) | anti-windup | [When the push hits its limit](#/dive/windup) |
| A8 · Derivative kick | torque spike at a command step | D on error | D on measurement | [Derivative action](#/dive/derivative) |
| A9 · Actuator limits | can't slew faster | torque limit | accept it, or a bigger motor | [When the push hits its limit](#/dive/windup) |
| A10 · Time delay | oscillates at gains that simulate fine | dead time (added) | lower gains | *preview* |
| A11 · Sensor lag | extra lag | slow encoder or filter (added) | faster sensor, lower gain | [Recipes (the lag)](#/dive/methods) |
| A12 · Nonlinearity | fine small, bad big | gear backlash, stiction (added) | — (no gain fix) | [Write the plant down](#/dive/model) |
| A13 · Tracking against gust rejection | good tracking or good gust rejection, not both | one-degree-of-freedom compromise (added) | set-point weighting | [Follow a command](#/dive/refin) |
| A14 · Limit cycle | small steady hunting | backlash plus I (added) | a dead band | — |

*Added* marks causes that are not in the notes. The cards are simulated on the legacy teaching plants, not yet re-plotted on the dish; dish numbers are given in brackets where the chain has them.

<a id="fail-slow"></a>

#### A1 · Slow response

**Symptom:** sluggish slew. **Cause:** Kp too low. **Fix:** raise Kp.

```figure:fail-slow
```

<a id="fail-offset"></a>

#### A2 · Steady-state offset

**Symptom:** sits off-target in wind. **Cause:** no I (dish: 1.15° at Kp 1000). **Fix:** add Ki.

```figure:fail-offset
```

<a id="fail-overshoot"></a>

#### A3 · Overshoot

**Symptom:** big overshoot. **Cause:** too little Kd or too much Ki (dish: 80 % at (1000, 500, 0)). **Fix:** add Kd or cut Ki.

```figure:fail-overshoot
```

<a id="fail-oscillation"></a>

#### A4 · Sustained oscillation

**Symptom:** keeps ringing. **Cause:** Ki near the bound (2 + 0.1Kd)Kp. **Fix:** back off.

```figure:fail-oscillation
```

<a id="fail-disturbance"></a>

#### A5 · Poor disturbance rejection

**Symptom:** blown off by gusts. **Cause:** low Kp, no I. **Fix:** raise Kp, add Ki.

```figure:fail-disturbance
```

<a id="fail-noise"></a>

#### A6 · Noisy, jittery actuator

**Symptom:** jittery torque. **Cause:** Kd too high, no filter. **Fix:** lower N_f or Kd.

```figure:fail-noise
```

<a id="fail-windup"></a>

#### A7 · Integrator windup

**Symptom:** huge overshoot after a long slew. **Cause:** integrator windup (dish: 21.6 % at 2 rad). **Fix:** anti-windup. Its figure is the one under *See it* above.

<a id="fail-kick"></a>

#### A8 · Derivative kick

**Symptom:** torque spike at a command step. **Cause:** D on error. **Fix:** D on measurement.

```figure:fail-kick
```

<a id="fail-limits"></a>

#### A9 · Actuator limits

**Symptom:** can't slew faster. **Cause:** torque limit. **Fix:** accept it, or a bigger motor.

```figure:fail-limits
```

<a id="fail-delay"></a>

#### A10 · Time delay

**Symptom:** oscillates at gains that simulate fine. **Cause:** dead time (added). **Fix:** lower gains.

```figure:fail-delay
```

<a id="fail-sensorlag"></a>

#### A11 · Sensor lag

**Symptom:** extra lag. **Cause:** slow encoder or filter (added). **Fix:** faster sensor, lower gain.

```figure:fail-sensorlag
```

<a id="fail-nonlinear"></a>

#### A12 · Nonlinearity

**Symptom:** fine small, bad big. **Cause:** gear backlash, stiction (added). **Fix:** — (no gain fix).

```figure:fail-nonlinear
```

<a id="fail-twodof"></a>

#### A13 · Tracking against gust rejection

**Symptom:** good tracking or good gust rejection, not both. **Cause:** one-degree-of-freedom compromise (added). **Fix:** set-point weighting.

```figure:fail-twodof
```

<a id="fail-limitcycle"></a>

#### A14 · Limit cycle

**Symptom:** small steady hunting. **Cause:** backlash plus I (added). **Fix:** a dead band.

```figure:fail-limitcycle
```

### Worked example: on the dish

Jittery torque but a smooth angle points at Kd: unfiltered D on encoder noise (card A6). An overshoot that grows after long slews but not short ones is windup (card A7: 7.9 % at 0.2 rad, 21.6 % at 2 rad without anti-windup).

### What it can't do

The cards diagnose one fault at a time; real loops often show two at once (backlash and windup, say), and several causes here are *added*, beyond LN1/2/4.
