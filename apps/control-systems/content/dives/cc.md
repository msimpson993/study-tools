---
id: cc
order: 15
title: "Controllability and observability"
category: state
chain:
  - title: "Output feedback can only slide the poles along a fixed path. To place them anywhere we would have to act on the plant's internal states. When is that possible?"
  - title: "When can we place every pole, and when can we work out states we don't measure?"
  - title: "controllability, observability"
    detail: "rank Pc = n and rank Po = n"
neighbors:
  - fb
  - ss2tf
  - sf
exampleScene: { overlays: [forces, sensor, phase], diagram: states, caption: "The plant block opened up (from the state-space box): the state (x, ẋ) is the plane the force must be able to reach, and that a position sensor must be able to reconstruct." }
addsToExample: "Cart: Pc=[[0,1],[1,−3]] (det −1) and Po=[[1,0],[0,1]] are both invertible, so the force can steer any position and velocity, and measuring position alone is enough to recover velocity."
accountsFor: "Why a mode cancelled out of G(s) can be neither moved nor seen, and when the design steps that follow are possible at all."
---
**When can we place every pole, and when can we work out states we don't measure?**

**Picture it first.** The cart's state is a point in the (x, ẋ) plane. Toggle the cancelled-mode preset: G(s) can look fine while a mode inside is neither reached by the force nor seen at the sensor.

```figure:cc
```

**Why now, and what it needs.** The feedback chapter ended on a limit: one gain on the output can only slide the poles along a fixed path. To place them anywhere we have to act on the plant's internal states, which is why this box uses the state-space model (the side branch off the model box: the matrices A, B and C, and G = C(sI − A)⁻¹B + D). The question here is whether that is possible at all.

If the system is **controllable** and **observable**, the design steps that follow are possible: we can place every closed-loop pole, and we can reconstruct the states we do not measure. Both tests are rank tests on a matrix built from A, B and C.

### The two tests

A system is completely controllable if there is an unconstrained input u(t) that takes any initial state to any desired state in finite time. For a single input the **controllability matrix**

Pc = [B  AB  …  A<sup>n−1</sup>B]

is n × n; the plant is completely controllable if and only if det Pc ≠ 0 (equivalently, rank Pc = n).

A system is completely observable if the initial state can be recovered from the output history y(t) on a finite interval (with the input known). The **observability matrix**

Po = [C;  CA;  …;  CA<sup>n−1</sup>]

is n × n; the plant is completely observable if and only if det Po ≠ 0.

### The cart

A = [[0, 1], [−2, −3]], B = (0, 1)<sup>T</sup>, C = (1, 0). Then AB = (1, −3)<sup>T</sup>, so

Pc = [[0, 1], [1, −3]],  det Pc = −1,

Po = [[1, 0], [0, 1]],  det Po = 1.

Both are invertible. The force can steer any position and velocity, and measuring position alone is enough to recover velocity. That is why the rest of this chapter can be carried out on the cart.

### When G(s) hides a mode

A pole-zero cancellation in G(s) = C(sI − A)<sup>−1</sup>B hides a mode that is uncontrollable, unobservable, or both. G(s) can look stable while an internal eigenvalue sits in the right half-plane.

A textbook counter-example: A = diag(−1, +1), B = (1, 0)<sup>T</sup>, C = (1, 0). Then G(s) = 1/(s + 1), which is fine, but det Pc = det Po = 0 and the +1 eigenvalue is neither reached by u nor seen at y. Use the cancelled-mode preset on the figure.

### Stabilizable, detectable, Kalman

If a plant is not completely controllable, the remaining question is whether the unreachable modes are already stable (**stabilizable**). If it is not completely observable, the question is whether the unseen modes are already stable (**detectable**). Complete controllability implies stabilizable; complete observability implies detectable. The **Kalman decomposition** splits the state into four parts (reachable and observable, reachable and not, and so on) so you can see which combinations are hidden. This course uses plants that pass both tests, like the cart.

````callout:trap Trap
A pole-zero cancellation in G(s) hides an uncontrollable or unobservable mode; G(s) looks fine while an internal state misbehaves.
````

````callout:recognize Recognize
- det Pc ≠ 0  ⇔  every pole can be placed by state feedback.
- det Po ≠ 0  ⇔  a Luenberger observer can be built that reconstructs every state from y.
- An eigenvalue of A missing from G(s) is a cancelled mode. Check Pc and Po before you trust the transfer function alone.
````
