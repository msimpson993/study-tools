---
id: sep
order: 27
title: "The compensator and the separation principle"
category: state
chain:
  - title: "How do we estimate the states we can't measure?"
  - title: "How do we plug the estimate into the control law, and why can we design the two separately?"
  - title: "compensator, separation principle"
    detail: "det(sI − (A−BK)) · det(sI − (A−LC))"
neighbors:
  - obs
  - refin
exampleScene: { overlays: [forces, sensor], diagram: sep, caption: "The compensator: the observer's estimate x̂ is multiplied by K to make the push u = −K x̂." }
addsToExample: "u = −K x̂ on the cart: closed-loop poles are the controller's −4 ± 3j plus the observer's −20 ± 15j. With a 0.2 m initial error in the position estimate, a 1 m step differs from full-state feedback by about 7 cm around 0.3 s, then the two responses match."
accountsFor: "Why K and L are designed independently, and that the resulting compensator U(s) = −K(sI − (A−BK−LC))⁻¹ L Y(s) need not be stable on its own."
---
**How do we plug the estimate into the control law, and why can we design the two separately?**

**Picture it first.** The same 1 m step, twice: once with the true state in the control law, once with the observer's estimate. Give the observer a 0.2 m head start in the wrong direction and watch the two traces differ for a fraction of a second, then agree.

```figure:sep
```

The natural thing to do with an estimate is to use it: **u = −K x̂**. The plant and the observer together are then a 2n-dimensional closed loop. A short block-diagram argument (the notes' slide 3 / 30 picture, which the running-example diagram under the cart now matches) produces the closed-loop characteristic polynomial

det(sI − (A − BK)) · det(sI − (A − LC)).

The eigenvalues are exactly the controller poles you placed with K, together with the observer poles you placed with L. That is the **separation principle**: the two designs can be carried out independently. The ability to place K's poles still requires controllability; the ability to place L's poles still requires observability.

On the cart the eight (well: four) closed-loop poles are therefore −4 ± 3j and −20 ± 15j.

### What the cart's step actually does

The claim to check is whether putting the observer in the loop makes the step "slightly rougher for the first fraction of a second, then the same as full-state feedback." A simulation with K = [23, 5], L = [37, 512], N̄ = 25, a 1 m command, x(0) = 0 and a 0.2 m initial error in the position estimate shows:

- the two position traces differ by at most about **0.07 m**, around **t = 0.3 s**;
- by about **1 s** the difference is down to a centimetre or less, and both settle at 1 m;
- if the estimate starts correct (e₀ = 0), the two steps coincide.

So the first fraction of a second is slightly different while the estimate catches up; after that the compensator matches full-state feedback. That is what the figure's right-hand panel plots. A larger initial error scales the bump; a faster observer shortens it (and, with noise, roughens the force).

### The compensator, as a transfer function

Eliminating the estimate gives a single transfer function from y to u,

U(s) = −K (sI − (A − BK − LC))<sup>−1</sup> L Y(s).

This **compensator** need not be stable on its own. Even if A − BK and A − LC are both stable, A − BK − LC may not be. The overall closed loop still is, by separation. The notes call a controller with this property a **stabilizing controller**.

### The notes' inverted-pendulum-on-a-cart (slides 30–40)

The same three steps, on a fourth-order plant (cart position and speed, pendulum angle and rate). The open-loop poles sit at 0, 0, −10 and +10 — already unstable. The plant is nevertheless completely controllable and completely observable (the notes compute det Pc ≈ 196 and det Po = 1). Desired dominant poles use ζ = 0.8 and ωn = 0.5 (settling under 10 s, low overshoot), with the remaining pair further left at (s + 16s? no) (s + a)(s + b) with (a, b) = (16, 100). The observer is placed still further left (a separation of about 20). Ackermann produces K and L; connecting u = −K x̂ gives a step that is slightly more oscillatory than full-state feedback for the first second, then matches — the same pattern the cart figure shows, on a plant that starts unstable.

````callout:recognize Recognize
- Closed-loop poles = poles of A − BK  and  poles of A − LC, designed separately.
- The compensator U(s)/Y(s) = −K(sI − (A − BK − LC))⁻¹L may itself be unstable; the loop is still stable.
- The first fraction of a second is the observer catching up; after that, u = −K x̂ tracks u = −Kx.
````

````callout:trap Trap
Designing K as if the states were measured, then "hoping" an observer will be fine, is actually the right order — but only because of separation, and only if you also place L. Forgetting to check that A − LC is stable leaves a hidden error mode in the loop.
````
