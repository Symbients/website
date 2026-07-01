---
name: spa-port-source
description: Reference map of the EXISTING Symbients site (the lexicon.html SPA plus the symbients.html landing) — the source of truth for the rhizome-spa vertical-scroll refactor. Invoke when porting or reviewing a section so you know exactly what content, behavior, styles, and assets must be preserved, and where they live in the source files.
---

# SPA port — source map (what we are porting FROM)

The site we are refactoring is the **`lexicon.html` single-page app** plus the
**`symbients.html` landing** it currently embeds via an `<iframe>`. This skill is
the canonical inventory. Line numbers are anchors — always re-`grep`/`Read` to
confirm before editing, the files change.

Sibling skills: **spa-port-target** (what we port INTO), **spa-port-loop** (the
section-by-section porting + review loop).

## The two source files

| File | Role |
|---|---|
| `lexicon.html` | The SPA: fixed-ish hero + `.hero-nav` tabs, a `.shell` holding 7 `.view[data-view]` sections toggled by `[hidden]`, two reader/expand mechanisms, a field-canvas backdrop, theme system, and a dynamic tree view. **This is the spine of the new scroll site.** |
| `symbients.html` | The "symbient landing": a `.stage[data-mode="define"\|"show"]`. **define** mode = the extitutional creature canvas + definition block + dir-tree; **show** mode = 9 hard-coded symbients with organic/synthetic constituent cards, a generative "familiar" backdrop, SVG wire routing, an animated portrait frame, and **next/prev** nav. Currently iframed as the `symbients` view. |

## lexicon.html — section inventory (the 7 views)

All are `<section class="view" data-view="NAME" hidden>` inside `.shell`. Toggled
by `show(name)` (≈ lines 2442–2496), which flips `[hidden]`, sets the hero title
from a `TITLES` map, updates `.hero-nav .tab.active`, and clears reading mode.

| data-view | source lines (approx) | content | reader/expand | port notes |
|---|---|---|---|---|
| `symbients` | 1497–1499 | `<iframe src="/symbients.html">` | n/a | Replace the iframe by porting symbients.html content inline as a real section (see below). "Harmonize later." |
| `narrative` | 1502–1600 | 4-cell `.nar-grid` (`.nar-cell` → `.nar-art` canvas + raster fallback), submast, `.narr-reader` | **section-scoped** (`.view-narrative.reading`) | EASIEST: reader is already scoped. Lab assets: being-composer, symbiogenesis-ascii, symbiosis-ascii, galaxy-ascii. |
| `lexicon` | 1602–1805 | 3 `.band`s (I/II/III) of `.col` cards (4+4+3), submast, axis-scale, footer/colophon | **shell-wide** (`.shell.reading` hides `.axis-scale`,`.band`,`footer`) | Convert shell-wide reader → section-scoped. The footer/colophon lives here. |
| `events` | 1808–1865 | 1 band, 3 `.col` cards that are external links (`data-href`) | shell-wide | smallest card section; good first reader-bearing port. |
| `writings` | 1868–1932 | 2 bands (transmissions + "substrate material"), 4+1 cards; one card has `data-download="/assets/writings/symbient-ontology-slides.pdf"` | shell-wide | reader has a download affordance. |
| `organics` | 1935–2172 | 1 band, 22 `.col` cards with portraits; **reshuffled on every visit** via `window.__lexReshuffleOrganics()` | shell-wide | preserve the shuffle-on-enter behavior (re-trigger on scroll-into-view). |
| `tree` | 2175–2185 | empty `#site-tree`, built by JS into an L-system sapling site map | none | leaves call `__lexShowView(view)` + `__lexOpen(card)`; in the scroll model these must become anchor-scroll + scoped-open. |

### `.col` card anatomy (lexicon/events/writings/organics)
`.col-top` (mono label + CT) · `.term` (heading) · `.tag` · `.body > .inner`
(expandable definition) · `.meta` (voices, threads) · optional `.col-media` (image).

## The two readers (CRITICAL distinction for the port)

