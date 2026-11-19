---
id: overview
order: 0
title: "The course in one picture: three plants, one question"
category: describe
neighbors: [model, second, ctrl, dist, ss]
level: Conceptual
check: [q-root, q-loop]
addsToExample: "All three examples at once: each panel of the overview figure rebuilds one example's finished loop, box by box."
---

**The question:** how do we make a system we only know approximately do what we command, and predict how it will behave before we build it? This is the root of the map: every box below answers one piece of it.

### The big idea

One question, three plants. The **house** is slow and can't overshoot: the cleanest place to learn models, poles and what feedback buys a regulator. The **car corner** bounces: second-order behaviour you have felt, and later a plant worth putting a computer in. The **antenna dish** is LN1's own servo: a motor we command, so P, I and D have something to do.

### See it

Each panel rebuilds one example's loop a box at a time. Step a slider back to 0 to see the plant as it comes, then forward to watch each box add its piece (outlined in yellow).

```figure:overview
```

### The five series

1. **Describe the plant** (house): write the physics as ODEs, turn them into one fraction G(s), read its poles.
2. **Predict the response** (house, then the corner): one pole as a yardstick, then two poles with ζ and ωₙ, and specs as regions of the s-plane.
3. **Close the loop: P, I, D** (the corner as a loop, then the dish): proportional, integral and derivative action, tuning, and the PID Lab.
4. **What feedback buys** (back to the house): rejecting a cold front, tolerating a wrong model, and the price paid in sensor error.
5. **Design from the inside** (back to the car): state space, controllability, state feedback, observers and following a command.

### Where the example switches

| from → to | line | why the switch |
|---|---|---|
| house → corner | FIRST → SECOND | the house can't bounce |
| corner → dish | LOOP → PGAIN | a car corner only follows the road; to follow our command we need a motor |
| dish → house | TUNE → DIST | a thermostat's whole job is holding steady against the weather |
| house → corner | NOISE → STATE | an active suspension needs more than one output fed back |

### Worked example: on all three plants

- **House:** heater u (W) in the living room, bedroom temperature x₂ out. G(s) = 0.0036/((s + 0.2)(s + 2.2)) per hour; 2.5 kW ends the bedroom 20.45 K above outdoors.
- **Car corner:** force on the body in, body height z out. 400 kg on 25.6 kN/m and 1.6 kN·s/m: ωₙ = 8 rad/s, ζ = 0.25, 44 % overshoot.
- **Dish:** motor torque in, pointing angle out. 0.1/(s(s + 2)); the tuned PID (2000, 1000, 200) overshoots 7.4 % and holds a 20 N·m gust to 0.56°.

### How to use the two maps

*Big picture* is the main chain (21 boxes). *Full detail* adds the side questions (17 more boxes) hanging off their parents. Tap a box for its short answer, tap a line for the question that leads there, and open the deep dive for the full story.

### What it can't do

The map is a route, not the whole course: the slides' tools that are only previewed here (Bode, root locus, Nyquist, Routh, Ziegler–Nichols) are marked *added* or *preview* where they appear.
