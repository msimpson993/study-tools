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

Before designing with the states, check that the actuator can steer each one and the sensor can reveal each one. If a mode fails, it cancels out of G(s): invisible from outside, but still moving inside. The geometry, for two states: the push direction B and the direction the dynamics turn it, AB, must point different ways, so together they span the plane (controllable). The reading y = Cx and its rate of change with the input off, ẏ = CAx, must together pin down both states (observable).

### See it

The corner draws B and AB in the state plane.

The corner passes both tests, so to see a failure we go back to the house. Put a 2.5 kW heater in *each* room on one dial: both rooms rise to 45.0 K together with τ = 5 h. Their difference never moves, so no input can make one room warmer than the other.

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

### What it can't do

It's yes/no: a nearly singular P_c means "controllable" but needing huge force.

<p class="src">Sources: LN4 s.4–12.</p>
