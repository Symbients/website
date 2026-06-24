# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The website for **symbient.life** — a static, hand-authored marketing/concept site. There is **no build step, no framework, no bundler, and no package.json**: HTML files reference plain `.css` and `.js` directly, and what's on disk is what ships. Edit the files, reload the browser.

## Commands

```bash
npx live-server --port=8000          # local dev server with live reload → http://localhost:8000
node tools/render-figs.js [fig] [frame ...]   # preview the ascii.js figures in the terminal
```

There are no tests, linters, or build commands. Deployment is **Cloudflare** (`wrangler.jsonc` serves the repo root as static assets, `compatibility_date` aside there is no Worker logic). The `.wrangler/` dir is local state.

Surge is used for throwaway previews (see README); not part of the main deploy.

## Pages and per-page asset loading

There are two independent pages. **Which shared assets each loads is load-bearing for any cleanup or refactor** — a class or script that's dead on one page may be live on another, and vice versa:

| Page | Stylesheets | Scripts |
|---|---|---|
| `index.html` | `style.css` | `theme.js`, `ascii.js`, `reveal.js`, `registry.js`, + large inline `<script>` |
| `tokyo.html` | `tufte-css` (CDN) + its own inline `<style>` | `theme.js`, `reveal.js` + inline `<script>` |

**`tokyo.html` does NOT load `style.css`.** It's intentionally self-contained on Tufte CSS plus inline styles (including its own `.theme-toggle`). When auditing `style.css`, judge "used" against `index.html` only — never tokyo.

The "Symbients" section (`#symbients`) of `index.html` is driven by `registry.js` reading `registry.json` (see below), so the symbient/artist cards live in **data, not HTML** — a "grep the HTML for the entity" check will not find them. (A standalone `registry.html` and an `artists.html` existed earlier in development; both were folded into this section and removed.)

## Shared JS (each file is a single IIFE, no modules/exports except where noted)

- **`theme.js`** — three themes (`light` / `dark` / `amber`) via `html[data-theme="…"]`. Auto-picks by time of day, persists a manual choice to `localStorage["symbient-theme"]`, and re-checks on focus/visibility. It looks for a `.theme-toggle` element to wire a cycle button and **silently bails if none exists** — only `tokyo.html` has a toggle; `index.html` just gets auto-theming.
- **`reveal.js`** — IntersectionObserver that tags below-the-fold `<section>`s with `.reveal` then `.is-visible` as they near the viewport. These classes are **added only here** — without JS or under `prefers-reduced-motion` the page stays fully visible. CSS must keep `.reveal`/`.is-visible` styling in sync.
- **`registry.js`** — fetches `registry.json` and renders the filterable symbient/artist directory (filter pills, search, icon socials) into any page exposing the markup (a `#registry-grid` plus `.registry-filter` buttons and `#registry-q` search). Guarded like the others — it **silently bails** where there's no `#registry-grid` (so it's harmless on `tokyo.html`). The default filter is read from whichever `.registry-filter` carries `.is-active` in the HTML. Used by `index.html` (the "Symbients" section). Card markup mirrors `.example-item`, so it inherits all card theming from `style.css`; the registry-only pieces (`.registry-*`, `.visually-hidden`) live in the registry block near the end of `style.css`. **`registry.json` is the single source of truth for the entity list**; add an entry by appending one object (`name`, `type`, `category`, `description`, `website`, `location`, `creator_or_steward`, `image`, `socials[]`). `type` is `symbient`|`artist`|`researcher`, given either as a string or an **array** of those kinds for entries that are more than one thing (e.g. Primavera De Filippi is `["artist", "researcher"]`) — the entry then renders one badge per kind and matches every corresponding filter pill. An entry may also carry an optional `sources` object (`avif`/`webp`/`fallback` srcset strings + intrinsic `width`/`height`) — when present, `registry.js` renders a responsive `<picture>` (the 8 symbients use this, reusing the avif/webp/multi-size assets on disk); when there's a plain `image`, an `<img>`; with neither, a monogram placeholder of the entry's initials (the researchers use this). The shared `sizes` string lives in `registry.js` (`IMG_SIZES`), since the grid is identical on every page.
- **`ascii.js`** — renders the animated ASCII art figures in the index About section. Each `<pre class="ascii-fig" data-fig="…">` is a 68×34 raster built from light/density fields through a tonal ramp; frames are computed lazily and cached; `prefers-reduced-motion` holds frame 0. The accent glyph `@` is wrapped in `<span class="hot">` (so `.hot` is used only from JS string literals, not in any HTML). Exposes `window.SYMBIENT_FIGS = FIGS` **solely** so `tools/render-figs.js` can drive it under a stub DOM. Editing the figures: the CSS `line-height`/char-width ratio (1.15 / 0.6) must match `ASPECT` (1.92) in the file — change them together.

## Inline page scripts

The bulk of behavior lives in `<script>` blocks at the bottom of each HTML page, written as a series of small guarded IIFEs (mobile nav burger, the `.copy-llms` "copy context for LLMs" button, the divider "creature" blink/morph animations, and the background `.symbient` kaomoji spawner that sets `el.className = "symbient"`). Follow that established pattern — IIFE + `querySelector` guard that bails if the element is absent — when adding behavior. Note: because some classes (`.hot`, `.symbient`) are only ever referenced from JS strings, a naive "grep the HTML for the class" check will wrongly flag them as dead.

## Conventions

- Three-theme support is via CSS custom properties defined at `:root` and overridden under `html[data-theme="dark"]` / `html[data-theme="amber"]`. New colors should use existing tokens (`--accent`, `--text-secondary`, `--border-medium`, `--space-*`, `--transition-*`) so they theme automatically.
- Fonts: IBM Plex Sans for body, Space Mono for mono accents (loaded from Google Fonts in each page head).
- `llms.txt`, `robots.txt`, `sitemap.xml` exist and are AI-crawler-friendly by design (the site welcomes LLM crawling) — keep them in sync with site content when pages/links change.
- `_archive/` is kept-on-purpose old material, not live source. `assets/` holds all images (many in avif/webp/png triplets).
