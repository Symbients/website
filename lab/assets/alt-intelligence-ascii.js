// alt-intelligence-ascii.js — ASSET
// "Alternative Intelligence" — the "Technology + Humans = Symbient" plate
// (assets/TechnologyPlusHumans.png) sampled into a monospace glyph grid, in the
// exact style of the ASCII Sapling / Faggot-wisdom plates and the Extitutional
// Creature. The source is mostly dark-ink-on-cream: a black arrow in the middle,
// the line-drawn extitutional creature on the right, and the black caption
// "Technology + Humans = Symbient" along the bottom carry the composition; the
// pale white robot on the left is very low-contrast against the cream page (only
// its face/eyes really darken). We invert + threshold like the extitutional
// asset, but with a LOW background cutoff (~0.14) and only MODERATE contrast
// (~1.4) so the robot's faint outline is partly retained as ghostly glyphs while
// the arrow / creature / caption read crisply. The very darkest cells (arrow,
// inky strokes) light up as a hot '@'. A gentle per-cell sine twinkle keeps the
// field breathing, like symdome's ascii trees. The wide landscape aspect
// (1114x602 ≈ 1.85) is preserved via ROWS = COLS × h/w.
//
// 2D: one fullscreen plane, OrthographicCamera(-1..1). The "shader" is a
// procedural canvas kept as a glyph field built through a tonal ramp.
// Faithful by construction: the actual PNG is decoded to an offscreen canvas,
// its pixels read once, and each grid cell's luminance mapped to a glyph.

import { THREE, Stage2D, makeRng, clamp } from "./common.js";

// The source plate lives in the site's top-level assets dir (served at
// /assets/TechnologyPlusHumans.png). Resolve relative to this module so it works
// from lab/assets/ regardless of how the page is served.
const SRC = new URL("../../assets/TechnologyPlusHumans.png", import.meta.url);

// Native source dimensions — used for the fallback aspect until the image
// decodes. 1114x602 ≈ 1.85 (wide landscape).
const SRC_W = 1114;
const SRC_H = 602;

export const meta = {
    id: "alt-intelligence-ascii",
    name: "Alternative Intelligence",
    evokes:
        "Technology + Humans = Symbient struck as living ascii — a black arrow and the line-drawn creature carry the composition while the pale robot lingers as ghostly glyphs and the caption condenses from ink, a hot @ burning in the darkest strokes.",
    params: [
        { key: "cols", label: "grid width", min: 60, max: 160, step: 2, value: 110 },
        { key: "contrast", label: "ink contrast", min: 0.4, max: 2.5, step: 0.05, value: 1.4 },
        { key: "threshold", label: "background cutoff", min: 0.04, max: 0.6, step: 0.01, value: 0.14 },
        { key: "twinkle", label: "twinkle", min: 0, max: 1, step: 0.01, value: 0.7 },
    ],
};

const RAMP = " .:-=+*#%"; // symdome's tonal ramp; '@' is the hot accent
// This asset paints the glyph texture so it FILLS the COLS×ROWS canvas (the
// plane is the whole stage), so each glyph cell maps to a near-square screen
// patch. To keep the landscape plate at its true ≈1114/602 (1.85) aspect we
// take ROWS = COLS × (h/w) directly (CELL_AR = 1) — the image then fills the
// grid by width with no squashing, instead of collapsing into a narrow strip.
const CELL_AR = 1.0;

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
    // aspect (fall back to the plate's 1114x602 ratio until decoded).
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
            console.error("alt-intelligence-ascii: image failed to load", SRC.href, e);
        };
        im.src = SRC.href;
    }

    // Draw the source to a small offscreen canvas and read its luminance once.
    // The page is cream/white, so we flatten any alpha onto white and store
    // DARKNESS (1 = pure black ink) — the inversion the brief calls for: dark/inky
    // pixels (arrow, creature, caption) become the dense glyphs, the cream page
    // becomes empty void, and the pale robot survives faintly under a low cutoff.
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
        octx.fillStyle = "#ffffff"; // flatten any alpha onto white (page is cream/white)
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

    function aspectRows() {
        // Preserve the source aspect: ROWS = COLS * (h/w) * CELL_AR. The CELL_AR
        // factor accounts for monospace cells being taller than wide, so each
        // glyph maps to a roughly square screen patch and the plate keeps its
        // wide landscape proportions instead of being stretched.
        const imgAR = lumW && lumH ? lumH / lumW : SRC_H / SRC_W; // h/w
        return Math.max(20, Math.round(COLS * imgAR * CELL_AR));
    }

    function allocGrid() {
        COLS = params.cols | 0;
        ROWS = aspectRows();
        field = new Float32Array(COLS * ROWS);
        hot = new Uint8Array(COLS * ROWS);
    }

    // Resample the luminance buffer into the COLS×ROWS glyph field. The image is
    // fit into the grid preserving aspect and centered (letterboxed); the slack
    // cells stay empty (cream page -> clean void), so the plate reads at true
    // proportions, not stretched.
    function rebuild() {
        allocGrid();
        if (!imgLoaded || !lum) return; // render blank until loaded

        const rng = makeRng(42);
        const thr = params.threshold;
        const contrast = params.contrast;

        // Fit the image into the grid preserving aspect, centered (letterbox).
        // Work in glyph-cell units, undoing the cell aspect so the comparison is
        // in true on-screen proportions: the grid's screen aspect is
        // COLS / (ROWS * CELL_AR), the image's is lumW / lumH.
        const imgAR = lumW / lumH; // w/h (≈1.85 landscape)
        const gridAR = COLS / (ROWS * CELL_AR); // grid w/h in true screen terms
        let drawCols, drawRows, offX, offY;
        if (imgAR >= gridAR) {
            // image is wider than the grid -> fit width, letterbox top/bottom
            drawCols = COLS;
            drawRows = Math.round((COLS / imgAR) * CELL_AR);
            offX = 0;
            offY = Math.floor((ROWS - drawRows) / 2);
        } else {
            // image is taller than the grid -> fit height, letterbox left/right
            drawRows = ROWS;
            drawCols = Math.round((ROWS * CELL_AR) * imgAR);
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

                // Threshold the cream background to blank so the plate sits on
                // clean void. A LOW cutoff keeps the pale robot's faint outline.
                // Remap the surviving ink range to 0..1 so it fills the full ramp.
                if (d <= thr) {
                    continue; // empty cell (no glyph) — crisp void
                }
                let v = (d - thr) / (1 - thr);
                // contrast curve: a moderate >1 deepens the inky strokes (arrow,
                // creature, caption) while keeping the pale robot's soft grey
                // shading legible rather than crushing it to nothing.
                v = Math.pow(clamp(v, 0, 1), 1 / contrast);

                // tiny dither so flat grey shading isn't dead-uniform
                const jitter = (rng() - 0.5) * 0.05;
                v = clamp(v + jitter, 0, 1);

                const cx = rx + offX;
                const cy = ry + offY;
                if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
                const i = cy * COLS + cx;
                field[i] = v;
                // the very darkest cores (arrow, deepest ink) burn hot
                if (v > 0.88) hot[i] = 1;
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
                // twinkle: per-cell phase, symdome-style sine
                const tw1 = 0.85 + tw * 0.4 * Math.sin(t * 1.5 + cx * 0.7 + cy * 0.9);
                v = Math.min(1, v * tw1);

                // hot '@' on the densest cores (arrow, inky strokes), gently pulsing
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
                    alpha = 0.5 + 0.5 * v;
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
        resize: () => stage.resize(),
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
