# SPA port manifest (rhizome-spa)

Target: `spa.html` — vertical-scroll layout, frozen hero+nav, section-scoped
readers. Source: `lexicon.html` (+ `symbients.html`). See sibling skills
`spa-port-source` / `spa-port-target`. The loop (`spa-port-loop`) advances the
topmost actionable row. Statuses: `todo` · `in-progress` · `changes-requested` · `done`.

| # | section | target id | source | status | blocked_by | notes / reviewer verdict |
|---|---------|-----------|--------|--------|------------|--------------------------|
| 0 | chrome / shell | (whole `spa.html` frame) | lexicon.html theme bootstrap + tokens + `#field` + `.hero`/`.hero-nav` + theme-toggle; nav becomes anchor-scroll + scroll-spy; `main.scroll` container | done | — | **PASS** (reviewed). spa.html created (~766 lines): fixed `.site-hero` z5, `.scroll` padding-top `--hero-h`, 7 `#sec-*` placeholders w/ `scroll-margin-top`, scroll-spy IO, ported field/terminal/theme IIFEs verbatim. Sections land at 460=heroH. |
| 1 | symbients (landing) | `#sec-symbients` | symbients.html (define: extitutional creature + dir-tree; show: next/prev symbients, familiar, wires, portrait) — currently iframed at lexicon.html 1497–1499 | todo | 0 | biggest; "harmonize later". v1 may keep define/show modes inside the section |
| 2 | narrative | `#sec-narrative` | lexicon.html 1502–1600 + module 3024–3293 | todo | 0 | EASIEST: reader already section-scoped; do this first after chrome to validate the pattern |
| 3 | lexicon | `#sec-lexicon` | lexicon.html 1602–1805 + reader IIFE 2498–2827 | todo | 0 | convert shell-wide reader → section-scoped; carries the footer/colophon |
| 4 | events | `#sec-events` | lexicon.html 1808–1865 | todo | 0 | external-link cards (`data-href`) |
| 5 | writings | `#sec-writings` | lexicon.html 1868–1932 | todo | 0 | includes the PDF download card |
| 6 | organics | `#sec-organics` | lexicon.html 1935–2172 | todo | 0 | 22 cards; reshuffle on scroll-into-view |
| 7 | tree | `#sec-tree` | lexicon.html 2175–2185 + builder 2829–3018 | todo | 0,2,3,4,5,6 | leaf click → scroll to `#sec-<view>` + open scoped reader; do last |

## Suggested order
0 (chrome) → 2 (narrative, validates the scoped-reader pattern) → 4 (events) →
5 (writings) → 3 (lexicon) → 6 (organics) → 1 (symbients landing) → 7 (tree).
The manifest table is ordered by section number, but the loop may pick by this
suggested order as long as `blocked_by` is satisfied (chrome first; tree last).

## Carry-over follow-ups (non-blocking, revisit during/after the noted section)
- **tree (#7)**: re-verify scroll-spy once tree has real content — currently the thin tree placeholder rests short of the hero offset, so organics stays `.active` at the very bottom. Should self-resolve when tree is tall enough to reach the 460 offset.
- **hero**: v1 freezes the full ~46vh hero (`--hero-h: clamp(260px,46vh,460px)`); a compact fixed bar is a later refinement (harmonize phase).

## Log
- (init) manifest created; skills authored; scaffold not yet built.
- (iter 0) chrome/shell ported into `spa.html` by porter subagent; independent reviewer → PASS. Theme/field/terminal IIFEs verbatim; fixed hero + anchor-scroll + scroll-spy working; lexicon.html/symbients.html untouched. Next actionable: #2 narrative (validates the scoped-reader pattern).
