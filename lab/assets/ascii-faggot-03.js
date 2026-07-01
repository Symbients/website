// ascii-faggot-03.js — ASSET
// "Lightning Wisdom" — the Faggots book's "FAGGOT WISDOM" plate (a bold
// art-nouveau lightning bolt cleaving a spiral sun, clouds, ocean waves and
// dotted bead-chains) rasterised into a monospace glyph grid, drawn to a
// CanvasTexture on a single fullscreen plane — same approach as the ASCII
// Sapling (tree-ascii.js).
//
// The source PNG is sampled for luminance; dark ink becomes dense glyphs via a
// tonal ramp, white paper stays empty. The densest cores flicker the hot '@'.
// Per-cell sine twinkle keeps the field alive. Monochrome + theme-aware: ink
// and void are read straight off the palette in setTheme.
//
// 2D: one fullscreen plane, OrthographicCamera(-1..1). pixelCamera=false so
// Stage2D.resize() leaves the clip-space plane untouched.

import { THREE, Stage2D, clamp } from "./common.js";

export const meta = {
    id: "ascii-faggot-03",
    name: "Lightning Wisdom",
    evokes:
        "the FAGGOT WISDOM plate — a bolt of lightning cleaving a spiral sun, clouds and beaded waves, struck in ascii ink.",
    params: [
        { key: "cols", label: "grid width", min: 50, max: 150, step: 2, value: 96 },
        { key: "threshold", label: "ink threshold", min: 0.2, max: 0.9, step: 0.01, value: 0.55 },
        { key: "contrast", label: "contrast", min: 0.5, max: 4, step: 0.05, value: 1.8 },
        { key: "gamma", label: "gamma", min: 0.4, max: 2.5, step: 0.05, value: 1.1 },
        { key: "twinkle", label: "twinkle", min: 0, max: 1, step: 0.01, value: 0.35 },
        { key: "hot", label: "hot cores", min: 0.7, max: 1, step: 0.01, value: 0.9 },
    ],
};

const RAMP = " .:-=+*#%"; // symdome's tonal ramp; '@' is the hot accent
const IMG_URL = new URL("./img/faggots-03.png", import.meta.url);
// Monospace cells are taller than wide; map ~CELL_AR image-rows per image-col
// so the (portrait) picture isn't squashed vertically in the glyph grid.
const CELL_AR = 0.5;

