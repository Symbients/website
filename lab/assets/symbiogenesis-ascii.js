// symbiogenesis-ascii.js — ASSET
// "New Symbiogenesis" — the Symbiogenesis sketch (assets/Symbiogenesis.png)
// sampled into a monospace glyph grid, in the exact style of the ASCII Sapling /
// Faggot-wisdom plates and the Extitutional Creature. The source is a high-
// contrast pencil/ink drawing on a near-white page: a gaunt human figure on the
// left, a radiant central figure haloed in light, and a robotic figure on the
// right, all reaching in and holding hands — three becoming one body. Being
// dark-on-light line/pencil art, the extitutional inversion+threshold approach
// fits directly: the white page is thresholded to clean void and the inky
// strokes condense into dense glyphs. The source sketch is soft pencil shading
// on a faint-grey page, so it needs an aggressive curve to avoid a flat grey
// wash: a firm background cutoff (~0.28) clears the haze around the figures to
// clean void, and a strong contrast (~3.4, with the curve v = pow(v, 1/contrast)
// lifting surviving mids toward the dense end of the ramp) makes the dark strokes
// pop while separating the soft shading. The darkest cores burn a hot '@' from
// v > 0.84. A gentle per-cell sine
// twinkle keeps the field breathing, like symdome's ascii trees. Square plate
// (1024x1024) so ROWS = COLS.
//
// 2D: one fullscreen plane, OrthographicCamera(-1..1). The "shader" is a
// procedural canvas kept as a glyph field built through a tonal ramp.
// Faithful by construction: the actual PNG is decoded to an offscreen canvas,
// its pixels read once, and each grid cell's luminance mapped to a glyph.

import { THREE, Stage2D, makeRng, clamp } from "./common.js";

// The source sketch lives in the site's top-level assets dir (served at
// /assets/Symbiogenesis.png). Resolve relative to this module so it works from
// lab/assets/ regardless of how the page is served.
const SRC = new URL("../../assets/Symbiogenesis.png", import.meta.url);

// Native source dimensions — used for the fallback aspect until the image
// decodes. 1024x1024 = 1.0 (square).
const SRC_W = 1024;
const SRC_H = 1024;

export const meta = {
    id: "symbiogenesis-ascii",
    name: "New Symbiogenesis",
    evokes:
        "human, radiant being, and machine reaching in to hold hands — three sketched figures becoming one body, struck as living ascii: pencil strokes condensed from ink into glyphs, a hot @ burning in the darkest cores.",
    params: [
        { key: "cols", label: "grid width", min: 60, max: 160, step: 2, value: 110 },
        { key: "contrast", label: "ink contrast", min: 0.4, max: 5, step: 0.05, value: 3.6 },
        { key: "threshold", label: "background cutoff", min: 0.04, max: 0.6, step: 0.01, value: 0.24 },
        { key: "twinkle", label: "twinkle", min: 0, max: 1, step: 0.01, value: 0.3 },
    ],
};

const RAMP = " .:-=+*#%"; // symdome's tonal ramp; '@' is the hot accent
// The glyph texture FILLS the whole 4:3 stage. To keep the square plate
// undistorted we size the grid to the live CANVAS aspect (so each cell is a
// SQUARE on-screen patch, CELL_AR = 1) and LETTERBOX the source rectangle inside
// it at its true 1.0 aspect — the slack cells stay blank (padding cols left and
// right), so the square plate stays square instead of stretching to fill 4:3.
const CELL_AR = 1.0; // target on-screen cell aspect (w/h); 1 = square cells

