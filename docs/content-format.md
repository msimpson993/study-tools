# Content format

An app is `apps/<id>/subject.yaml` + `apps/<id>/content/*`. `npm run validate` (also part of `build`) checks everything against `schemas/*.schema.json` plus cross-file rules, and fails with the file and id.

## subject.yaml
`id, title, centralQuestion, blurb, archetype (guide|overview), categories[], sections[], hub.order, board.pairs[], expect{}`.
- `sections` order = sidebar order. **The first section must be `kind: map`.** Kinds: `map | dives | md | quiz | board | glossary | figures` (`md` reads `content/sections/<id>.md`).
- `runningExample: {title, summary, details?, scene?: {id, overlays?}}` is the one concrete system threaded through the subject (see below). `scene` picks a core example scene (`cart`, `tine`) drawn in every dive and as the map hero: see [example-scenes.md](example-scenes.md). `expect` is the porting guard: `maps, nodes, edges, dives, quiz, examples`. Build fails if counts drift.

## graph.yaml (the map)
```yaml
maps:
  - id: chain              # ^[a-z0-9-]+$
    title: The question chain
    caption: optional text under "How to read this map"
    seriesNames: ["Chapter one", "Chapter two"]   # names of the colour families node.series 0..4 (≤ 5, in order). Legend chips; tap = light that chapter. Build WARNS if nodes use `series` without it, FAILS if a used series has no name
    nodes:
      - id: root           # exactly one node per map is `root`; all nodes must be reachable from it
        label: Short box text
        detail: optional second line
        kind: box|decision|terminal
        series: 0..4       # colour family (the bar on the box's left edge); name it in the map's seriesNames
        short: ≥20 chars. The popup answer. (required)
        eq: Unicode equation text   # stays text on the map; use KaTeX only in dives
        addsToExample: ≥15 chars. What this box adds to the running example (required on non-root nodes when a runningExample exists)
        accountsFor: what it lets us account for (a behaviour of the example we could not explain before); strongly recommended
        why / recognize / trap / predict: optional extra popup rows
        dive: <dive id>            # → "Deep dive" button
        live: figure:<id>[?k=v] | board:<pair>[?preset=<example id>]
        link: { href: "../other-app/#/…", label: "…" }   # cross-app link; target app must exist
        quizTag: <tag>             # default: dive ?? id; ties the node to quiz questions
    edges:
      - { from: a, to: b, label: short pill text, dashed: false, question: ≥8 chars, idea: ≥20 chars, eq: optional }
```
Rules enforced: unique ids per map, no dangling or duplicate edges, graph is a DAG, every node reachable from `root`, popups non-empty, `live` targets exist (figure id, board pair, preset id), cross-app link targets exist.
YAML gotchas: quote any scalar containing `: `, `{`, `|`, `#` (labels like `Finite record: DFT` break).

