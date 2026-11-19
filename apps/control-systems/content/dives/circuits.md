---
id: circuits
order: 7
title: "G(s) for circuits and op-amps"
category: describe
neighbors: [model, tf]
level: Some algebra
check: [q-circ, ck-circ-1]
---

**The question:** how do we write G(s) for an electrical circuit, and why does the house look like one? This is the side box *G(s) for circuits*, under *Transfer function G(s)*.

### The big idea

Impedances make circuits algebra: R, sL and 1/(sC) combine like resistors, and dividers and op-amps follow simple rules. The same equations describe heat flow, so the house is an RC network.

### See it

The "house as RC" preset draws the two rooms as capacitors and the walls as resistors; its step response is the house's.

```figure:rlc
```

### The math

- Impedances: R, sL, 1/(sC). Voltage divider: Z₂/(Z₁ + Z₂). Inverting op-amp: −Z_f/Z_in.
- **Analogy table:** temperature ↔ voltage; heat flow ↔ current; C_th ↔ C (1 MJ/K per room); 1/G ↔ R (3.6 mK/W inner wall, 18 mK/W outer); heater ↔ current source.
- Mechanical (the corner): m ↔ L, c ↔ R, k ↔ 1/C.

### Worked example: on the house

Two capacitors of 1 MJ/K from each room node to ground (outdoor temperature), a 3.6 mK/W resistor between the nodes, an 18 mK/W resistor from each node to ground, and a current source into node 1. Writing the node equations gives exactly ẋ₁ = −1.2x₁ + x₂ + 0.0036u and ẋ₂ = x₁ − 1.2x₂.

### What it can't do

The analogy covers linear lumped elements only; real op-amps saturate and real walls are distributed.
