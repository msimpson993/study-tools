# Verification checklist (run before saying "done")

Automated (must be green): `npm run check`. It runs validate → typecheck → vitest → build → Playwright.

Look at it (screenshots, `npm run shots`, then open `shots/*.png`):
- [ ] Landing view is the **map**, with the central question above it. No wall of text.
- [ ] Map: no overlapping boxes/labels at 390 px and 1400 px (tests assert 0 overlaps; also eyeball).
- [ ] Tap a box → popup with short answer, equation, buttons. Tap a line (or its dot) → question + idea. Esc closes.
- [ ] Path-to-root highlights; Review mode shows unseen/seen/correct/missed; quiz this branch works.
- [ ] Running example: the map has the "Running example" fold; every node popup answers "adds to the running example" / "lets us account for".
- [ ] Every deep dive has at least one manipulable figure that opens with a picture, says what to look for, responds to its controls, and (if animated) has play/pause + scrub and a reduced-motion fallback. Look at the screenshot, not just the test.
- [ ] Dark is true black (`rgb(0,0,0)`); light toggle works and persists.
- [ ] 390 px: no horizontal scroll on map, dive, quiz, figure, board.
- [ ] Explanations collapsed on load; "More controls" collapsed; no auto-expanding boxes.
- [ ] Figures: expanded view covers only the plot area; sliders stay visible and live; pair view shows both directions; legend expands; axes are named.
- [ ] Every symbol and acronym on screen is defined (glossary drawer).
- [ ] Every map figure/panel has a caption stating what it shows and what it demonstrates; the reader never has to guess.
- [ ] Each pop-up first answers its incoming edge question directly; no unexplained leaps between boxes.
- [ ] Pop-ups (every course) aim for about 120 words; up to about 150 is fine when the idea needs it (about 180 with figure captions). Going past ~150 is OK only when truly needed, and a pop-up that needs that much should first be considered for splitting into two map topics.
- [ ] Pop-ups use the real technical terms, each with a plain definition, after the plain-words answer; every symbol in a map equation is explained.
- [ ] Chain navigation goes THROUGH the lines: box → line → box → line. A box's Next-question link(s) and Next button(s) open the outgoing line's pop-up (one per outgoing line), not the next box; a box's Back opens its incoming line (the line you actually came through first, else the main chain; the root has no Back). At a fork the main path is first and primary and the `side: true` path is labelled *Side path*; every Full-detail end box has Back and *Return to the main chain*. A line's Next opens its target box and its Back opens its source box (for a reversed dashed line, the box its arrow starts from). The e2e walk root → line → 1 → line → … → 14 and back must pass.
- [ ] Every main-chain line (including the dashed look-back) has a "why ask it here" that teaches how to think: what the previous box left unanswered, why that gap matters, and what kind of answer we are looking for. It may be as long as it needs, but leans brief (~150 words), and follows the pop-up rules: plain words first, real terms defined, figures (reused or small new ones on the running examples) captioned, no leaps.
- [ ] Every box pop-up restates its question at the top, above the one-line answer: the incoming line's question (the one the reader arrived by, else the main-chain one); the root states the full central question. Box 4, for example, opens with "Real things are never perfectly linear, so does this help?". Checked by e2e on every box of both maps.
- [ ] Every dive follows the dive template: math-level tag (At a glance), opens on its map question, The big idea, See it, symbols labelled by physical meaning, collapsed Full derivation only where expected, Worked example on the running example, What it can't do, Check yourself with 2–3 questions.
- [ ] Every dive has at least one interactive figure, more where they help.
- [ ] Audio follows the rules: generated from the running example's model, nothing plays before Play is pressed, short clips at a low normalised peak, one Stop silences everything, each player has a "What you hear" note; sound only where it teaches.
- [ ] Single-file output opens from `file://` with no network (`dist/<app>/index.html`).
- [ ] Ported pages: `expect:` counts unchanged, every legacy feature still present (compare to the original side by side).
- [ ] CI green on GitHub; Pages URL returns 200 for the hub and each app.

Full legacy pairwise check for the six-domains board (now in linear-systems; slow, ~10 min): `npm run test:e2e:full`.
- [ ] At 390 px nothing makes the page scroll sideways: the Live figures list wraps its buttons, the board's pair views wrap their equation rows, and a wide dive equation scrolls inside its own box with a fade and a *scroll sideways* cue (`scrollhint.ts`). The phone landing shows the map in the top 60% of the screen and the root label whole (`tests/e2e/phone-layout.spec.ts`).