## dives/<id>.md
Front matter: `id, order, title, category, chain[{title,detail?}], neighbors[ids], matlab?, addsToExample?, accountsFor?, exampleScene?: {overlays[], caption?}` (the last three default to the linking node's; `exampleScene` also goes on graph.yaml nodes; overlays and numeric `params` (closed-loop cart: K, Ki, Kd, r, umax, d, td, noise, seed, delay, lag) are validated, see [example-scenes.md](example-scenes.md)). Body is Markdown with:
- `$…$` / `$$…$$` KaTeX (build-time; a KaTeX error fails the build);
- ```` ```eq ```` fence for plain Unicode equation lines;
- ```` ```figure:<figure id> ```` embeds a figure from `figures.yaml` inline (its own controls, no URL sync). The id must exist (build fails otherwise). Put it right after the sentence that sets up what to watch.
- ```` ```callout:<kind> [lead] ```` with kind `short|why|recognize|trap|predict|note` (use a 4-backtick outer fence if it contains a fence).

## quiz.yaml
List of `{id, tags[], kind, q, …}`. `kind: recall` needs `a`; every other kind (`recognize|action|compute|trap`) needs `choices[2..6], answer (index), why`. Each tag must match a node `quizTag/dive/id` or a dive id. Subtree quizzes use these tags.

**Choice order.** The engine shuffles the choices each time a question is shown (the answer index stays the authored one; the order is fixed for that presentation, so re-renders don't reshuffle). Choices that point at the others (a bare "Both", "Neither", "None of them", "All of the above", "A and B", "option C") are detected and kept after the shuffled ones, in authored order (`packages/core/src/choiceorder.ts`). Add `fixedOrder: true` to a question whose choices are order-dependent in some other way (e.g. a numbered sequence) to keep the whole list as authored. Never write "as above" or refer to choices by position in `why`.

**Optional `figure`** (a small fixed plot under the question text, e.g. the legacy "scope" plots):
```yaml
- id: pid-29
  tags: [ap-slow]
  kind: action
  q: "A PI loop's step response is plotted above. What is the most likely problem?"
  figure:
    id: loop                       # renderer registered by the app: mountApp(content, { quizFigures: { loop: scopeFigure(...) } })
    params: { Kp: 0.3, Ki: 0.2, T: 30 }   # FIXED inputs for the renderer (number | string | boolean)
    alt: "Step response rising slowly to 1, no overshoot."   # required, ≥ 8 chars: the canvas aria-label
    caption: "p2 plant, Kp = 0.3, Ki = 0.2"   # optional
```
`subject.yaml` may list `quizFigures: [loop, …]`; then the build rejects a question whose `figure.id` is not listed. Without the list ids are checked at run time: an unregistered id shows a visible fallback with the alt text (the question never disappears). Renderers: `QuizFigureDef {draw(g,w,h,params), aspect?, maxWidth?}`, or `scopeFigure((params) => ScopeSpec)` for time traces with reference lines and a legend (see `packages/core/src/quizfig.ts`; live example in the gallery). Questions without `figure` are unchanged.

## glossary.yaml
`[{term, meaning, units?}]`, shown in the "Variables" drawer.

## figures.yaml (core Figure component)
`{id, title, x, y, legend[{label,color,dash?}], howToRead, controls[], presets[], pair?, lookFor?, animate?{control,speed,loop?}, height?}`. `lookFor` is a one-line "what to watch" under the figure; `animate` adds ▶/⏸ driving one range control (speed = control units/s; its slider is the scrubber; with `prefers-reduced-motion` it becomes a Step button). Controls: `{id,label,type: range|select|seg|toggle, min,max,step,default,group: primary|more,unit?}`. Presets are `{id,label,set:{controlId: value}, about?}`; they may only set declared (visible) controls, and serialize to the URL (`#/figure/<id>?a1=…`). The app's `src/main.ts` supplies the drawing code per figure id (see `apps/linear-systems`).

## examples.yaml (six-domains board, linear-systems)
`categories[], defs{name: html}, examples[{id,cat,n,p,sel,extra?,look,why,eq,ml}], tryThis[{id,head,text}]`. `p` is a partial assignment of the board's visible controls; `sel` must be one of `board.pairs`; `extra` is a key into `defs`.

## Hash routes
`#/` map · `#/dive/<id>?from=<map>/<node>` · `#/s/<section>` · `#/quiz?tags=a,b&title=…` · `#/figure/<id>?preset=…` · `#/board?pair=<id>&preset=<example>`.

## The question-chain format: fields and guards (reference: `apps/linear-systems`)
See [design-principles.md › The question-chain format](design-principles.md#the-question-chain-format-reference-appslinear-systems) for the rules; these are the fields that carry them.

**Box pop-up template** (`node.pop`, opt-in; when present the pop-up shows only the template):
```yaml
short: "Yes. For small changes … Doing this is called linearization: …"   # plain answer first, then the term
eq: "Δy ≈ f′(x₀) Δx"
pop:
  rough: "small change out ≈ slope × small change in"      # ≥ 8 chars
  eqKey: "Δx = small change in drive; f′(x₀) = slope at the operating point …"   # every symbol of eq
  figures:                                                  # ≤ 4, quiz-figure renderers
    - { id: pop-lintest, params: { a: 0.2 }, alt: "…", caption: "(a) 0.2 V" }    # multi-panel: captions start "(a)", "(b)"…
  figCaption: "<b>(a)</b> … <b>(b)</b> …"                   # ≥ 20 chars, required with figures, names every panel
  audio: [clip440]                                          # ids from the app's audio registry
  example: "At 0.2 V … at 2 V …"                            # the running-example line (else addsToExample)
  next: "…"                                                 # only used when the box has no outgoing line
  ask: c-lin-2                                              # one quiz id: the intuition question
```
The restated question comes from the incoming edge's `question` (the root's from its `label`); the next-question links from the outgoing edges.

**Edges** add:
```yaml
- from: LIN
  to: NEAR
  question: "Real things are never perfectly linear, so does this help?"
  idea: "Yes: for small signals …"             # the short answer shown on the line
  why: |                                        # markdown, ≥ 20 chars; main-chain lines use three leads
    **Still open:** …
    **Why it matters:** …
    **What we want:** …
  whyFigures: [{ id: pop-lintest, params: { a: 2 }, alt: "…" }]   # optional, ≤ 2
  whyFigCaption: "Box 3, panel (b): … "         # required with whyFigures
```
**Dives** add `level` (math tag; turns on *At a glance*) and `check: [quiz ids]` (*Check yourself*, 2–3). Use ```` ````callout:derivation Full derivation ```` for a collapsed derivation.

**Guards** (`packages/build/test/content.test.ts`, per app; linear-systems is the reference):
- every non-root pop-up node has an incoming question; the root label is a question;
- figures need `figCaption`; multi-panel captions are labelled and walked through;
- words: text ≤ ~150 (soft target), ≤ ~180 with captions;
- every edge has `why`; main-chain lines have *Still open / Why it matters / What we want*, ≤ ~150 words, and a caption on any figure;
- dives: `level`, 2–3 checks, *The big idea*, *Worked example: on*, *What it can't do*, ≥ 1 interactive figure; *Full derivation* only on the listed dives;
- glossary count and every term in a section.
- `subject.yaml › expect` pins the counts (maps, nodes, edges, dives, quiz, examples); the build fails if they drift, so update it deliberately.
E2E: `tests/e2e/chain-nav.spec.ts` (walk through the lines, question lines, 390 px buttons), `visuals.spec.ts` (captions), `audio.spec.ts`.
