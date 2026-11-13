---
id: sp8
order: 23
title: "Closing the loop on the map: root locus"
category: describe
chain:
  - title: "What changes when I close a loop?"
  - title: "What does closing the loop do on the map?"
  - title: "root-locus preview"
neighbors:
  - sp6
---
**What does closing the loop do on the map?**

**Picture it first.** Increase the loop gain and the closed-loop poles slide along the locus: for the cart they meet at −1.5, then ring out into the complex plane.

```figure:locus
```

As the loop gain K grows, the closed-loop poles move along paths that start at the open-loop poles and end at its zeros. Watching those paths shows which gains are stable and how the response changes.

### What does closing the loop do on the map? (root-locus preview)

Closed-loop poles are the roots of <b>1 + <i>K</i>·<i>L</i>(<i>s</i>) = 0</b>. As gain <i>K</i> goes from 0 to ∞, they <b>start at the open-loop ×'s</b> and travel toward the open-loop ○'s (or off to infinity). Open-loop zeros stay put. The path they trace is the <b>root locus</b>, which is a later topic. For now: feedback moves poles, and the open-loop pattern decides where they can go.

````callout:recognize Recognize


- For <i>K</i>/(<i>s</i>(<i>s</i>+2)): the poles start at 0 and −2, meet at −1 when <i>K</i> = 1 (critical damping), then split vertically. More gain gives more ω<sub>n</sub> but less ζ, with σ stuck at −1. That's the boring machine's ζ = 6/√<i>K</i> story in pictures.
- Adding a LHP zero <b>bends the locus left toward the ○</b>: more damping, better stability. That's why PD/lead control helps. A RHP zero would pull poles into the RHP.
- This one picture ties together Stage 4 (one loop, one characteristic equation) and Stage 13 (high gain trades damping).
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Raise K from 0: the two real poles slide toward each other and meet at −1.5 (K = 0.25), then split up and down. From there the poles are complex, the response rings, and the final value creeps toward 1 but never reaches it with P alone.
````

````callout:note Symbols used here
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **s = σ + jω**: a point on the s-plane: σ is the decay or growth rate, ω the oscillation frequency
- **ζ, ωn**: damping ratio and natural frequency of a pole pair
- **K**: the proportional gain in u = K(r − y); K = 7 gives ζ = 0.5, ωn = 3
````
