---
id: cc
order: 28
title: "Can we reach and see every state?"
category: state
neighbors: [ss, ss2tf, sf, obs]
level: Some algebra
check: [q-cc, ck-cc-1, ck-cc-2]
addsToExample: "The house's failure cases: two heaters on one dial can't change the difference between the rooms, and an averaging sensor can't see it."
---

**The question:** before designing with the states, can the actuator steer each one, and can the sensor reveal each one? This is the box *Can we reach and see every state?*, after *Look inside: state space*.

### The big idea

Before designing with the states, check that the actuator can steer each one and the sensor can reveal each one. If a mode fails, it cancels out of G(s): invisible from outside, but still moving inside.

### See it

The corner draws B and AB in the state plane; the house cases show when the test fails. With two equal heaters on one dial, both rooms always warm together; no setting makes the bedroom warmer than the living room.

```figure:cc
```

### The math

```eq
P_c = [B, AB],   P_o = [C; CA]   (n = 2)
```

Full rank ⇔ controllable / observable (LN4 slides 4–12).

**What each symbol means.** P_c: the controllability matrix; P_o: the observability matrix; full rank means det ≠ 0 for n = 2.

### Worked example: on the corner

P_c = [[0, 0.0025], [0.0025, −0.01]], det −6.25 × 10⁻⁶ ≠ 0: controllable. P_o = I with the height sensor: observable. A velocity-only sensor gives det P_o = 64: also observable.

### The house cases

- Heater in room 1 and sensor in room 2: det P_c = b² = 1.3 × 10⁻⁵ and det P_o = −1, so both are fine.
- Two equal heaters on one dial: AB ∥ B, uncontrollable (the difference mode).
- A sensor reading the average: unobservable (the difference mode).
- The outdoor temperature is likewise an input that can't steer the difference mode, which is why outdoor → bedroom is first order (*Transfer function G(s)*).

### Exam examples

LN4 slides 4–12.

### What it can't do

It's yes/no: a nearly singular P_c means "controllable" but needing huge force.
