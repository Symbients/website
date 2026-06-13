#!/usr/bin/env node
/* ----------------------------------------------------------------------
   render-figs.js — terminal preview for the About-figure renderers.
   The actual renderer lives in ascii.js (the figures are generated in
   the browser at load); this shim runs it with a stub DOM and prints
   frames for tuning.

   Usage:  node tools/render-figs.js [fig] [frame ...]
           node tools/render-figs.js            # frame 0 of every figure
           node tools/render-figs.js loop 0 4 8 # specific frames
   ---------------------------------------------------------------------- */
"use strict";

global.window = { matchMedia: () => ({ matches: true }) };
global.document = {
    readyState: "complete",
    querySelectorAll: () => [],
    addEventListener: () => {},
};
require(require("path").join(__dirname, "..", "ascii.js"));

const FIGS = global.window.SYMBIENT_FIGS;
const [name, ...frameArgs] = process.argv.slice(2);
const list = name ? [name] : Object.keys(FIGS);

for (const n of list) {
    const fig = FIGS[n];
    if (!fig) {
        console.error("unknown figure: " + n);
        process.exit(1);
    }
    const frames = frameArgs.length ? frameArgs.map(Number) : [0];
    for (const k of frames) {
        const rows = fig.build(k / fig.frames, k);
        console.log(
            "--- " + n + " frame " + k + "/" + fig.frames +
            " (" + rows[0].length + "x" + rows.length + ") ---"
        );
        console.log(rows.join("\n"));
    }
}
