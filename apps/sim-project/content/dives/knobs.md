---
id: knobs
order: 8
title: "Every knob in the project, and what it trades"
category: wrap
neighbors: [speed, borer, disk, tuner]
level: Conceptual
check: [ck-knobs-1, ck-knobs-2]
addsToExample: "Lines up all four machines and every knob."
accountsFor: Why the report's discussion can be organised around four advantages and one price.
---

**The question:** what did feedback buy across the four machines, and what does each knob trade? This is the box *What feedback bought*, and the root's central question.

### The big idea

- **Four advantages, one machine each:** reject pushes (motor), shape the response (boring machine), shrug off changes in the machine (boring machine's sensitivity), remove steady error (disk head's integrator, engine's I term).
- **One price, everywhere:** more gain means more swing, and past a limit, no settling at all.
- **So every knob is a position on a trade.**

### See it

Pick a machine and a knob. The plot shows the response at the handout's setting (grey ghost) and at yours; the arrows under it say which goals got better and which got worse.

```figure:knobs
```

### The math

```eq
steady push error ∝ 1/(1 + loop gain)        (motor: ÷ 361;  boring machine: 1/K;  disk: 1/(5·Ka))
calmness ζ falls as gain rises               (boring machine: 6/√K;  disk: 10/√(5·Ka))
```

**What each symbol means.** loop gain: the product of every gain once around the loop at steady state; ζ: damping ratio (calmness).

### Worked example: on all four machines

| Machine | Knob | What it is | Up | Down | Handout setting |
|---|---|---|---|---|---|
| Motor | Ka | amplifier volts per volt of speed error | smaller sag, faster | bigger sag | 54 |
| Motor | Kt | tachometer volts per rad/s | same as Ka | same as lowering Ka | 1 V·s |
| Motor | J | inertia | slower, same sag | quicker, same sag | 2 kg·m² |
| Motor | b, Kb | bearing drag, back-EMF | less open-loop sag | more | 0.5, 0.1 |
| Boring machine | K | spring: steering per unit error | faster, more overshoot, less push offset | calmer, slower, more offset | 20 or 100 |
| Boring machine | 11 | damper: steering per unit error rate | calmer | swingier | fixed |
| Disk head | Ka | amplifier gain | faster seek, less shock offset, more swing; unstable past 4080 | slower, calmer | 10 or 80 |
| Engine | Response time | loop speed (crossover) | faster | slower; P → 0 at 3.1 s | 0.678 → 3.1 → 1.5 s |
| Engine | Transient behavior | calmness (phase margin) | calmer | more overshoot | 0.6 → 0.72 |
| Engine | P, I | push now, push for error so far | stronger, swingier | gentler; I = 0 leaves an offset | from the tuner |

### What it can't do

A knob table says which way things move, not where to stop. That choice rests on the specs (Project 1's 5 s and zero error) and, as the handout says of the boring machine, on "the engineer's decision-making capability and intuition". The Review section turns this page into the report's results and discussion.

<p class="src">Sources: Dorf §4.9 introduction (the advantages to demonstrate) and the end of Example 4.5 (the engineer's choice); PID Tuner handout. Not in lab handout: the table as assembled, and every "up/down" effect outside the handout's own settings.</p>
