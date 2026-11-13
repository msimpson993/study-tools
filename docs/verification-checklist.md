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
- [ ] Single-file output opens from `file://` with no network (`dist/<app>/index.html`).
- [ ] Ported pages: `expect:` counts unchanged, every legacy feature still present (compare to the original side by side).
- [ ] CI green on GitHub; Pages URL returns 200 for the hub and each app.

Full legacy pairwise check for the transforms board (slow, ~10 min): `npm run test:e2e:full`.
