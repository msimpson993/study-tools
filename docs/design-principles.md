# Design brief: interactive study pages for Malcolm

*Instructions to a bot building an educational page/app on a new subject. Evidence for each rule is in `feedback-evidence.md` (tags like CS-t48u, LS-t11u). Follow this with minimal further instruction; ask only for subject scope and source material.*

## 1. Learner profile
Malcolm: RF Engineer II (Mercury Systems), strong MATLAB/math, taking graduate-level control and linear-systems courses. Studies on phone and desktop, often at night; has an OLED screen. Learns by **asking "why/what is this, physically?"**, then wants the big picture first, depth on demand, and a way to test himself. He iterates fast with short follow-ups — build things so extensions are cheap. He values precision: undefined symbols, unlabeled axes, and weak analogies are the things he complains about.

## 2. Core principles (ranked)
**#0 (Malcolm, direct, Nov 13 2026 — overrides everything below): MAP-FIRST.** "in general I want to start with that flow chart kind of view that goes through the logical progression of the subject starting from the central question that the topic seeks to answer. I want to be able to click on parts of that flow chart to dive deeper into each topic. the flow chart is a mental map so I can see how the topics relate to one another. it also helps me review more easily."

→ Landing view of every subject = the question-chain flow chart rooted at the central question. The map is (a) the navigation spine, (b) the mental model of how topics relate, and (c) the review tool. Sims, examples, deep dives and quizzes are **attached to map nodes/edges**, not separate pages; the TOC, hub and quiz are views of the same graph.

