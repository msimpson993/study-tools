---
id: skyhook
order: 30
title: "Feedback: skyhook active damping"
addsToExample: "Adds an actuator at each axle that pushes against the body's vertical speed. The poles move left (bounce ζ 0.289 → 0.700), and after the 5 cm bump the body is within 1 mm of rest after 0.50 s instead of 1.17 s; the actuators peak at 958 N front and 1,412 N rear."
accountsFor: "How feeding a measurement back to the input changes A, and so the poles, and why the wrong sign destabilises the car."
category: state
neighbors:
  - stab
  - ss
  - gramian
  - optimal
matlab: "K = [0 0 cf 0; 0 0 0 cr] * T;  eig(A - B*K)    % T maps (ż, θ̇) to the axle speeds"
exampleScene: { scene: car, overlays: [poles], caption: "Skyhook feedback pulls the car's poles to the left: the bump dies out in half a second." }
level: Some algebra
check: [c-sky-1, c-sky-2, c-stab-1]
---

**The question:** what happens when the output drives the input? This is the Full-detail box *Feedback: active damping*, after *Put it to work*: feeding the measured body speed back to the actuators changes A itself, so it moves the poles.

### The big idea

A shock absorber can only resist the wheel moving relative to the body. Skyhook control measures the body's own vertical speed and pushes against it, like a damper hooked to the sky. Because the push depends on the state, it changes the system's dynamics, and so its poles.

### See it

**Picture it first.** Turn up the skyhook gain and watch the four poles slide left along circles: same natural frequencies, more damping. The bump response underneath shrinks and dies out sooner.

```figure:skyhook
```

### The math

Stability is not only something to check; feedback can change it. Give each axle an actuator that pushes against the body's vertical speed at that axle, $F = -c\cdot(\text{body speed})$: a damper hooked to the sky. In state form that is $u = -Kx$, so the closed loop is $\dot x = (A - BK)x$ and the poles are the eigenvalues of $A - BK$. Here it is the same as fitting stronger shocks that the road cannot push through.

```eq
u = −K x    ⇒    ẋ = (A − B K) x,    poles = eig(A − B K)
```

**What each symbol means.**

- $K$: the feedback gains, here the skyhook damping $c_f, c_r$ (N·s/m) times the map from (ż, θ̇) to the speed at each axle.
- $A - BK$: the closed-loop matrix; its eigenvalues are the new poles.

### Worked example: on the car

1. Choose the gains proportional to the springs, $c_f = 4{,}317$ and $c_r = 4{,}771$ N·s/m, so the damping stays proportional and the modes keep their shapes.
2. The poles move left along circles: bounce $-5.062 \pm 5.164j$ (ζ 0.700), pitch $-7.691 \pm 4.506j$ (ζ 0.863). The natural frequencies stay at 1.151 and 1.419 Hz; only the damping changes.
3. Over the 5 cm bump at 15 m/s the heave peak falls from 8.77 to 6.25 mm, pitch from 0.222° to 0.170°, and the body is within 1 mm after 0.50 s instead of 1.17 s. The actuators peak at 958 N front and 1,412 N rear.
4. The front-road heave resonance disappears: its peak drops from ×1.18 to ×0.57, about the low-frequency level b/(a + b) = 0.56.

One equal gain at both axles, 4,355 N·s/m, also gives bounce ζ 0.700, with pitch ζ 0.823. Wire the actuator the wrong way round (push with the body speed) and the same algebra moves the poles right: at a net damping of −0.2 × the shocks', ζ is −0.058 (bounce) and −0.071 (pitch); the bounce doubles about every 1.66 s and the pitch every 1.09 s.

### What it can't do

Feedback can only move the modes the actuators reach. A mode that is uncontrollable from these inputs keeps its poles whatever K is (see the map's *Do inside and outside match?* box), and a sensor that cannot see a mode cannot feed it back.

**Next question.** Moving poles costs actuator force. What is the least effort for one particular job? That is the Gramian and optimal-control dives.

### Common pitfalls

- The sign matters: pushing *with* the body speed is negative damping and moves the poles right.
- More damping is not always better: the actuator forces grow with the gain, here up to 958 N front and 1,412 N rear for the bump.
- Skyhook damping is measured against the sky (the body's absolute speed), not against the wheel, which is why a passive shock cannot copy it.
