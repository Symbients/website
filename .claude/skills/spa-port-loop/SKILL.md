---
name: spa-port-loop
description: Drive the section-by-section port of the Symbients site into the vertical-scroll layout (spa.html on branch rhizome-spa) as a goal loop. Invoke (e.g. via /loop) to advance the port by one section — it reads the manifest, ports the next pending section following spa-port-source + spa-port-target, runs an independent reviewer pass, records the verdict, and updates the manifest. Repeats until every section is ported and reviewed.
---

# SPA port — the porting + review loop

Goal: refactor the `lexicon.html` SPA into one vertically-scrollable `spa.html`
(frozen hero + nav, stacked scrollable sections, section-scoped readers). Do it
**one section per iteration**, each gated by an independent **reviewer** that
checks the elements were properly ported. State lives in `manifest.md` (this
folder) so the loop is resumable.

Read first each iteration: **spa-port-source** (what to preserve) and
**spa-port-target** (the architecture/conventions). Confirm the dev server is up
(`http://localhost:8000`); start it if not (`npx live-server --port=8000
--no-browser` in the repo root, backgrounded).

## One iteration

1. **Pick.** Read `manifest.md`. Choose the topmost row whose status is `todo`
   (respect `blocked_by` — chrome must be `done` before content sections).
   If none are `todo`/`changes-requested`, the loop is complete → report and stop.
2. **Mark** that row `in-progress` in `manifest.md`.
3. **Port.** Implement that section in `spa.html`, following spa-port-target.
   For non-trivial sections, delegate to a **porter subagent** (Agent tool,
   general-purpose) with: the section's source location (from spa-port-source),
   the target conventions (spa-port-target), and the instruction to edit ONLY
   `spa.html` (+ create it if it doesn't exist) and NOT touch `lexicon.html`,
   `symbients.html`, or other sections. The chrome/shell section is iteration 0
   and must be done before any content section.
4. **Self-check.** `node --check` any extracted inline scripts; confirm
   `spa.html` serves 200; no obvious console errors.
5. **Review.** Spawn an independent **reviewer subagent** (general-purpose, fresh
   context — do NOT reuse the porter) with the Reviewer Checklist below, the
   source reference, and `spa.html`. The reviewer may use the browser tools
   (navigate to `http://localhost:8000/spa.html`, screenshot, run JS, read
   console) to verify at runtime, and `git show rhizome:lexicon.html` /
   `symbients.html` to diff against source. It returns a verdict:
   `pass` | `changes-requested` with a concrete list.
6. **Resolve.** If `changes-requested`, address the items (porter again if
   needed) and re-review, OR record them as follow-ups if minor and out of v1
   scope. Don't mark `done` until the reviewer returns `pass` (or the user
   accepts noted follow-ups).
7. **Record.** Update the row to `done` (or `changes-requested` with notes), with
   a one-line summary + the reviewer verdict. Commit LOCALLY only
   (`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`); never
   push unless the user asks. Then continue to the next iteration (or, under
   /loop, schedule the next wake-up; otherwise report and stop).

## Reviewer checklist (what "properly ported" means)
For the one section under review, in `spa.html`, compared to its source view:
1. **Completeness** — every element from the source section is present: headings,
   kickers, cards/cells, body/definitions, media/images, links (`data-href`),
   downloads, counters, submast, footer/colophon if it belonged here. Nothing
   silently dropped. Count cards/entries and compare.
2. **Behavior** — interactions work: card/cell click opens the reader; the reader
   is **section-scoped** (only this section's grid hides; the rest of the page
   stays visible and scrollable — NOT a whole-page takeover); prev/next, index,
   typing effect, fly/ghost animation, keyboard (Esc closes), external links open,
   downloads download, organics reshuffle on enter, lab-asset canvases run.
3. **Scroll/nav** — the section has `id="sec-<name>"` with `scroll-margin-top`;
   the nav link scrolls to it; scroll-spy marks it active; no view is `[hidden]`.
4. **Styling/theme** — styles match the source look; uses existing tokens; works
   in light/dark/amber; no hard-coded colors; layout not broken by the fixed hero.
5. **Integrity** — inline scripts parse (`node --check`); no console errors at
   runtime; `lexicon.html`/`symbients.html`/other sections untouched and unbroken.
6. **Scope** — deferred items (mobile, harmonization) are left as TODO notes, not
   half-done. Flag any regression vs the source.

Verdict MUST be backed by evidence (element counts, a screenshot, console output,
or specific line refs) — not "looks fine."

## Manifest format
`manifest.md` is a status table. Statuses: `todo` · `in-progress` ·
`changes-requested` · `done`. The loop always advances the topmost actionable
row. Keep a short notes/verdict column.

## Running as /loop
This skill is the loop body. Each `/loop` tick = one iteration above. The loop
ends when all rows are `done`. Keep iterations small (one section) so each is
independently reviewable and the user can interrupt between sections.
