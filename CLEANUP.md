# CLEANUP.md

A running ledger of **dead code, stale assets, and deferred tidy-ups** discovered
while the design is still in flux. Nothing here is urgent — we are intentionally
**tackling cleanup LAST**, once the design (now settled: the hybrid was promoted
to `index.html`) is settled. Until then: note it here, keep moving.

Convention: `- [ ]` open · `- [x]` done. Add a short **why** and the **files**
touched so a future pass can act without re-deriving the context.

---

## Theme

- [x] **Remove the `amber` theme site-wide** (design decision: light + dark only).
      Done in this cleanup pass: `theme.js` now cycles only `light`/`dark`;
      `tokyo.html`, `lab/site-tree.html`, `lab/threejs-assets.html`, and the
      bundled `Equation Mark.html` dropped `html[data-theme="amber"]` and amber
      toggle/state copy; legacy files carrying amber (`style.css`, `spa.html`,
      `lexicon.html`, `symbients.html`) were retired. Kept the **`--amber` colour
      token** in `index.html`/`registry.html` because it is part of the
      monochrome ink token set, not the amber theme.

- [ ] **Collapse the monochrome ink tokens in `index.html`.**
      `--green`, `--blue`, `--amber`, `--violet` are all set to the *same* value
      within each theme (the site went monochrome). They could collapse to a single
      `--ink` token. Low priority — purely a readability/tidiness win; leave until
      the palette is locked.

## Stale assets

- [x] **`assets/test-moreau-band.png` / `assets/test-moreau-hero.png`** — the
      placeholder Moreau hero band. `index.html` (the promoted hybrid) dropped the
      image banner (and the `.hero-scrim`) entirely, so these are only referenced by `spa.html` and
      `lexicon.html`. Deleted after retiring those files.

- [ ] **Audit + optimize `assets/` (23 MB, ~197 files).** Once the page set is
      final, run a full pass:
      - **Remove unused files** — grep every asset path across the *surviving* HTML/CSS/JS
        and delete anything unreferenced. `Symbiotic_Collaboration_old.png` and
        the `test-moreau-*` placeholders were already deleted; still audit any
        images tied only to retired files (`spa.html`/`lexicon.html`/`symbients.html`).
      - **Optimize what's left** — several images ship as heavy single files with no
        responsive variants: e.g. `artists/solienne.jpg` (~1.2 MB), `artists/crosslucid.png`
        (~0.8 MB), `Symbiotic_Collaboration.png` / `Symbiogenesis.png` (~0.6–1 MB PNGs),
        `events/machine-consciousness.png` (~0.55 MB). The `index.html` Organics cards
        load full-size artist/researcher portraits directly. Generate `avif`/`webp` +
        multi-size variants (mirroring the pattern the symbients already use) and/or
        recompress, so cards aren't pulling MBs. Also check the 2.2 MB
        `writings/symbient-ontology-slides.pdf` is worth shipping as-is.

## File lifecycle (the big one — needs a design decision first)

The hybrid **was promoted to `index.html`** (`git mv new_spa.html index.html`),
so it is now the canonical entry and the old `index.html` is gone. What remains is
to retire the scaffolding it was ported from and validated against. Candidates for
removal / retirement:

- [x] **`spa.html` — REMOVE when the new `index.html` is settled.** The rhizome
      scroll experiment `new_spa.html` was forked from; superseded now that the
      hybrid is live as `index.html`. Nothing links to it. (Also still referenced
      by the amber-theme and `test-moreau-*` cleanup items above — those resolve
      when it goes.) Deleted in this cleanup pass.
- [x] `lexicon.html`, `symbients.html` — the original SPA + landing that the port
      drew content and behavior from (the `spa-port-source` reference). Deleted.
- [x] `responsive.html` — the dev-only iframe harness for checking mobile/tablet/
      desktop side by side. Deleted.
- [x] `.claude/skills/spa-port-source/`, `spa-port-target/`, `spa-port-loop/` — the
      port-loop skills; only meaningful while the port is in progress. Deleted.
- [x] Decide `index.html` vs `new_spa.html` as the canonical entry — **done: the
      hybrid became `index.html`.** Source-of-truth story after this cleanup:
      `index.html` uses static `#sec-organics` cards **generated from**
      `registry.json`; `registry.html` renders the complete registry live from
      `registry.json`; the old shared `registry.js` renderer was retired.

- [x] **`registry.js` — likely retire.** The new **`registry.html`** renders
      `registry.json` with its own inline script (new aesthetic, band/col cards);
      `registry.js` targets the OLD `#registry-grid`/`.example-item` markup +
      `style.css` styles, which no surviving page provides. Removed alongside
      `style.css` after the old aesthetic files were retired.

## Housekeeping notes (verify at cleanup time)

- `index.html` `#sec-organics` cards are **generated** from `registry.json`
  (non-symbient entries). If `registry.json` changes before cleanup, regenerate
  those cards rather than hand-editing (there is a comment in the section saying so).
- `registry.html` duplicates the palette tokens, band/col card CSS, **and the
  full masthead chrome** (hero bar + tabs + burger dropdown + kaomoji terminal,
  CSS and the three IIFEs) from `index.html`'s inline stylesheet/scripts (both
  pages are intentionally self-contained, no shared stylesheet). If any of these
  change in one, mirror the other — or extract shared assets at cleanup time.
- The `#sec-symbients` showcase now scroll-reveals SIX curated symbients
  (Botto, S.A.N, Plantoid, Wib & Wob, terra0, Truth Terminal); **Plantbot,
  pneumOS and Solienne were dropped from the showcase** and live only in
  `registry.json` / `registry.html`. Their showcase data objects (organic/
  synthetic constituent columns) were deleted from `index.html` — recover from
  git history (pre `new-aesthetics` scrollytelling change) if ever re-added.
