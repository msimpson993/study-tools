---
id: order
order: 6
title: "Why two poles? One state per energy store"
category: describe
neighbors: [model, ss]
level: Conceptual
check: [q-order, ck-order-1]
---

**The question:** why is the house second order, and what sets the order of any plant? This is the side box *Why two poles?*, under *Write the plant down*.

### The big idea

One state per independent energy store. The house stores heat in two rooms (C_th x each), so it is order 2. The corner stores energy in its spring (½kz²) and in the moving body (½mż²), so it is order 2; add the wheel and it becomes 4. Walls, shock absorbers and resistors only dissipate, so they add no order.

### See it

Turn on the heat-stored bars: two rooms, two stores of heat, two states.

```figure:house
```

### Worked example: on the house and the corner

- House: two rooms → two heat stores → two poles (−0.2 and −2.2 /h).
- Corner: spring + body → two poles (−2 ± 7.75j); with a 40 kg wheel on a tyre spring → four (see *Which poles matter?*).

### What it can't do

Counting stores gives the order of the lumped model, not of the real object: each wall itself stores some heat. Lumping is a modelling choice.
