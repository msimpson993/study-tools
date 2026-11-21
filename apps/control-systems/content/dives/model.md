---
id: model
order: 1
title: "Write the plant down: the house's heat balance"
category: describe
neighbors: [tf, order, circuits, overview]
level: Conceptual
check: [q-model, ck-model-1, ck-model-2]
addsToExample: "Stage H0: two rooms, a heater in room 1, heat flowing through the shared wall and out to the weather; one heat balance per room."
---

**The question:** how do we get from the physical plant to an equation we can calculate with? This is the box *Write the plant down*, the first step under the root question.

### The big idea

- **Laws state rates:** energy balance says net heat flow sets how fast a room warms; Newton says force sets acceleration.
- **One law per energy store** gives differential equations.
- **Every later tool** is the same equations rearranged so that a different question is easy.
- **Why the ODE is the default:** it is what the physics gives, and it holds for any input and any starting temperature.

### See it

Arrow widths are heat flows in watts; the lower plot shows both rooms warming over a day from outdoor temperature. Try the presets for a leaky house and a thin inner wall.

```figure:house
```

### The math

```eq
C_th ẋ₁ = u − G_in(x₁ − x₂) − G_out x₁,   C_th ẋ₂ = G_in(x₁ − x₂) − G_out x₂
```

Dividing by C_th and timing in hours:

```eq
ẋ₁ = −1.2x₁ + x₂ + 0.0036u,   ẋ₂ = x₁ − 1.2x₂
```

**What each symbol means.**

- x₁, x₂: room temperatures above outdoor (K).
- u: heater power in the living room (W).
- C_th = 1 MJ/K per room: heat capacity.
- G_in = 277.8 W/K: the inner wall's conductance; G_out = 55.6 W/K: each room's leak outdoors.
- 1 /h = 3600·G_in/C_th: the flow between the rooms per kelvin of difference; 0.2 /h = 3600·G_out/C_th: each room's leak outdoors (so −1.2 = −(1 + 0.2)).
- 0.0036 = 3600/C_th: K per hour per watt.

**Linear:** every term is a constant times a temperature or the power, so responses add. **Time-invariant:** walls don't change. **Lumped:** each room has one temperature (perfectly mixed air).

### Worked example: on the house

1. Steady state (ẋ = 0) at 2.5 kW: 1.2x₁ − x₂ = 9 and x₁ = 1.2x₂, so x₂ = 20.45 K and x₁ = 24.55 K.
2. At 5 °C outside: the living room sits at 29.5 °C, the bedroom at 25.5 °C.
3. To hold the bedroom at 20 °C (15 K above outdoor) takes 1833 W.

### What it can't do

Real rooms have stratified air, sun through windows, people and doors opening (nonlinear and time-varying, the "approximately" in the central question). The model also has no heater limit. Real actuators have one, and it matters once a controller pushes hard.

<p class="src">Sources: LN1 s.3–5 (transfer functions and why we model). The two-room heat balance is this site's example.</p>
