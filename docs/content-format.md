# Content format

An app is `apps/<id>/subject.yaml` + `apps/<id>/content/*`. `npm run validate` (also part of `build`) checks everything against `schemas/*.schema.json` plus cross-file rules, and fails with the file and id.

## subject.yaml
`id, title, centralQuestion, blurb, archetype (guide|overview), categories[], sections[], hub.order, board.pairs[], expect{}`.
- `sections` order = sidebar order. **The first section must be `kind: map`.** Kinds: `map | dives | md | quiz | board | glossary | figures` (`md` reads `content/sections/<id>.md`).
- `runningExample: {title, summary, details?}` is the one concrete system threaded through the subject (see below). `expect` is the porting guard: `maps, nodes, edges, dives, quiz, examples`. Build fails if counts drift.

## graph.yaml (the map)
```yaml
maps:
  - id: chain              # ^[a-z0-9-]+$
    title: The question chain
    caption: optional text under "How to read this map"
    nodes:
      - id: root           # exactly one node per map is `root`; all nodes must be reachable from it
        label: Short box text
        detail: optional second line
        kind: box|decision|terminal
        series: 0..3       # colour family
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
Front matter: `id, order, title, category, chain[{title,detail?}], neighbors[ids], matlab?, addsToExample?, accountsFor?` (the last two default to the linking node's). Body is Markdown with:
- `$…$` / `$$…$$` KaTeX (build-time; a KaTeX error fails the build);
- ```` ```eq ```` fence for plain Unicode equation lines;
- ```` ```figure:<figure id> ```` embeds a figure from `figures.yaml` inline (its own controls, no URL sync). The id must exist (build fails otherwise). Put it right after the sentence that sets up what to watch.
- ```` ```callout:<kind> [lead] ```` with kind `short|why|recognize|trap|predict|note` (use a 4-backtick outer fence if it contains a fence).

## quiz.yaml
List of `{id, tags[], kind, q, …}`. `kind: recall` needs `a`; every other kind (`recognize|action|compute|trap`) needs `choices[2..6], answer (index), why`. Each tag must match a node `quizTag/dive/id` or a dive id. Subtree quizzes use these tags.

## glossary.yaml
`[{term, meaning, units?}]`, shown in the "Variables" drawer.

## figures.yaml (core Figure component)
`{id, title, x, y, legend[{label,color,dash?}], howToRead, controls[], presets[], pair?, lookFor?, animate?{control,speed,loop?}, height?}`. `lookFor` is a one-line "what to watch" under the figure; `animate` adds ▶/⏸ driving one range control (speed = control units/s; its slider is the scrubber; with `prefers-reduced-motion` it becomes a Step button). Controls: `{id,label,type: range|select|seg|toggle, min,max,step,default,group: primary|more,unit?}`. Presets are `{id,label,set:{controlId: value}, about?}`; they may only set declared (visible) controls, and serialize to the URL (`#/figure/<id>?a1=…`). The app's `src/main.ts` supplies the drawing code per figure id (see `apps/linear-systems`).

## examples.yaml (transforms board)
`categories[], defs{name: html}, examples[{id,cat,n,p,sel,extra?,look,why,eq,ml}], tryThis[{id,head,text}]`. `p` is a partial assignment of the board's visible controls; `sel` must be one of `board.pairs`; `extra` is a key into `defs`.

## Hash routes
`#/` map · `#/dive/<id>?from=<map>/<node>` · `#/s/<section>` · `#/quiz?tags=a,b&title=…` · `#/figure/<id>?preset=…` · `#/board?pair=<id>&preset=<example>`.
