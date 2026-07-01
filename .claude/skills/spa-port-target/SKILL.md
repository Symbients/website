---
name: spa-port-target
description: Architecture spec for the NEW vertically-scrollable Symbients layout (spa.html on branch rhizome-spa). Invoke when porting or reviewing a section to follow the target conventions — fixed hero+nav chrome, a single scroll container, section anchors with scroll-margin, section-SCOPED expand/readers, anchor-scroll + scroll-spy nav, and carried-over theme/field backdrop.
---

# SPA port — target spec (what we port INTO)

We are refactoring the `lexicon.html` SPA (which view-switches with `[hidden]`)
into **one vertically-scrollable page** where the hero + section nav are frozen
and every former "view" becomes a stacked, scrollable `<section>`. Clicking a
nav item scrolls to that section. Expanded/reader views still work, but **scoped
to their own section** instead of taking over the whole page.

Sibling skills: **spa-port-source** (what we port FROM), **spa-port-loop** (the
porting + review loop). This is a static, no-build site: hand-authored HTML with
inline `<style>`/`<script>`; what's on disk ships.

## Target file
- **`spa.html`** at the repo root — the new scroll site. Build it up section by
  section. Keep `lexicon.html` and `symbients.html` UNTOUCHED as the reference
  source during the port (the reviewer diffs against them; both can be open in
  the browser side by side at `http://localhost:8000/`).
- Do not delete or rewrite `lexicon.html` until the port is complete and approved.

## Layout architecture (v1)

```
html[data-theme]                      ← theme bootstrap inline script (ported as-is)
  <canvas id="field">                 ← fixed fullscreen backdrop (ported as-is), z:0
  <button class="theme-toggle">       ← fixed top-right (ported as-is)
  <header class="site-hero">          ← FROZEN: position:fixed; top:0; width:100%; z:high
      hero title + <nav class="site-nav"> of anchor links to #sec-*  + .terminal
  <main class="scroll">               ← the only scrolling region
      <section id="sec-symbients">    ← ported symbients.html landing
      <section id="sec-narrative">    ← ported narrative view
      <section id="sec-lexicon">      ← ported lexicon view (+ colophon/footer)
      <section id="sec-events">
      <section id="sec-writings">
      <section id="sec-organics">
      <section id="sec-tree">
```

### Fixed chrome rules
- `.site-hero` is `position: fixed; top: 0; left: 0; right: 0;` with a high
  `z-index` (above the field canvas and section content). The hero may be the
  full masthead frozen (v1 keeps it simple — freezing the existing hero is fine;
  a compact bar is a later refinement). Keep the `.theme-toggle` and `#field`
  fixed as they already are.
- `main.scroll` gets `padding-top` (or the first section gets a top offset) equal
  to the fixed hero's height so content isn't hidden under it.

### Scroll + nav rules
- Every section has `id="sec-<name>"` and `scroll-margin-top: <hero-height>` so
  anchored scrolls land *below* the frozen hero, not under it.
- `html { scroll-behavior: smooth; }` (respect `prefers-reduced-motion`: drop to
  auto). `overscroll-behavior` as needed.
- Nav items are anchor links `<a href="#sec-narrative">` (or buttons calling
  `el.scrollIntoView()`). Replace the old `show(name)`/`[hidden]` switch entirely
  — no view is hidden anymore; nav just scrolls.
- **Scroll-spy + masthead title**: the nav link `.active` underline AND the hero
  title both track the section currently in view (the title replaces the old
  per-view `TITLES` map; "Symbients", "Narrative", … per section). Implemented in
  `spa.html`: an `IntersectionObserver` wakes a `pick()` that, from live rects,
  chooses the **last section whose top has crossed the band line just below the
  hero** (deterministic — avoids an adjacent section sharing the boundary
  winning), with a **bottom-of-page guard** so the short last section ("tree")
  reads as current. Also recompute on a rAF-throttled `scroll` listener so the
  title tracks smoothly even when the IO is throttled (e.g. unfocused tab). The
  hero title must NEVER be a static "Lexicon" — it reflects the active section.
- Keep `#sec-<name>` anchors stable — the tree section and any deep links use them.

### Section-scoped reader rule (the core conversion)
The OLD lexicon/events/writings/organics reader uses `.shell.reading` to hide the
whole page. In the new layout each section owns its own reader:
- Reading state is a class on the SECTION (e.g. `section.is-reading`), never on a
  global shell. Activating it hides only THAT section's grid/bands and shows that
  section's reader IN PLACE; the rest of the page stays visible and scrollable.
