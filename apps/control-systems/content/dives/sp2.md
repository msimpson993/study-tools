---
id: sp2
order: 17
title: "Pole versus zero, intuitively"
category: describe
chain:
  - title: "What is the difference between a pole and a zero?"
  - title: "What is the difference between a pole and a zero?"
  - title: "modes versus how much of each"
neighbors:
  - sp1
exampleScene: { overlays: [hammer, poles], caption: "A hammer blow excites both modes at once: the poles say which exponentials appear, the weights say how much of each." }
---
**What is the difference between a pole and a zero?**

**Picture it first.** A pole is a spike in |G|, a zero is a pit. Add a zero and a pit appears in the landscape; the cut along jω changes with it.

```figure:height
```

Poles decide which exponentials appear; zeros decide how much of each. A zero creates no new mode but reshapes the residues; a right-half-plane zero (non-minimum phase) makes the response start in the wrong direction.

### Intuitively, what is the difference between a pole and a zero?

<b>Poles belong to the system</b>: they are its natural modes, the motions it makes on its own (the free response). <b>Zeros belong to the input→output path</b>: they decide how strongly the input excites each mode and how strongly each mode shows up at the output. Poles set <em>which</em> exponentials appear; zeros set <em>how much</em> of each.

|  | Pole × | Zero ○ |
|---|---|---|
| Algebra | Denominator root: <i>G</i> → ∞ | Numerator root: <i>G</i> = 0 |
| Time domain | A mode <i>e</i><sup><i>pt</i></sup> in every response | No mode of its own; reshapes the mix of modes |
| Input <i>e</i><sup><i>s</i>₀<i>t</i></sup> at that <i>s</i>₀ | Resonates (response grows without bound) | Blocked: zero output in steady state (transmission null) |
| Changes with feedback? | Yes, closing the loop moves poles | Plant zeros stay put under feedback |
| Stability | RHP pole ⇒ unstable | RHP zero ⇒ still stable, but <b>non-minimum phase</b> |


#### Non-minimum phase: the wrong-way start

A zero in the RHP (e.g. <i>G</i> = (1 − <i>s</i>)/((<i>s</i>+1)(<i>s</i>+2))·2) makes the step response <b>start in the wrong direction</b> before heading to the correct final value. Examples: a boiler's water level briefly rises when you add cold water (shrink/swell), and an aircraft briefly dips when the elevator commands a climb. Feedback can't fix this with high gain. A RHP zero attracts closed-loop poles into the RHP as gain rises, so it limits how fast you can make the loop.

#### Pole–zero cancellation

If a ○ lands exactly on a ×, that mode disappears from the <b>input→output</b> transfer function, but it still exists <b>inside</b> the system. The input can't excite it, or the output can't see it. An initial condition or a disturbance entering elsewhere can still excite it. Cancelling a stable, fast pole is harmless. “Cancelling” an unstable pole hides an internal instability that will still blow up (Q20).

````callout:trap Trap


- A zero doesn't make a system faster or slower in the sense of new modes. It only reweights existing modes. Still, a zero near the dominant poles can drastically change overshoot (the boring-machine PD zero, Q38).
- A near-cancellation (○ close to ×) leaves a small residue: a slow, small “tail” that can still matter for settling time.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Lower the damper c: the poles slide toward the jω axis, the peak rises, and the cut gets a resonance bump. Add a zero: a pit appears and the cut dips.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **s = σ + jω**: a point on the s-plane: σ is the decay or growth rate, ω the oscillation frequency
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
