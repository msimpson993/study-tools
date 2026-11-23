---
id: pi
order: 6
title: "Why the engine needs I: P, I and steady error"
category: engine
neighbors: [tuner, borer]
level: Some algebra
check: [ck-pi-1, ck-pi-2]
addsToExample: "Explains the engine's I term: zero steady error."
accountsFor: Why Project 1 asks for PI rather than P.
---

**The question:** the boring machine and the disk head reached a commanded position with no I term. Why does the engine need one? This is the box *Why the engine needs I*.

````callout:short In short
- **Answer:** a speed needs a push held on it, and P pushes only while there is an error, so P alone leaves one. I adds the error up over time and keeps pushing until it is zero.
- **Knobs:** P (push on the error now) and I (push on the error so far).
- **Number to keep:** on the stand-in engine, the initial P alone stops 43 % short (not in lab handout).
````

### The big idea

- **P pushes in proportion to the error now.** No error, no push.
- **A speed needs a steady push to hold:** the engine (like the motor) settles where torque balances drag, so it needs the throttle held open. With P alone, only a leftover error can hold it open.
- **A position doesn't:** once the boring machine or the disk head is on target, it stays there with no push (until something pushes it), so P alone can reach the target.
- **I remembers:** I/s adds up the error over time. Any leftover error keeps growing the push, so the loop can only settle where the error is zero.

### See it

On the stand-in engine (my estimate of the handout's plant, see *Three designs* and the Tuner dive), set I to 0 and raise P: the error shrinks but never vanishes. Then add I: it vanishes. The lower panel shows the throttle command split into its P part and its I part; at the end, the I part holds the throttle and the P part is zero.

```figure:pi
```

### The math

```eq
C(s) = P + I/s    (PID Tuner's parallel form, handout p.2: "P + I·1/s")
P only, steady:  error = 1/(1 + P·K_e)       (K_e = engine's steady gain)
with I:          error → 0   (the loop must be stable)
integral time:   T_i = P/I   (how many seconds of error I needs to match P's push)
```

**What each symbol means.** P: proportional gain (throttle per rpm of error); I: integral gain (throttle per rpm·s of accumulated error); K_e: the engine's steady gain, rpm per unit throttle, about 311 on the stand-in (estimated, not in lab handout); T_i: integral time (s).

### Worked example: on the engine

- **P only, the initial design's P = 0.0042253:** loop gain P·K_e = 1.31, so error = 1/2.31 = 43 % of the step left over (stand-in; not in lab handout).
- **P = 0.01:** error 24 %. Raising P helps but never reaches zero, and in the end costs stability.
- **Add the handout's I = 0.0092411:** error → 0. T_i = P/I = 0.46 s (initial design), 0.33 s (final design).
- **The boring machine, by contrast:** a step *command* ends with zero error (its 1/s is in the forward path), but a steady *push* still leaves 1/K, because nothing between the push and the error integrates. An I term in its controller would remove that too (not in lab handout).

### Knobs

| Knob | What it is, physically | Turn it up | Turn it down |
|---|---|---|---|
| **P** | throttle opened per rpm of error, right now | faster, stronger correction; P alone leaves less error; too much → swing | gentler; larger leftover error if I = 0 |
| **I** | throttle opened per rpm·second of error so far | leftover error removed faster; too much → overshoot and swing | error removed slowly; I = 0 → P-only offset |

### What it can't do

Choosing P and I by hand needs the plant, which Project 1 never writes down. The PID Tuner chooses them from two sliders instead: *Two sliders: speed and calm*.

<p class="src">Sources: PID Tuner handout pp.1–2 (PI controller, P + I/s, zero steady-state error requirement); Dorf Example 4.5 (1/K push offset). Not in lab handout: the stand-in engine model and its numbers, T_i, and the position/speed argument as stated. Course background: Control Systems › <a href="../control-systems/#/dive/integral">Integral action: removing the steady error</a>, <a href="../control-systems/#/dive/sse">Why it ends up off target</a>.</p>
