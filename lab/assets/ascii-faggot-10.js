// ascii-faggot-10.js — generative asset in the ASCII Sapling lineage.
// "Tumbling Harvest" — the tonal wood-engraving plate (faggots-10): a cascade
// of fruit, berries and leaves with a small reclining figure, re-rasterised
// into a monospace glyph grid and drawn to a CanvasTexture on one fullscreen
// plane. Unlike the stark line-art plates this is a *tonal* engraving, so the
// whole ramp " .:-=+*#%" is used with ordered (Bayer) dithering for smooth
// gradation; the hot '@' is reserved for only the very darkest cores. A gentle
// per-cell sine twinkle keeps it alive, exactly like tree-ascii.js.
//
// 2D: one fullscreen plane, OrthographicCamera(-1..1). Theme-aware ink-on-void.

import { THREE, Stage2D, clamp } from "./common.js";

export const meta = {
    id: "ascii-faggot-10",
    name: "Tumbling Harvest",
    evokes:
        "the faggots-10 wood-engraving — a cascade of fruit, berries and leaves with a small reclining figure, dithered back into living grey crosshatch.",
    params: [
        { key: "cols", label: "grid width", min: 50, max: 160, step: 2, value: 110 },
        { key: "gamma", label: "contrast", min: 0.4, max: 2.4, step: 0.05, value: 1.0 },
        { key: "dither", label: "dither", min: 0, max: 1, step: 0.01, value: 0.6 },
        { key: "twinkle", label: "twinkle", min: 0, max: 1, step: 0.01, value: 0.4 },
        { key: "hot", label: "hot cores", min: 0, max: 0.3, step: 0.005, value: 0.08 },
    ],
};

const RAMP = " .:-=+*#%"; // symdome's tonal ramp; '@' is the hot accent

// 4x4 ordered Bayer matrix, normalised to (-0.5..0.5) thresholds. Gives the
// fine, even stipple that reads as engraved crosshatch rather than banding.
const BAYER4 = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5,
].map((v) => v / 16 - 0.5);

const IMG_URL = new URL("./img/faggots-10.png", import.meta.url);

