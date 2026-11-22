---
id: overview
order: 0
title: "The course in one picture: three plants, one question"
category: describe
neighbors: [model, second, ctrl, dist, ss]
level: Conceptual
check: [q-root, q-model]
addsToExample: "The house's finished loop, rebuilt box by box in the overview figure."
---

**The question:** how do we make a system we only know approximately do what we command, and predict how it will behave before we build it? This is the root of the map: every box below answers one piece of it.

### The big idea

- **One question, one plant to start:** the **house** warms slowly and never swings past where it settles, which makes it the cleanest place to learn models, poles and what feedback buys.
- **Others join when needed:** where the house runs out, a new example joins. Each is introduced in its own Example pop-up beside the box that needs it.

### See it

The panel rebuilds the house's loop a box at a time. Step the slider back to 1 to see the plant as it comes, then forward to watch each box add its piece (outlined in yellow).

```figure:overview-house
```

### The five series

1. **Describe the plant:** physics as ODEs, one fraction G(s), its poles.
2. **Predict the response:** one pole as a yardstick, then two poles with ζ and ωₙ, and specs as regions of the s-plane.
3. **Close the loop:** proportional, integral and derivative action, tuning, and the PID Lab.
4. **What feedback buys:** rejecting outside pushes, tolerating a wrong model, and the price paid in sensor error.
5. **Design from the inside:** state space, controllability, state feedback, observers and following a command.

### Where the example switches

| at box | what happens | why |
|---|---|---|
| *Two poles* | a second example joins | the house can't swing past where it settles |
| *Turn up the gain* | a third example joins | P, I and D need a command we choose and an actuator that obeys it |
| *A push we didn't command* | the house returns | a thermostat's whole job is holding steady against the weather |
| *Look inside* | the example from *Two poles* returns | its specs need both polynomial coefficients set at will |

### Worked example: on the house

- **House:** heater u (W) in the living room, bedroom temperature x₂ out. G(s) = 0.0036/((s + 0.2)(s + 2.2)) per hour; 2.5 kW ends the bedroom 20.45 K above outdoors.

### How to use the two maps

*Big picture* is the main chain (21 boxes). *Full detail* adds the side questions (17 more boxes) hanging off their parents. Tap a box for its short answer, tap a line for the question that leads there, and open the deep dive for the full story.

**What each symbol means.**

- **u**: heater power (W).
- **y**: bedroom temperature above outdoors (K).
- **G(s)**: the plant as one fraction, output over input in the Laplace variable s. Units: output per input, e.g. K/W.
- **s**: the Laplace variable, a complex frequency (1/h).
- **x₁, x₂**: living-room and bedroom temperatures above outdoors (K).

### What it can't do

- **A route, not the whole course.**
- **Sources:** each deep dive ends with a small source line. *LN1 s.28–38* means Lecture Notes 1, slides 28–38.
- **Beyond the notes:** anything the notes don't cover, such as root locus, Bode plots, the Routh test or Ziegler–Nichols, is marked *(not in lecture notes)*.
- **The running examples** are this site's own illustrations of the notes' methods, and their numbers aren't in the notes. The exam problems live in Review.

<p class="src">Sources: LN1, LN2, LN4 (LN = lecture notes). The house, car corner and dish are this site's examples (not in lecture notes).</p>