- Model it on the existing **narrative reader** (`.view-narrative.reading` →
  hides `.nar-grid`, shows `.narr-reader`, relocates the live art, `fly()`
  ghost). Reuse the `.cell-ghost` fly animation and the typing effect.
- The reader expands "within whatever part of the viewport is being activated":
  it should occupy its section's box (and may grow it), the page does not jump to
  top. On open, optionally `scrollIntoView` the section so the reader is framed.
- Each card section can have its OWN reader instance, or one shared reader
  component that is re-parented into the active section. Simplest first: per-
  section reader cloned from the lexicon reader markup, scoped by section class.
- Preserve every reader feature per source: index list, media/download, prev/next
  where present, typing effect, fly animation, keyboard (Esc closes the section's
  reader; guard so only the open section reacts).

### Theme / field / globals
- Port the theme bootstrap, the `:root`/`[data-theme]` token blocks, `.theme-toggle`,
  the `#field` canvas + its IIFE, and the fonts — once, into the chrome. Keep the
  exact token names so all ported CSS keeps theming.
- Fire/consume `themechange` as before so lab-asset canvases recolor.
- Re-expose any globals still needed (`window.__lexOpen`-style open for the tree,
  a scroll-to helper). The tree's leaf clicks become: scroll to `#sec-<view>` then
  open the target card's scoped reader.

## Responsive — mobile-first, from first principles (IN SCOPE for v1)
Every section must read and work at phone, tablet, and desktop widths. This is
part of "done" and the reviewer validates all three (see `responsive.html`).

- **Fluid type, no fixed px.** Use the fluid type scale defined in `:root`
  (`--fs-hero --fs-h2 --fs-h3 --fs-body --fs-small --fs-mono --fs-term`), each a
  `clamp(min, min_rem + slope*vw, max)`: the **min governs phones**, the max caps
  on wide desktop, the vw term interpolates. Add scale steps if a section needs a
  size not covered — never hard-code a `px` font-size. Hero/section titles, nav,
  body, kickers, mono labels all use the tokens.
- **Breakpoints**: design mobile-first, then layer `@media (min-width: …)` or cap
  with `@media (max-width: 640px)`. Reference widths to verify: **~375 (mobile),
  ~768 (tablet), ~1280+ (desktop)**. The chrome already shrinks `--hero-h` and
  tightens the nav under `max-width: 640px` — follow that pattern per section.
- **Layout reflow**: multi-column grids (lexicon bands, narrative 4-up,
  symbients 3-col, organics) must collapse to fewer columns / single column on
  narrow screens; the section-scoped reader's two-column (text + media) layout
  must stack on mobile; nav wraps or scrolls; nothing overflows horizontally
  (no h-scroll on the page itself). Use `minmax()`, `auto-fit`/`auto-fill`,
  `flex-wrap`, and `clamp()` padding/gaps.
- **Touch + density**: tap targets comfortable on mobile; line-length capped with
  `max-width: …ch` so prose stays readable on wide desktop.
- **Test, don't guess**: open `responsive.html` (the dev harness) — it embeds the
  page in real-viewport iframes at mobile/tablet/desktop side by side. A section
  is not done until it looks right in all three.

## CSS / JS conventions (match the codebase)
- One inline `<style>` in `spa.html`. Port each section's CSS verbatim where it
  still applies; only adjust the reading-state selectors (shell-wide → section-
  scoped), the fixed `px` font-sizes (→ fluid tokens), and add the scroll/anchor
  rules. Reuse existing tokens — no new color literals.
- JS as small guarded IIFEs (per the repo convention: `querySelector` guard that
  bails if absent). One IIFE per concern (field, nav scroll-spy, each section's
  reader, tree). Narrative + symbients keep their `<script type="module">` for lab
  imports.
- Lab-asset contract is unchanged (`/lab/assets/*.js`, `common.js` `readPalette`).

## Definition of done (per section) — see spa-port-loop for the reviewer checklist
A section is "ported" when its markup, styles, behaviors, assets, and reader work
inside `spa.html` in the scroll layout, scoped to the section, with theming intact,
**responsive at mobile/tablet/desktop (fluid type, reflowed layout)**, the masthead
title tracking it on scroll, and no console errors — matching the source view's
content and behavior.

## Deferred (do NOT do in v1)
Cross-section visual harmonization, merging the symbients.html hard-coded data
with `registry.json`, deleting old files. (Mobile/responsive is NO LONGER
deferred — it is now in scope and validated by the reviewer.) Leave TODO notes
for anything genuinely out of scope.
