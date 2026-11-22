---
id: order
order: 5
title: "Why two poles? One state per energy store"
category: describe
neighbors: [splane, model, ss]
level: Conceptual
check: [q-order, ck-order-1]
---

**The question:** why is the house second order, and what sets the order of any plant? This is the side box *Why two poles?*, under *Poles and zeros*.

### The big idea

- **Count the stores:** count the places where the plant can store energy independently.
- **One state each:** each store needs its own number to describe it, its *state*, and each state adds one power of s to the denominator.
- **Order** (the highest power of s in G's denominator) = the number of independent energy stores.
- **Paths store nothing:** parts that only pass energy along or turn it into heat (walls, resistors) add no order.

### See it

Turn on the heat-stored bars. Each room's bar is its heat capacity times its temperature rise. Two bars that can differ give two states and two poles.

```figure:house
lookFor: Turn on the heat-stored bars. The two bars rise at different rates: two independent stores, so two states and two poles.
```

### The math

- Order n = number of independent stores = number of states = degree of the characteristic polynomial.
- House: two heat stores, C_th·x₁ and C_th·x₂ (C_th = 1 MJ/K per room), so n = 2.
- A mass on a spring: spring energy ½kz² and kinetic energy ½mż², so n = 2 (the notes' own mass–spring example).
- "Independent" matters. Two capacitors in parallel share one voltage and count as one store, and so would two rooms with no wall between them.

**What each symbol means.**

- **n**: the order: highest power of s in G's denominator = number of states = number of independent energy stores.
- **C_th**: heat capacity of one room, 1 MJ/K (the heat to warm it 1 K).
- **x₁, x₂**: room temperatures above outdoors (K). C_th·x is the heat stored (J).
- **k, z**: spring stiffness (N/m) and stretch (m); ½kz² is the spring's stored energy (J).
- **m, ż**: body mass (kg) and velocity (m/s); ½mż² is its kinetic energy (J).
- **c**: a damper (N·s/m) turns motion into heat and stores nothing.

### Worked example: on the house

- House: two rooms give two heat stores and two poles, −0.2 and −2.2 /h. Knock the inner wall out and you have one big room: one store, order 1.
- Two rooms with a wall between them can differ in temperature; that difference is the second state.

### What it can't do

- **It counts; it doesn't place.** It gives the number of states, not where the poles are or which ones matter.
- **You may leave stores out:** a model can have more stores than you care to keep, if they are fast. *Which poles matter?* shows one.
- **Lumped models only:** a wall with a temperature gradient through it really has infinitely many stores; we chose to treat it as one heat path.

<p class="src">Sources: LN1 s.21–27 (states of a mass–spring system), s.38–41 (one state per energy store).</p>
