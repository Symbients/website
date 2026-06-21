// ascii-faggot-02.js — ASSET
// "Smoke Wisdom" — the FAGGOT WISDOM plate (faggots-02.png) sampled into a
// monospace glyph grid, in the exact style of the ASCII Sapling. The stark
// art-nouveau line-art (ornamental curls, clouds, a reclining figure, and the
// swirling smoke column rising from the bottom) is thresholded so the white
// page stays empty and the black ink condenses into dense glyphs, with a hot
// '@' flickering on the densest ink-cores. A gentle per-cell sine twinkle keeps
// the field breathing, like symdome's ascii trees.
//
// 2D: one fullscreen plane, OrthographicCamera(-1..1). The "shader" is a
// procedural canvas kept as a glyph field built through a tonal ramp.

import { THREE, Stage2D, makeRng, clamp } from "./common.js";

const SRC = new URL("./img/faggots-02.png", import.meta.url);

export const meta = {
    id: "ascii-faggot-02",
    name: "Smoke Wisdom",
    evokes:
        "the FAGGOT WISDOM plate rendered as living ascii — art-nouveau curls and the rising smoke-column condensed from ink into glyphs, a hot @ on every dense core.",
    params: [
        { key: "cols", label: "grid width", min: 50, max: 160, step: 2, value: 120 },
        { key: "threshold", label: "ink threshold", min: 0.1, max: 0.9, step: 0.01, value: 0.42 },
        { key: "gamma", label: "ink density", min: 0.4, max: 2.5, step: 0.05, value: 1.45 },
        { key: "twinkle", label: "twinkle", min: 0, max: 1, step: 0.01, value: 0.4 },
        { key: "hot", label: "hot accent", min: 0, max: 1, step: 0.01, value: 0.45 },
        { key: "seed", label: "seed", min: 1, max: 999, step: 1, value: 42 },
    ],
};

const RAMP = " .:-=+*#%"; // symdome's tonal ramp; '@' is the hot accent

export function create(canvas) {
    const stage = new Stage2D(canvas);
    // Normalized fullscreen-plane camera. pixelCamera=false stops Stage2D's
    // resize() from rewriting these bounds into pixel space.
    stage.pixelCamera = false;
    stage.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    stage.onResize(() => {}); // plane is normalized; nothing to do

    let palette = null;
    let params = Object.fromEntries(meta.params.map((p) => [p.key, p.value]));

    // offscreen glyph raster (value 0..1) + hot flags
    let COLS = params.cols | 0;
    let ROWS = Math.round(COLS * 1.0);
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
            console.error("ascii-faggot-02: image failed to load", SRC.href, e);
        };
        im.src = SRC.href;
    }

    // Draw the source to a small offscreen canvas and read its luminance once.
    function readLuminance() {
        if (!img) return;
        // Sample the source at a generous fixed grid so any COLS choice can be
        // box-averaged down from it crisply.
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
        octx.fillStyle = "#ffffff"; // flatten any alpha onto white (page is white)
        octx.fillRect(0, 0, lumW, lumH);
        octx.drawImage(img, 0, 0, lumW, lumH);
        const data = octx.getImageData(0, 0, lumW, lumH).data;
        lum = new Float32Array(lumW * lumH);
        for (let p = 0, j = 0; p < data.length; p += 4, j++) {
            const a = data[p + 3] / 255;
            // composite over white already done; use rec601 luminance
            const r = data[p], g = data[p + 1], b = data[p + 2];
            const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            // darkness = how black the ink is (1 = pure black)
            lum[j] = (1 - L) * a + 0 * (1 - a);
        }
    }

    function aspectRows() {
        // Preserve source aspect ratio: with square-ish glyph cells the grid
        // rows follow the image's height/width. Account for the glyph cell
        // being taller than wide (monospace ~0.6 advance) so the picture isn't
        // vertically squashed: ROWS = COLS * (h/w) * cellAspect.
        const imgAR = lumW && lumH ? lumH / lumW : 1024 / 665; // h/w
        const CELL_W_OVER_H = 0.52; // glyph advance / line height (approx)
        return Math.max(20, Math.round(COLS * imgAR * CELL_W_OVER_H));
    }

    function allocGrid() {
        COLS = params.cols | 0;
        ROWS = aspectRows();
        field = new Float32Array(COLS * ROWS);
        hot = new Uint8Array(COLS * ROWS);
    }

    // Resample the luminance buffer into the COLS×ROWS glyph field. The image
    // already fills the grid (ROWS derived from its aspect), so there is no
    // letterboxing needed when COLS drives ROWS — but if the derived ROWS would
    // exceed a sane max we center/letterbox the image inside the grid.
    function rebuild() {
        allocGrid();
        if (!imgLoaded || !lum) return; // render blank until loaded

        const rng = makeRng(params.seed | 0);
        const thr = params.threshold;
        const gamma = params.gamma;

        // Fit the image into the grid preserving aspect, centered (letterbox).
        const imgAR = lumW / lumH; // w/h
        const gridAR = COLS / (ROWS / 0.52); // grid w/h in image-pixel terms (undo cell aspect)
        let drawCols, drawRows, offX, offY;
        if (imgAR >= gridAR) {
            // image is wider than grid -> fit width
            drawCols = COLS;
            drawRows = Math.round((COLS / imgAR) * 0.52);
            offX = 0;
            offY = Math.floor((ROWS - drawRows) / 2);
        } else {
            drawRows = ROWS;
            drawCols = Math.round((ROWS / 0.52) * imgAR);
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

                // Threshold: white page below threshold -> empty. Remap the
                // surviving range to 0..1 so the ink fills the full ramp.
                if (d <= thr) {
                    continue; // empty cell (no glyph) — keeps white space crisp
                }
                let v = (d - thr) / (1 - thr);
                v = Math.pow(clamp(v, 0, 1), 1 / gamma); // gamma boosts ink density

                // tiny ordered-ish dither so flat ink-fields aren't dead-uniform
                const jitter = (rng() - 0.5) * 0.06;
                v = clamp(v + jitter, 0, 1);

                const cx = rx + offX;
                const cy = ry + offY;
                if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
                const i = cy * COLS + cx;
                field[i] = v;
                // densest cores become hot-accent candidates
                if (v > 0.82) hot[i] = 1;
            }
        }
    }

    // --- render ------------------------------------------------------------
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
        const hotAmt = params.hot;

        for (let cy = 0; cy < ROWS; cy++) {
            for (let cx = 0; cx < COLS; cx++) {
                const i = cy * COLS + cx;
                let v = field[i];
                if (v <= 0.001) continue;
                // twinkle: per-cell phase, symdome-style sine
                const tw1 = 0.85 + tw * 0.4 * Math.sin(t * 1.5 + cx * 0.7 + cy * 0.9);
                v = Math.min(1, v * tw1);

                // hot '@' flicker on the densest cores
                let glyph;
                let alpha;
                const isHot =
                    hot[i] &&
                    hotAmt > 0 &&
                    Math.sin(t * 3.0 + i * 0.13) > 1 - hotAmt * 2; // flickers on/off
                if (isHot) {
                    glyph = "@";
                    alpha = 0.92 + 0.08 * Math.sin(t * 5 + i);
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
            // params (twinkle, hot) take effect next frame for free.
            if (k === "cols" || k === "threshold" || k === "gamma" || k === "seed") {
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
