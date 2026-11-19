---
id: blocks
order: 12
title: "Close the loop: block diagrams and T = G_f/(1 + L)"
category: pid
neighbors: [second, ctrl, sens, failures]
level: Some algebra
check: [q-loop, q-blockalg, ck-loop-1]
---

**The question:** what does "feedback" mean as a diagram, and how does any loop collapse to one block? This is the box *Close the loop* (and its side box *Reducing a block diagram*), after *Specs*.

### The big idea

Feedback means measuring the output, comparing it with what you want, and acting on the difference. A car corner is a feedback loop with no electronics: the spring and shock push on the gap between road and body, so the body follows the road. Any loop collapses to one block, forward/(1 + loop gain), and every input to that loop shares the same 1 + L, so the same poles.

### See it

Step the corner from drawing to loop: Σ → (cs + k) → 1/(ms²) → z, fed back. Switch the input between the road and an active force.

```figure:loop
```

Why feed back at all? An open-loop command is calibrated once; a closed loop measures and corrects. The legacy teaching plant below shows the difference under a load change.

```figure:problem
```

### The math

```eq
T = G_f/(1 + L);   corner: L = (cs + k)/(ms²)
```

```eq
Z/W = (cs + k)/(ms² + cs + k),   Z/U = 1/(ms² + cs + k)
```

```eq
C/R = GcG/(1 + GcGH),   C/D = G/(1 + GcGH)
```

**What each symbol means.** G_f: the forward path from that input; L: the loop gain (everything around the loop); W: road height; U: an active force; R, C, D, H: the slides' command, output, disturbance and sensor (LN1 slides 18–20).

<a id="blockalg"></a>**Reduction rules.** Series blocks multiply, parallel blocks add, a loop becomes forward/(1 + loop); summing and branch points can be moved past blocks; take one input at a time (superposition). The board's s4 pair works one through.

````callout:derivation Full derivation
E = R − HC and C = GcG·E, so C(1 + GcGH) = GcG·R. With D at the plant input: C = G(D + GcE), so C/D = G/(1 + GcGH).
````

### Worked example: on the corner

- 5 cm road step: final 5 cm (the DC gain of Z/W is 1), peak 7.53 cm (50.6 %), Tₚ 0.34 s, Tₛ 1.71 s.
- 1 kN force: 3.91 cm (DC gain 1/k).
- The shock acts like D and the spring like P (look back from *The derivative*).

### What it can't do

The passive loop can't follow any command but the road, and its "gains" c and k are fixed hardware. Next: a motor we command (*Turn up the gain*).