export function create(canvas) {
    const stage = new Stage2D(canvas);
    // Normalized fullscreen-plane camera. pixelCamera=false stops Stage2D's
    // resize() from rewriting these bounds into pixel space.
    stage.pixelCamera = false;
    stage.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    stage.onResize(() => {}); // plane is normalized; nothing to do

    let palette = null;
    let params = Object.fromEntries(meta.params.map((p) => [p.key, p.value]));

    // offscreen glyph raster (value 0..1) + hot flags. ROWS follows the source
    // aspect (fall back to the sketch's 1024x1024 ratio until decoded).
    let COLS = params.cols | 0;
    let ROWS = Math.round(COLS * (SRC_H / SRC_W) * CELL_AR);
    let field, hot;

    // Source-image luminance buffer (small offscreen canvas). Read once on load
    // at a fixed resolution; the glyph field is resampled from this whenever a
    // param changes, so we never re-decode the image.
    let img = null; // HTMLImageElement
    let imgLoaded = false;
    let lumW = 0, lumH = 0;
    let lum = null; // Float32Array, 0..1 darkness (1 = black ink)

    // glyph texture canvas
    const tcanvas = document.createElement("canvas");
    const tctx = tcanvas.getContext("2d");
    const tex = new THREE.CanvasTexture(tcanvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;

    const planeMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), planeMat);
    stage.scene.add(plane);

    // --- image loading -----------------------------------------------------
    function loadImage() {
        const im = new Image();
        im.crossOrigin = "anonymous"; // same-origin, but harmless
        im.onload = () => {
            img = im;
            imgLoaded = true;
            readLuminance();
            rebuild();
        };
        im.onerror = (e) => {
            console.error("symbiogenesis-ascii: image failed to load", SRC.href, e);
        };
        im.src = SRC.href;
    }

    // Draw the source to a small offscreen canvas and read its luminance once.
    // The page is near-white, so we flatten any alpha onto white and store
    // DARKNESS (1 = pure black ink) — the inversion the brief calls for: dark/inky
    // pixels (the pencil strokes of the figures) become the dense glyphs, the
    // white page becomes empty void.
    function readLuminance() {
        if (!img) return;
        const TARGET = 360; // long-edge sample resolution
        const ar = img.width / img.height;
        if (ar >= 1) {
            lumW = TARGET;
            lumH = Math.max(1, Math.round(TARGET / ar));
        } else {
            lumH = TARGET;
            lumW = Math.max(1, Math.round(TARGET * ar));
        }
        const oc = document.createElement("canvas");
        oc.width = lumW;
        oc.height = lumH;
        const octx = oc.getContext("2d", { willReadFrequently: true });
        octx.fillStyle = "#ffffff"; // flatten any alpha onto white (page is near-white)
        octx.fillRect(0, 0, lumW, lumH);
        octx.drawImage(img, 0, 0, lumW, lumH);
        const data = octx.getImageData(0, 0, lumW, lumH).data;
        lum = new Float32Array(lumW * lumH);
        for (let p = 0, j = 0; p < data.length; p += 4, j++) {
            const a = data[p + 3] / 255;
            const r = data[p], g = data[p + 1], b = data[p + 2];
            const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            // darkness = how black the ink is (1 = pure black ink core)
            lum[j] = (1 - L) * a;
        }
    }

    function canvasRows() {
        // Size the glyph grid to the live CANVAS aspect (NOT the source aspect)
        // so each cell maps to a SQUARE on-screen patch: ROWS = CELL_AR * COLS *
        // H/W. The real image is then letterboxed inside this grid in rebuild(),
        // leaving blank padding cols so nothing is ever stretched.
        const W = stage.width, H = stage.height;
        const screenAR = (W && H) ? W / H : SRC_W / SRC_H; // w/h
        return Math.max(20, Math.round((CELL_AR * COLS) / screenAR));
    }

    function allocGrid() {
        COLS = params.cols | 0;
        ROWS = canvasRows();
        field = new Float32Array(COLS * ROWS);
        hot = new Uint8Array(COLS * ROWS);
    }

    // Resample the luminance buffer into the COLS×ROWS glyph field. The image is
    // fit into the grid preserving aspect and centered (letterboxed); the slack
    // cells stay empty (white page -> clean void), so the figures read at true
    // proportions, not stretched.
    function rebuild() {
        allocGrid();
        if (!imgLoaded || !lum) return; // render blank until loaded

        const rng = makeRng(42);
        const thr = params.threshold;
        const contrast = params.contrast;

        // Fit the image into the grid preserving aspect, centered (letterbox).
        // The grid is sized to the live CANVAS aspect (square on-screen cells),
        // so the grid's screen aspect is simply W/H. Place the source rectangle
        // inside it at its TRUE aspect; the slack cells stay blank (padding cols)
        // so the square plate is never stretched, in any container.
        const W = stage.width, H = stage.height;
        const screenAR = (W && H) ? W / H : (COLS / Math.max(1, ROWS));
        const imgAR = lumW / lumH; // source w/h (= 1.0 square)
        let drawCols, drawRows, offX, offY;
        if (imgAR >= screenAR) {
            // image wider than the frame -> fit width, blank rows top/bottom
            drawCols = COLS;
            drawRows = Math.round((ROWS * screenAR) / imgAR);
            offX = 0;
            offY = Math.floor((ROWS - drawRows) / 2);
        } else {
            // image taller/narrower than the frame -> fit height, blank cols L/R
            drawRows = ROWS;
            drawCols = Math.round((COLS * imgAR) / screenAR);
            offY = 0;
            offX = Math.floor((COLS - drawCols) / 2);
        }
        if (drawCols < 1) drawCols = 1;
        if (drawRows < 1) drawRows = 1;

        for (let ry = 0; ry < drawRows; ry++) {
            // source vertical span for this glyph row (box average)
            const sy0 = Math.floor((ry / drawRows) * lumH);
            const sy1 = Math.max(sy0 + 1, Math.floor(((ry + 1) / drawRows) * lumH));
            for (let rx = 0; rx < drawCols; rx++) {
                const sx0 = Math.floor((rx / drawCols) * lumW);
                const sx1 = Math.max(sx0 + 1, Math.floor(((rx + 1) / drawCols) * lumW));
                let acc = 0, n = 0;
                for (let sy = sy0; sy < sy1; sy++) {
                    const row = sy * lumW;
                    for (let sx = sx0; sx < sx1; sx++) {
                        acc += lum[row + sx];
                        n++;
                    }
                }
                let d = n ? acc / n : 0; // darkness 0..1

                // Threshold the near-white background to blank so the figures sit
                // on clean void. Remap the surviving ink range to 0..1 so it fills
                // the full ramp.
                if (d <= thr) {
                    continue; // empty cell (no glyph) — crisp white space
                }
                let v = (d - thr) / (1 - thr);
                // contrast curve: >1 deepens the inky pencil strokes (faces,
                // hands, the radiant core) while keeping soft grey shading legible.
                v = Math.pow(clamp(v, 0, 1), 1 / contrast);

                // tiny dither so flat grey shading isn't dead-uniform
                const jitter = (rng() - 0.5) * 0.05;
                v = clamp(v + jitter, 0, 1);

                const cx = rx + offX;
                const cy = ry + offY;
                if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
                const i = cy * COLS + cx;
                field[i] = v;
                // the very darkest cores (deepest ink) burn hot
                if (v > 0.80) hot[i] = 1;
            }
        }
    }

    // --- render ------------------------------------------------------------
    function render(t) {
        if (!palette) return;
        // no-op until the glyph field exists (image still decoding)
        if (!field) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = stage.width;
        const H = stage.height;
        if (tcanvas.width !== W * dpr || tcanvas.height !== H * dpr) {
            tcanvas.width = Math.max(2, W * dpr);
            tcanvas.height = Math.max(2, H * dpr);
        }
        const cw = tcanvas.width / COLS;
        const ch = tcanvas.height / ROWS;
        const fs = Math.min(cw * 1.7, ch) * 0.95;
        tctx.fillStyle = palette.voidHex;
        tctx.fillRect(0, 0, tcanvas.width, tcanvas.height);
        tctx.font = `${fs}px "Space Mono", ui-monospace, monospace`;
        tctx.textAlign = "center";
        tctx.textBaseline = "middle";

        const ink = palette.ink;
        const inkRGB = `${Math.round(ink.r * 255)},${Math.round(ink.g * 255)},${Math.round(
            ink.b * 255
        )}`;
        const tw = params.twinkle;

        for (let cy = 0; cy < ROWS; cy++) {
            for (let cx = 0; cx < COLS; cx++) {
                const i = cy * COLS + cx;
                let v = field[i];
                if (v <= 0.001) continue;
                // twinkle: a subtle per-cell shimmer that never dims far below
                // full strength, so glyphs hold bold instead of flickering faint.
                const tw1 = 1 - tw * 0.12 * (0.5 + 0.5 * Math.sin(t * 1.5 + cx * 0.7 + cy * 0.9));
                v = Math.min(1, v * tw1);

                // hot '@' on the densest cores (deepest ink), gently pulsing
                let glyph;
                let alpha;
                if (hot[i]) {
                    glyph = "@";
                    alpha = 0.92 + 0.08 * Math.sin(t * 4 + i);
                } else {
                    const idx = Math.max(
                        0,
                        Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1)))
                    );
                    glyph = RAMP[idx];
                    if (glyph === " ") continue;
                    // high opacity floor so even mid-tone glyphs read strongly
                    alpha = 0.78 + 0.22 * v;
                }
                tctx.fillStyle = `rgba(${inkRGB},${alpha.toFixed(3)})`;
                tctx.fillText(glyph, (cx + 0.5) * cw, (cy + 0.5) * ch);
            }
        }
        tex.needsUpdate = true;
    }

    function applyTheme(p) {
        palette = p;
        stage.renderer.setClearColor(p.void, 1);
    }

    stage.onFrame((t) => render(t));

    return {
        meta,
        start: () => stage.start(),
        stop: () => stage.stop(),
        setTheme: applyTheme,
        setParam: (k, v) => {
            params[k] = v;
            // grid-shaping / sampling params rebuild the field; render-only
            // params (twinkle) take effect next frame for free.
            if (k === "cols" || k === "threshold" || k === "contrast") {
                rebuild();
            }
        },
        resize: () => {
            stage.resize();
            rebuild(); // re-derive ROWS from the new canvas aspect, re-letterbox
        },
        dispose: () => {
            stage.dispose();
            tex.dispose();
            planeMat.dispose();
        },
        _init: () => {
            allocGrid(); // blank grid so render() is valid before image loads
            loadImage();
        },
    };
}