1. **Question-first, big picture first (this is #0 made concrete).** Open with the central question of the subject, then a chain of questions where each topic is the answer to the previous one's gap. Intuition → details, always pointing back to the map. Break a complex topic into its own sub-map. *(CS-t19u, LS-t10u)*
2. **Why it matters + what to recognize.** Every topic carries: Why it matters, Recognize (how it shows up), Trap (common mistake), Predict (what happens if…). *(CS-t26u, t22u)*
3. **Everything is tappable; detail is opt-in.** Any box, line, plot, term or example opens more info. Explanations are collapsed by default and never auto-expand. A paragraph is a valid minimum. *(LS-t3u, t6u, t11u)*
4. **Declutter the main view.** Main flow = headline, short answer, one figure. Verbose "how to read this", legends and long descriptions appear only in expanded views; rarely used controls go behind "More controls"; sliders and sidebars are hideable/collapsible. *(CS-t49u, t58–60u, LS-t6u)*
5. **Live, honest interactivity.** Prefer plots with sliders over static pictures. Plots expand on tap, sliders **stay live and visible** while expanded, expansion covers only the plot area. Every example/preset is just a setting of visible controls (no hidden inputs). Highlights must clear on state change. *(LS-t4u, t5u, t3u; CS-t57u)*
6. **Show the whole relationship.** Forward *and* inverse, both ends of every arrow, both domains side by side; tapping a link expands both related plots. *(LS-t7u, t8u)*
7. **Name the thing.** Say what each plotted object physically is (what is the x-axis? what exactly "blows up" at a pole?). Define every symbol and acronym on first use; keep a variables/glossary drawer. *(CS-t21u, t50u, t39u, LS-t9u)*
8. **Analogies must hold up.** Give a mapping table and a "where it breaks" line; run a physical-sanity check (energy, saturation, causality). Replace an analogy rather than defend a bad one. *(CS-t61u, t53u)*
9. **Self-test built in.** Multiple-choice with instant feedback + flashcards (tap to flip), including "identify what's happening" and "what do I do" questions, topic filter, missed-only, progress saved, each wrong answer links to the relevant section. *(CS-t1u, t23u, t27u)*
10. **Works everywhere.** True-black (`#000`) dark default + light toggle; 390 px phone usable; single-file offline HTML; also hosted on GitHub Pages. Dense, not sparse: don't thin content to look tidy. *(CS-t20u, t71–72u, t73u, LS-t15u)*

## 3. Standard page anatomy (map-first; Guide archetype; Overview archetype in §3b)
**Landing view = the map.** No intro prose above it beyond the central question (one line) and a mode switch [Explore | Review].
1. **Hub card** (in repo index): title, one-line central question, links straight into the subject's map.
2. **Central question + map (landing)**: the question-chain flow chart, top-down, root = central question; nodes = topics phrased as the question they answer, edges = the follow-up question that leads to the next topic. Tap node/edge → side panel (short answer, why/recognize/trap, equation) with buttons: *Deep dive*, *Try it live*, *Quiz this node*. Deep dive/sim/quiz open **in place** (panel/overlay/sub-map) and keep the map visible or one tap away; breadcrumb always back to the map.
2b. **Review mode (same map)**: nodes show progress (not seen / seen / quiz-correct / missed, from localStorage); "quiz from here" runs questions for a node or a subtree; flashcards walk the chain of questions ("what question comes next, and why?"); recall mode can hide node text so he reconstructs the chain; missed nodes highlighted for re-review.
3. **Per-section**: `Where are we?` mini-map → the question as heading → **Short answer** (1–3 sentences) → Why / Recognize / Trap / Predict callouts → figure(s) → "Go deeper" collapsible → "Quiz me".
4. **Deep dives**: separate sections linked from nodes; each opens with its own mini-map.
5. **Appendix**: common failure cases — *show the problem, symptoms, what to try*; glossary/variables.
6. **Quiz/flashcards** mode (same app).
7. Persistent shell: collapsible left TOC, progress bar, theme toggle, variables drawer, "More controls".

**3b. Overview board** (contained, one screen): domains/concepts as panels with live plots, arrows = transforms/mappings (tap arrow → forward+inverse pair), presets drop-down, primary controls visible + "More controls", expandable explanations.

## 4. Required components and interaction rules
- **ConceptMap (the app's home screen)**: from `graph.yaml`; supports Explore and Review modes (progress badges on nodes, subtree quiz, hide-text recall); every deep dive/sim/quiz is addressable by node id (`#/node/<id>/dive|live|quiz`); auto layout (no hand coords); nodes and edges both tappable; neighbors highlight; breadcrumb back to central question; no overlap at 360–1400 px (text wraps/box grows; labels may hide until tapped).
- **SidePanel/BottomSheet**: question, answer, equation, why it matters, links (deep dive / live / quiz). Esc/tap-out closes.
- **Figure**: inline → expanded (plot area only; controls rail live) → pair view. Must define: title, axis names + units, legend entries (expandable), "how to read" (expanded only), reset.
- **Controls**: declared in schema `{id,label,type,range,default,group: primary|more}`; presets are partial control assignments (so every example is reachable by hand); preset state in URL hash; "reset" always present; explanations collapsed.
- **Probe/drag** where the object is a plane/map (s-plane etc.): draggable probe + numeric sliders, readouts.
- **Variables drawer**: variables for the *current section*, tap for meaning/units.
- **Quiz engine** (launched from map nodes/subtrees; results write back to node progress): kinds `recognize | action | compute | trap`; keyboard 1–4/A–D, Space flip; localStorage progress; review links.
- **Callouts**: only Why / Recognize / Trap / Predict / Short answer / Note.
- **Math**: KaTeX at build time (`$…$`); define symbols; units where physical; use a consistent sign/convention note (state the convention, e.g. z⁻¹ = delay). Verify numbers against known values and say if a figure is qualitative.
- **MATLAB/RF flavor** (optional, collapsed): a short MATLAB snippet that reproduces the figure (`[inferred]` he'd use it; he works in MATLAB), RF analogies (PLL, AGC, filters, phased arrays) where honest.

## 5. Mapping to the repo
```
study-tools/
  packages/core/        shell, theme (#000/light), ConceptMap, Figure, Controls(+presets),
                        SidePanel, VariablesDrawer, QuizEngine, math/sim helpers (+Vitest)
  apps/<subject>/
    subject.yaml        id, title, central question, archetypes, hub blurb
    content/
      graph.yaml        nodes {id, question, short, eq, why, recognize, trap, predict, parents, deepDive, quizTag}
                        edges {from,to,question,idea}
      sections/*.md     Markdown+KaTeX with shortcodes ::figure{id=} ::quiz{node=} ::var{x}
      figures.yaml      id, title, axes, legend, howToRead, controls[], presets[]
      quiz.yaml         id,node,kind,q,choices,answer,why
      glossary.yaml     symbol/acronym, meaning, units
    src/                only subject-specific sims/widgets (TypeScript)
  tests/                Vitest math checks; Playwright smoke+screenshots (dark/light/390px)
  .github/workflows/    build → dist/ (single-file HTML per app + Pages hub) → deploy
```
Build with Vite + `vite-plugin-singlefile`; hub generated from `subject.yaml`s. New subject = copy `apps/_template`, fill YAML/MD, add ≤2 widgets.

## 6. Quality bar — verification checklist (run before reporting done)
- [ ] Build fails on: dangling node/edge ids, empty short answer, figure without axes/legend/howToRead, quiz answer not in choices, quiz node missing, undefined acronym/symbol, unresolved link/anchor.
- [ ] Math checked with unit tests vs known values (state which).
- [ ] Every preset reproducible by visible controls only; presets don't leave stale highlights; reset works.
- [ ] Playwright: dark (#000 background asserted), light, 390 px: no console errors, no horizontal overflow, **no overlapping map boxes/labels** (measured rects), sliders usable while a figure is expanded, tapping each node/edge opens a panel, arrow shows forward+inverse.
- [ ] Landing view is the map; every node has a dive/live/quiz entry reachable by tap; every sim/quiz is reachable from a node; Review mode marks node progress.
- [ ] Explanations collapsed on load and after selecting an example.
- [ ] Screenshots reviewed by eye (don't rely on tests alone) and shipped alongside the report.
- [ ] Offline file opens with no network; Pages build identical.
- [ ] Report: what was built, what's approximated/qualitative, anything not verified.

## 7. Anti-patterns
- Landing on a prose page, TOC, or hub of separate files instead of the map; sims/quizzes living as detached pages with no map node.
- Wall of text on the main page; explanations that auto-open; sparse "cards" that thin the content.
- Plots without named axes/units/legend; legend or "how to read" missing in zoomed view.
- Presets that change hidden inputs; sliders that lock or hide when a plot expands.
- Showing only the forward transform/half the relationship.
- Analogies that don't map (coastal-road/mountain-at-sea), or that go unchecked physically.
- Undefined symbols/acronyms; conventions silently assumed.
- Hand-placed diagrams that overlap; relying on a platform theme (Canvas) that can't force dark or sticky nav.
- Separate, drifting copies of CSS/quiz code per page; patch-by-string builds.
- Dropping content/interactivity when re-platforming; claiming "verified" without measuring.
- Misreading a terse request narrowly (time *slider* vs time-*axis* slider): when ambiguous, include both or state the interpretation.