export function create(canvas) {
    const stage = new Stage2D(canvas);
    // Normalized fullscreen-plane camera (see tree-ascii.js for the why).
    stage.pixelCamera = false;
    stage.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    stage.onResize(() => {}); // plane is normalized; nothing to do

    let palette = null;
    let params = Object.fromEntries(meta.params.map((p) => [p.key, p.value]));

    // offscreen raster of glyph cells (value 0..1)
    let COLS = params.cols | 0;
    let ROWS = Math.round(COLS * (1024 / 663) * CELL_AR);
    let field = new Float32Array(COLS * ROWS);

    // decoded source image + a small sampling canvas
    let img = null;
    let imgReady = false;
    // crop rect into the source (px), auto-detected to strip the scanned page's
    // dark screenshot chrome (side bezels + a full-width black bar). {x,y,w,h}.
    let crop = null;
    const sampCanvas = document.createElement("canvas");
    const sampCtx = sampCanvas.getContext("2d", { willReadFrequently: true });

    // glyph texture canvas
    const tcanvas = document.createElement("canvas");
    const tctx = tcanvas.getContext("2d");
    const tex = new THREE.CanvasTexture(tcanvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;

    // DoubleSide: ortho camera looks down -Z; plane front faces +Z.
    const planeMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), planeMat);
    stage.scene.add(plane);

    function allocGrid() {
        COLS = Math.max(8, params.cols | 0);
        // ROWS preserves the cropped source aspect (portrait). Fall back to the
        // plate's ~663x1024 ratio until the image is decoded + cropped.
        const cw = crop ? crop.w : 663;
        const chh = crop ? crop.h : 1024;
        const ar = chh / cw;
        ROWS = Math.max(12, Math.round(COLS * ar * CELL_AR));
        field = new Float32Array(COLS * ROWS);
    }

    // One-time: scan the decoded image and find the content rect, trimming the
    // scanned screenshot's dark chrome — full-height dark side bezels and any
    // full-width black bar at top/bottom. Pure art never spans an entire edge,
    // so "edge line that is mostly ink" is reliably chrome, not illustration.
    function detectCrop() {
        const W = img.naturalWidth;
        const H = img.naturalHeight;
        const cc = document.createElement("canvas");
        cc.width = W;
        cc.height = H;
        const cctx = cc.getContext("2d", { willReadFrequently: true });
        cctx.drawImage(img, 0, 0);
        const d = cctx.getImageData(0, 0, W, H).data;
        const dark = (x, y) => {
            const p = (y * W + x) * 4;
            return 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2] < 128;
        };
        const rowInk = (y) => {
            let n = 0;
            for (let x = 0; x < W; x++) if (dark(x, y)) n++;
            return n / W;
        };
        const colInk = (x) => {
            let n = 0;
            for (let y = 0; y < H; y++) if (dark(x, y)) n++;
            return n / H;
        };
        const FULL = 0.6; // an edge line ≥60% ink = screenshot chrome bar
        let x0 = 0,
            x1 = W - 1,
            y0 = 0,
            y1 = H - 1;
        while (x0 < x1 && colInk(x0) > FULL) x0++;
        while (x1 > x0 && colInk(x1) > FULL) x1--;
        while (y0 < y1 && rowInk(y0) > FULL) y0++;
        while (y1 > y0 && rowInk(y1) > FULL) y1--;
        // The screenshot's black bar can sit just inside a white footer/header,
        // so a pure edge-trim misses it. Within a margin of each edge, also pull
        // the bound past any full-width ink bar (and the now-empty strip beyond).
        const margin = Math.round(H * 0.06);
        // Bottom: if a full-ink bar sits within the margin, lift y1 above the bar.
        for (let y = y1; y > y1 - margin && y > y0; y--) {
            if (rowInk(y) > FULL) {
                while (y > y0 && rowInk(y) > FULL) y--; // skip the whole bar
                y1 = y;
                break;
            }
        }
        // Top: mirror.
        for (let y = y0; y < y0 + margin && y < y1; y++) {
            if (rowInk(y) > FULL) {
                while (y < y1 && rowInk(y) > FULL) y++;
                y0 = y;
                break;
            }
        }
        crop = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    }

    function buildField() {
        allocGrid();
        if (!imgReady || !img) return;

        const sw = COLS;
        const sh = ROWS;
        sampCanvas.width = sw;
        sampCanvas.height = sh;
        // white paper background so any letterbox slack reads as empty
        sampCtx.fillStyle = "#ffffff";
        sampCtx.fillRect(0, 0, sw, sh);

        // Source rect = the auto-detected content crop (chrome stripped).
        const sx0 = crop.x;
        const sy0 = crop.y;
        const srcW = crop.w;
        const srcH = crop.h;

        // Fit the cropped image into COLS x ROWS preserving aspect (center).
        const imgAR = srcW / srcH;
        const gridAR = sw / sh;
        let dw, dh, dx, dy;
        if (imgAR > gridAR) {
            dw = sw;
            dh = sw / imgAR;
            dx = 0;
            dy = (sh - dh) / 2;
        } else {
            dh = sh;
            dw = sh * imgAR;
            dy = 0;
            dx = (sw - dw) / 2;
        }
        sampCtx.imageSmoothingEnabled = true;
        sampCtx.drawImage(img, sx0, sy0, srcW, srcH, dx, dy, dw, dh);

        const data = sampCtx.getImageData(0, 0, sw, sh).data;
        const thr = params.threshold;
        const con = params.contrast;
        const gam = params.gamma;

        for (let cy = 0; cy < ROWS; cy++) {
            for (let cx = 0; cx < COLS; cx++) {
                const p = (cy * sw + cx) * 4;
                // luminance 0..1 (white paper ~1, black ink ~0)
                const lum =
                    (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;
                let d = 1 - lum; // darkness = ink amount
                // threshold + contrast pivoting around (1-thr) so white stays empty
                d = (d - (1 - thr)) * con + 0.5;
                d = clamp(d, 0, 1);
                d = Math.pow(d, gam); // gamma shaping
                field[cy * COLS + cx] = d;
            }
        }
    }

    function loadImage() {
        allocGrid(); // blank field so first frames render the void
        const im = new Image();
        im.decoding = "async";
        im.onload = () => {
            img = im;
            detectCrop(); // strip scanned screenshot chrome once
            imgReady = true;
            buildField();
        };
        im.onerror = () => {
            imgReady = false; // leave field blank on failure
        };
        im.src = IMG_URL.href;
    }

    function render(t) {
        if (!palette) return;
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
        const hotCut = params.hot;

        for (let cy = 0; cy < ROWS; cy++) {
            for (let cx = 0; cx < COLS; cx++) {
                const i = cy * COLS + cx;
                const v = field[i];
                if (v <= 0.02) continue; // white paper → empty
                // per-cell sine twinkle (symdome-style)
                const tw1 = 0.88 + tw * 0.3 * Math.sin(t * 1.4 + cx * 0.7 + cy * 0.9);
                const vv = Math.min(1, v * tw1);

                let glyph;
                let alpha;
                if (v >= hotCut) {
                    // densest cores flicker the hot '@'
                    glyph = "@";
                    alpha = 0.92 + 0.08 * Math.sin(t * 4 + i);
                } else {
                    const idx = Math.max(
                        0,
                        Math.min(RAMP.length - 1, Math.round(vv * (RAMP.length - 1)))
                    );
                    glyph = RAMP[idx];
                    alpha = 0.5 + 0.5 * vv;
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
            buildField();
        },
        resize: () => stage.resize(),
        dispose: () => {
            stage.dispose();
            tex.dispose();
            planeMat.dispose();
        },
        _init: () => loadImage(),
    };
}