export function create(canvas) {
    // Mirror tree-ascii.js: normalized fullscreen-plane camera, pixelCamera off
    // so Stage2D.resize() leaves the -1..1 clip-space plane untouched.
    const stage = new Stage2D(canvas);
    stage.pixelCamera = false;
    stage.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    stage.onResize(() => {});

    let palette = null;
    let params = Object.fromEntries(meta.params.map((p) => [p.key, p.value]));

    // glyph field (0..1 density) over a COLS x ROWS grid + hot mask
    let COLS = params.cols | 0;
    let ROWS = Math.round(COLS * 1.5); // portrait default until the image lands
    let field, hot;

    // Source luminance, sampled once at high res into a buffer; rebuilds of the
    // glyph grid (cols / gamma changes) resample from this without re-decoding.
    let srcLum = null; // Float32Array, srcW x srcH, 0..1 (1 = dark/ink)
    let srcW = 0,
        srcH = 0;
    let imgReady = false;

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

    // ---- image load → high-res luminance buffer -------------------------
    function loadImage() {
        if (imgReady || srcLum) return;
        const img = new Image();
        img.decoding = "async";
        // same-origin asset; crossOrigin kept anonymous so getImageData is clean
        img.crossOrigin = "anonymous";
        img.onload = () => {
            // Decode into a modest offscreen canvas; cap the long edge so the
            // luminance buffer stays cheap regardless of source resolution.
            const cap = 360;
            const scale = Math.min(1, cap / Math.max(img.width, img.height));
            srcW = Math.max(1, Math.round(img.width * scale));
            srcH = Math.max(1, Math.round(img.height * scale));
            const oc = document.createElement("canvas");
            oc.width = srcW;
            oc.height = srcH;
            const octx = oc.getContext("2d", { willReadFrequently: true });
            octx.drawImage(img, 0, 0, srcW, srcH);
            const data = octx.getImageData(0, 0, srcW, srcH).data;
            srcLum = new Float32Array(srcW * srcH);
            for (let i = 0, p = 0; i < srcLum.length; i++, p += 4) {
                // perceptual luminance, then invert so dark ink → high density
                const lum =
                    (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;
                srcLum[i] = 1 - lum;
            }
            imgReady = true;
            buildField();
        };
        img.onerror = () => {
            // leave the field blank; nothing to draw but the void clear colour
            imgReady = false;
        };
        img.src = IMG_URL.href;
    }

    // ---- resample the luminance buffer into the COLS x ROWS glyph field ----
    // The COLS x ROWS grid is always drawn stretched across the full (landscape)
    // window, so ROWS is derived from the *viewport* aspect — that keeps every
    // glyph cell mapping to a roughly square patch of screen. The portrait image
    // is then fitted (aspect-preserved) and centred inside that grid as a
    // letterboxed region; cells outside the image stay empty (0).
    function buildField() {
        COLS = Math.max(8, params.cols | 0);
        const cellAspect = 1.6; // glyph cell height : width on screen
        // Viewport aspect (fallback to a wide default before first layout).
        const vw = stage.width || 16;
        const vh = stage.height || 9;
        const viewAspect = vh / vw; // height / width of the canvas
        // Cells tall so that (ROWS*cellAspect) / COLS matches the view aspect.
        ROWS = Math.max(8, Math.round((COLS * viewAspect) / cellAspect));

        field = new Float32Array(COLS * ROWS);
        hot = new Uint8Array(COLS * ROWS);
        if (!imgReady || !srcLum) return;

        // Fit the portrait image inside the grid, preserving its aspect. Each
        // grid cell covers a square screen patch of size (cw, cw*cellAspect), so
        // the image's on-screen aspect in *cell* units is srcAspect / cellAspect.
        const srcAspect = srcH / srcW; // > 1 for portrait
        const imgAspectCells = srcAspect / cellAspect; // rows-per-col to stay square
        // Try full width; if too tall, fall back to full height.
        let imgCols = COLS;
        let imgRows = Math.round(imgCols * imgAspectCells);
        if (imgRows > ROWS) {
            imgRows = ROWS;
            imgCols = Math.round(imgRows / imgAspectCells);
        }
        imgCols = Math.max(1, Math.min(COLS, imgCols));
        imgRows = Math.max(1, Math.min(ROWS, imgRows));
        // Letterbox offsets to centre it inside COLS x ROWS.
        const offX = Math.floor((COLS - imgCols) / 2);
        const offY = Math.floor((ROWS - imgRows) / 2);
        const gamma = params.gamma;

        for (let ry = 0; ry < imgRows; ry++) {
            for (let rx = 0; rx < imgCols; rx++) {
                // Box-average the source region mapping to this cell for a clean
                // downsample (anti-aliases the fine crosshatch into mid-greys).
                const sx0 = Math.floor((rx / imgCols) * srcW);
                const sx1 = Math.max(sx0 + 1, Math.floor(((rx + 1) / imgCols) * srcW));
                const sy0 = Math.floor((ry / imgRows) * srcH);
                const sy1 = Math.max(sy0 + 1, Math.floor(((ry + 1) / imgRows) * srcH));
                let sum = 0,
                    n = 0;
                for (let sy = sy0; sy < sy1 && sy < srcH; sy++) {
                    const row = sy * srcW;
                    for (let sx = sx0; sx < sx1 && sx < srcW; sx++) {
                        sum += srcLum[row + sx];
                        n++;
                    }
                }
                let v = n ? sum / n : 0;
                // contrast / gamma shaping; gamma<1 lifts greys, >1 deepens them
                v = Math.pow(clamp(v, 0, 1), gamma);
                const gx = rx + offX;
                const gy = ry + offY;
                if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) continue;
                field[gy * COLS + gx] = v;
            }
        }
    }

    // ---- per-frame render: field → dithered glyphs on the canvas texture ----
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
        const ditherAmt = params.dither;
        const hotThresh = 1 - params.hot; // darkest fraction flickers '@'
        const last = RAMP.length - 1;

        for (let cy = 0; cy < ROWS; cy++) {
            for (let cx = 0; cx < COLS; cx++) {
                const i = cy * COLS + cx;
                let v = field[i];
                if (v <= 0.02) continue; // empty / paper-white cells stay void

                // gentle per-cell twinkle (symdome-style sine), kept subtle so
                // the engraving's tone survives.
                const tw1 = 1 + tw * 0.18 * Math.sin(t * 1.4 + cx * 0.7 + cy * 0.9);
                let vv = clamp(v * tw1, 0, 1);

                // ordered (Bayer) dither nudges the ramp index so smooth tonal
                // gradients break into an even engraved stipple instead of bands.
                const bayer = BAYER4[(cy & 3) * 4 + (cx & 3)] * ditherAmt;
                const idxF = vv * last + bayer;
                const idx = clamp(Math.round(idxF), 0, last);
                const glyph = RAMP[idx];
                if (glyph === " ") continue;

                // hot accent: only the very darkest cores, and only intermittently
                const isHot = vv >= hotThresh;
                let outGlyph = glyph;
                let alpha;
                if (isHot) {
                    const flick = 0.5 + 0.5 * Math.sin(t * 3.2 + i * 0.37);
                    if (flick > 0.45) outGlyph = "@";
                    alpha = 0.9 + 0.1 * flick;
                } else {
                    alpha = 0.4 + 0.6 * vv;
                }
                tctx.fillStyle = `rgba(${inkRGB},${alpha.toFixed(3)})`;
                tctx.fillText(outGlyph, (cx + 0.5) * cw, (cy + 0.5) * ch);
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
            // cols / gamma reshape the grid; dither/twinkle/hot are render-time.
            if (k === "cols" || k === "gamma") buildField();
        },
        resize: () => {
            stage.resize();
            buildField(); // ROWS tracks the viewport aspect, so re-letterbox
        },
        dispose: () => {
            stage.dispose();
            tex.dispose();
            planeMat.dispose();
        },
        _init: () => {
            buildField(); // allocate a blank grid so render() has buffers
            loadImage(); // async; populates + rebuilds when decoded
        },
    };
}
