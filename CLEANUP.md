# CLEANUP.md

A running ledger of **dead code, stale assets, and deferred tidy-ups** discovered
while the design is still in flux. Nothing here is urgent — we are intentionally
**tackling cleanup LAST**, once the design (now settled: the hybrid was promoted
to `index.html`) is settled. Until then: note it here, keep moving.

Convention: `- [ ]` open · `- [x]` done. Add a short **why** and the **files**
touched so a future pass can act without re-deriving the context.

---

## Theme

- [ ] **Remove the `amber` theme site-wide** (design decision: light + dark only).
      Already removed from **`index.html`** (the promoted hybrid — theme token block, pre-paint
      bootstrap, and the toggle's `themes`/`labels`/`glyph` maps). Remaining
      surfaces still carrying amber, to reconcile once the decision is final:
      - `theme.js` — the shared three-theme cycler (`light`/`dark`/`amber`);
        used by `index.html` and `tokyo.html`.
      - `style.css` — `html[data-theme="amber"]` overrides.
      - `tokyo.html` — its own inline `.theme-toggle` + amber styles (self-contained,
        does not use `style.css`).
      - Port-source files (`spa.html`, `lexicon.html`, `symbients.html`) still have
        amber, but those are slated for removal anyway (see **File lifecycle**), so
        no separate work if they go.
      - Keep the **`--amber` colour token** (part of the monochrome
        `--green/--blue/--amber/--violet` ink set) unless the token set itself is
        simplified — it is unrelated to the amber *theme*. See below.

- [ ] **Collapse the monochrome ink tokens in `index.html`.**
      `--green`, `--blue`, `--amber`, `--violet` are all set to the *same* value
      within each theme (the site went monochrome). They could collapse to a single
      `--ink` token. Low priority — purely a readability/tidiness win; leave until
      the palette is locked.

## Stale assets

- [ ] **`assets/test-moreau-band.png` / `assets/test-moreau-hero.png`** — the
      placeholder Moreau hero band. `index.html` (the promoted hybrid) dropped the
      image banner (and the `.hero-scrim`) entirely, so these are only referenced by `spa.html` and
      `lexicon.html`. Delete once those files are retired.

- [ ] **Audit + optimize `assets/` (24 MB, ~199 files).** Once the page set is
      final, run a full pass:
      - **Remove unused files** — grep every asset path across the *surviving* HTML/CSS/JS
        and delete anything unreferenced. Known/likely dead: `Symbiotic_Collaboration_old.png`
        (~0.6 MB stale `_old` copy), the `test-moreau-*` placeholders above, and any
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

- [ ] **`spa.html` — REMOVE when the new `index.html` is settled.** The rhizome
      scroll experiment `new_spa.html` was forked from; superseded now that the
      hybrid is live as `index.html`. Nothing links to it. (Also still referenced
      by the amber-theme and `test-moreau-*` cleanup items above — those resolve
      when it goes.)
- [ ] `lexicon.html`, `symbients.html` — the original SPA + landing that the port
      drew content and behavior from (the `spa-port-source` reference).
- [ ] `responsive.html` — the dev-only iframe harness for checking mobile/tablet/
      desktop side by side.
- [ ] `.claude/skills/spa-port-source/`, `spa-port-target/`, `spa-port-loop/` — the
      port-loop skills; only meaningful while the port is in progress.
- [x] Decide `index.html` vs `new_spa.html` as the canonical entry — **done: the
      hybrid became `index.html`.** Still to reconcile the source-of-truth story:
      `index.html` uses static `#sec-organics` cards **generated from**
      `registry.json`, while `registry.js` can render `registry.json` live — pick one.

## Housekeeping notes (verify at cleanup time)

- `index.html` `#sec-organics` cards are **generated** from `registry.json`
  (non-symbient entries). If `registry.json` changes before cleanup, regenerate
  those cards rather than hand-editing (there is a comment in the section saying so).