1. **Lexicon reader** — markup `.reader` ≈ 2187–2207; JS IIFE ≈ 2498–2827;
   exposes `window.__lexOpen`. Activated by `.shell.reading`, which **hides the
   whole shell's bands + axis-scale + footer** and shows one big reader. It
   gathers `.col` cards from ALL views into one index. Has a `fly()` cell-ghost
   animation (≈ 2731–2746) and a typing effect. **This whole-page takeover is
   exactly what must become section-scoped in the new layout.**
2. **Narrative reader** — markup `.narr-reader` ≈ 1577–1599; JS module ≈
   3024–3293. Activated by `.view-narrative.reading`, which hides only
   `.nar-grid` and shows `.narr-reader` **within the narrative section**. It
   relocates the live `.nar-art` canvas into the reader's media slot and back.
   **This is the model the scoped readers should follow.**

Both readers use the same `.cell-ghost` fly animation (CSS ≈ 1385–1402).

## Global mechanisms / chrome (the shell to port once)

- **Theme bootstrap** inline script ≈ 1441–1459: reads `localStorage["symbient-theme"]` (light/dark/amber), time-of-day default, sets `html[data-theme]` before paint.
- **Theme tokens** in `<style>` ≈ 18–71: `:root` (light) + `html[data-theme="dark"|"amber"]`. Tokens: `--void --text --dim --faint --hair --hair-2 --green --field-rgb --mono --grotesk --body --ease`. A `.theme-toggle` (≈ 1464) cycles themes; a `themechange` window event fires.
- **Field canvas** `#field` (≈ 1463) + its IIFE ≈ 2214–2440: fixed fullscreen barcode/GA backdrop reading `--field-rgb`; drives the `.terminal` line in the hero.
- **Hero / nav**: `.hero` ≈ 1468–1493 (img/tint/scrim + `.hero-inner` with `.hero-title`, `.hero-nav` of `.tab[data-view]` buttons + a Home link to `/index.html`, and `.terminal`).
- **View switching** IIFE ≈ 2442–2496: `show(name,push)`, `TITLES`, hashchange routing, exposes `window.__lexShowView`.
- **Tree builder** IIFE ≈ 2829–3018: builds `#site-tree` from the page's own views/bands/cards.
- **Exposed globals**: `window.__lexShowView`, `window.__lexOpen`, `window.__lexReshuffleOrganics`, and the `themechange` event.
- Fonts: Open Sans + Space Mono (Google Fonts, head). Everything else is inline.

## symbients.html — the landing to fold in as the `symbients` section

- `.stage[data-mode]` (≈ 666–729). CSS `.stage[data-mode="define"]` vs `["show"]` toggles which children show.
- **define**: `.creature` canvas (`/lab/assets/extitutional-ascii.js`), `.definition-block`, `.dir-tree` terminal nav (DIRS → enterShow / navigateParent).
- **show**: `.symbient` 3-col grid (`.column--organic`, `.symbient-center` with `.symbient-portrait` + animated `.portrait-frame` canvas, `.column--synthetic`), `.familiar` canvas backdrop (`/lab/assets/being-composer.js`, reseeded per step), SVG `.wires` routing, `.nav` with `#back #prev #next #to-lexicon` + `#counter`.
- Data is **hard-coded**: `SYMBIENTS` array (9 entries, ≈ 746–864), `IMAGES`, `HREFS`. (Note: `index.html`'s registry uses `registry.json` instead — different data model; do NOT conflate. For v1 keep symbients.html's own data.)
- Own inline `<style>` + its own theme bootstrap; same three-theme token system, separate CSS.

## index.html (the OLD marketing site — context only, NOT the port target)
Original landing: extitutional creature header image, 4 about blocks, `#registry-grid` directory via `registry.js`/`registry.json` (18 entities), events, writings, divider kaomoji. The lexicon.html sections already supersede most of this. Port FROM lexicon.html + symbients.html, not index.html, unless a section is missing.

## Deferred / out of scope for v1
Mobile responsiveness, visual harmonization across sections, merging the symbients.html data model with registry.json. Note them; don't do them.
