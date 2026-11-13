---
id: order
order: 4
title: "Why a plant has the order it has"
category: describe
chain:
  - title: "Why is the order what it is?"
  - title: "Why does a plant have the order it has?"
  - title: "energy-storage elements"
    detail: "order = number of independent energy stores"
neighbors:
  - tf
---
**Why does a plant have the order it has?**

**Picture it first.** Two energy stores, two states, two poles: the cart's position stores spring energy, its velocity stores kinetic energy. Change c and k and watch both traces and the eigenvalues.

```figure:states
```

The order equals the number of independent energy-storage elements (inductors, capacitors, masses, springs): each stores energy in a state that must be tracked. Dampers and resistors dissipate energy and add no state.

### Why does order equal the number of independent energy-storage elements?

Each independent energy store (L, C, mass, spring, rotating inertia J) holds a quantity that can't change instantly: current, voltage, velocity, position. Each one needs its own first-order ODE to track it, so <i>n</i> independent stores give an <i>n</i>th-order system with <i>n</i> poles and <i>n</i> states.

| System | Energy stores | Order |
|---|---|---|
| RC low-pass | C (voltage) | 1 |
| Series RL | L (current) | 1 |
| Series RLC (Lecture Notes 1, slide 40) | L (current) + C (voltage) | <b>2</b> |
| Two cascaded RC sections (slide 41) | C₁ + C₂ | 2 |
| Mass–spring–damper | m (kinetic) + k (potential); the damper only <em>dissipates</em> | 2 |
| DC motor (armature L + rotor J) | L + J | 2 (often 1 if L is neglected) |


````callout:recognize Recognize
Resistors and dampers <b>dissipate</b> energy and add no order. Count the L's, C's, masses, springs, and inertias, then check that each one is independent.
````

### When does careless counting give the wrong order?

When stores aren't independent (two capacitors in parallel act as one), or when a pole–zero cancellation hides a mode from the transfer function. Count poles of the final <i>G</i>(<i>s</i>), not parts on the schematic.

````callout:trap Trap


- Two capacitors directly in parallel (or two inductors directly in series) count as <b>one</b> store, since their voltages (currents) are forced equal.
- The transfer function's order can be <em>lower</em> than the physical order if a zero cancels a pole. The internal mode is still there. It just isn't visible from that input to that output.
- The numerator degree doesn't set the order: (<i>s</i>²+1)/(<i>s</i>+3) isn't even proper, and you'd never call it second-order.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Change c and k and watch the eigenvalues move: the same pole picture as the transfer function, now with the inside of the cart in view.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
````
