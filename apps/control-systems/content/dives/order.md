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

Count the places where the plant can store energy independently. Each one needs its own number to describe it, its own state, and each state adds one power of s to the denominator. So the *order* (the highest power of s in G's denominator) equals the number of independent energy stores. Parts that only pass energy along or turn it into heat (walls, shock absorbers, resistors) store nothing and add no order.

### See it

Turn on the heat-stored bars. Each room's bar is its heat capacity times its temperature rise. Two bars that can differ give two states and two poles.

```figure:house
lookFor: Turn on the heat-stored bars. The two bars rise at different rates: two independent stores, so two states and two poles.
```

### The math

- Order n = number of independent stores = number of states = degree of the characteristic polynomial.
- House: two heat stores, C_th·x₁ and C_th·x₂ (C_th = 1 MJ/K per room), so n = 2.
- Corner: spring energy ½kz² and body energy ½mż², so n = 2.
- "Independent" matters. Two capacitors in parallel share one voltage and count as one store, and so would two rooms with no wall between them.

**What each symbol means.**

- **n**: the order: highest power of s in G's denominator = number of states = number of independent energy stores.
- **C_th**: heat capacity of one room, 1 MJ/K (the heat to warm it 1 K).
- **x₁, x₂**: room temperatures above outdoors (K). C_th·x is the heat stored (J).
- **k, z**: spring stiffness (N/m) and stretch (m); ½kz² is the spring's stored energy (J).
- **m, ż**: body mass (kg) and velocity (m/s); ½mż² is its kinetic energy (J).
- **c**: shock damping (N·s/m). It turns motion into heat and stores nothing.
- **m_u, k_t**: wheel mass 40 kg and tyre stiffness 200 kN/m: two more stores, so order 4.

### Worked example: on the house and the corner

- House: two rooms give two heat stores and two poles, −0.2 and −2.2 /h. Knock the inner wall out and you have one big room: one store, order 1.
- Corner: spring + body give two poles, −2 ± 7.75j. Add the 40 kg wheel on its 200 kN/m tyre and you get two more stores (wheel motion, tyre spring), so order 4 (see *Which poles matter?*).
- The shock absorber (1.6 kN·s/m) changes where the poles sit, not how many there are.

### What it can't do

It counts the states; it doesn't say where the poles are or which ones matter. A model can also have more stores than you care to keep: the wheel's two are real but fast, and we leave them out on purpose. And it applies to lumped models only: a wall with a temperature gradient through it really has infinitely many stores, and we chose to treat it as one heat path.

<p class="src">Sources: LN1 s.21–27 (states of a mass–spring system), s.38–41 (one state per energy store).</p>
