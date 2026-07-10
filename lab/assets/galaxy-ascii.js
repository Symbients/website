// galaxy-ascii.js — ASSET (generative — no source image)
// "Galaxy" — a slowly turning ascii spiral galaxy: a hot dense core, two or
// three logarithmic arms of stars sweeping outward, a faint dust haze, and a
// gentle twinkle. For "Symbient as Hyperstition" — a cosmic feedback loop,
// fictions making themselves real, the spiral pulling matter inward as the
// stories pull the future toward them.
//
// Unlike the image assets there is no PNG: the field is built PROCEDURALLY.
// A deterministic star list is generated once via makeRng (radius denser toward
// the core, an arm index, and a log-spiral angle θ = armOffset + k·ln(r) +
// jitter), then rasterized per frame into a COLS×ROWS value buffer, ADDITIVELY,
// so overlapping stars brighten. Each frame the whole field rotates by spin·t.
// The accumulated brightness is mapped through the same tonal ramp as the
// image assets, and the brightest core cells burn a hot '@'. A per-star sine
// keeps the field twinkling.
//
// 2D: one fullscreen plane, OrthographicCamera(-1..1), same Stage2D +
// CanvasTexture glyph-field machinery as the image assets — only the field is
// drawn from stars instead of a decoded photo. Theme-aware: ink-on-void.

import { THREE, makeRng, Stage2D, clamp } from "./common.js";

export const meta = {
    id: "galaxy-ascii",
    name: "Galaxy",
    evokes:
        "a slowly turning ascii spiral galaxy — a hot dense core, logarithmic arms of stars sweeping outward through a faint dust haze, twinkling; Symbient as hyperstition, a cosmic feedback loop pulling the future inward.",
    params: [
        { key: "cols", label: "grid width", min: 60, max: 180, step: 2, value: 120 },
        { key: "arms", label: "arms", min: 2, max: 3, step: 1, value: 2 },
        { key: "spin", label: "spin", min: 0, max: 0.3, step: 0.005, value: 0.05 },
        { key: "density", label: "density", min: 0, max: 1, step: 0.01, value: 0.75 },
        { key: "twinkle", label: "twinkle", min: 0, max: 1, step: 0.01, value: 0.45 },
    ],
};

const RAMP = " .:-=+*#%"; // symdome's tonal ramp; '@' is the hot accent
// The glyph texture FILLS the whole 4:3 stage. To keep the galaxy ROUND we size
// the grid to the live CANVAS aspect (so each cell is a SQUARE on-screen patch,
// CELL_AR = 1) and draw the disc as a true circle fit to the SHORTER (vertical)
// dimension — blank padding cols left/right — instead of stretching a square
// grid to fill 4:3 (which turned the disc into an ellipse).
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

    // Square grid: ROWS = COLS.
    let COLS = params.cols | 0;
    let ROWS = COLS;

    // value buffer (accumulated star brightness 0..N) reused each frame
    let field = new Float32Array(COLS * ROWS);

    // The star list — built once (or on a structural param change). Each star is
    // {r, a, b, ph}: base radius 0..1, base angle (radians), brightness, twinkle
    // phase. Position is recomputed per frame as (a + spin·t) so the whole disc
    // rotates rigidly without rebuilding.
    let stars = [];

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

    function allocGrid() {
        COLS = params.cols | 0;
        // Size the grid to the live CANVAS aspect so each cell is a SQUARE
        // on-screen patch; the round galaxy is then drawn as a true circle fit
        // to the shorter dimension, centered, with blank padding cols L/R.
        const W = stage.width, H = stage.height;
        const screenAR = (W && H) ? W / H : (4 / 3); // w/h
        ROWS = Math.max(20, Math.round((CELL_AR * COLS) / screenAR));
        field = new Float32Array(COLS * ROWS);
    }

    // Build the deterministic star list. Density scales the count; arms sets the
    // number of logarithmic spiral arms. Seeded so a given param set is stable.
    function buildStars() {
        const rng = makeRng(7); // fixed seed: the galaxy is one specific galaxy
        const arms = clamp(params.arms | 0, 1, 4);
        // 900..2400 stars across the density range, plus a bulge cluster.
        const N = Math.round(900 + params.density * 1500);
        const k = 2.6; // log-spiral winding tightness
        stars = [];
        for (let s = 0; s < N; s++) {
            // radius denser toward the centre: square-ish falloff
            const u = rng();
            const r = Math.pow(u, 1.7); // 0..1, crowded near 0
            const arm = (rng() * arms) | 0;
            const armOffset = (arm / arms) * Math.PI * 2;
            // log-spiral angle; jitter loosens the arm so it reads as a swarm,
            // not a hairline. Jitter shrinks with radius so the core stays tight.
            const jitter = (rng() - 0.5) * (0.5 + 0.8 * (1 - r));
            const a = armOffset + k * Math.log(r + 0.08) + jitter;
            // brightness falls off with radius; a little per-star variation
            const b = (0.35 + 0.65 * (1 - r)) * (0.6 + 0.4 * rng());
            const ph = rng() * Math.PI * 2; // twinkle phase
            stars.push({ r, a, b, ph });
        }
        // A bright bulge: a dense scatter of hot stars near the core.
        const bulge = Math.round(120 + params.density * 180);
        for (let s = 0; s < bulge; s++) {
            const r = Math.pow(rng(), 3) * 0.14; // tight to the centre
            const a = rng() * Math.PI * 2;
            const b = 0.8 + 0.6 * rng();
            const ph = rng() * Math.PI * 2;
            stars.push({ r, a, b, ph });
        }
    }

    // Rasterize the (rotated) star list into the COLS×ROWS value buffer, plus a
    // faint radial dust haze. Additive: overlapping stars brighten the same cell.
    function rasterize(t) {
        field.fill(0);
        const spin = params.spin;
        const tw = params.twinkle;
        const cx = (COLS - 1) / 2;
        const cy = (ROWS - 1) / 2;
        // EQUAL scales (in cells) so the disc reads as a true circle on the
        // square on-screen cells. Fit normalized radius 1.0 to ~46% of the
        // SHORTER (vertical) dimension so the round galaxy sits inside the frame
        // with blank padding cols left/right rather than stretching to 4:3.
        const disc = Math.min(COLS, ROWS) * 0.46;
        const scaleX = disc;
        const scaleY = disc;

        // faint dust haze — a smooth radial glow, brightest at the core.
        for (let gy = 0; gy < ROWS; gy++) {
            const ny = (gy - cy) / scaleY;
            const row = gy * COLS;
            for (let gx = 0; gx < COLS; gx++) {
                const nx = (gx - cx) / scaleX;
                const rr = nx * nx + ny * ny;
                // gentle haze that fades out past the disc edge
                const haze = 0.2 * Math.exp(-rr * 2.0);
                field[row + gx] += haze;
            }
        }

        // stars
        for (let s = 0; s < stars.length; s++) {
            const st = stars[s];
            const ang = st.a + spin * t; // rigid rotation of the whole disc
            const px = Math.cos(ang) * st.r;
            const py = Math.sin(ang) * st.r;
            const gx = Math.round(cx + px * scaleX);
            const gy = Math.round(cy + py * scaleY);
            if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) continue;
            // per-star twinkle — a gentle shimmer that never dims far, so the
            // stars hold bright instead of flickering toward grey.
            const tw1 = 1 - tw * 0.22 * (0.5 + 0.5 * Math.sin(t * 2.2 + st.ph));
            field[gy * COLS + gx] += st.b * tw1;
        }

        // a hot condensing heart at the very centre (the core burns brightest)
        const core = (Math.round(cy) * COLS + Math.round(cx));
        field[core] += 1.4;
    }

    // --- render ------------------------------------------------------------
    function render(t) {
        if (!palette) return;
        if (!stars.length) return; // nothing built yet
        rasterize(t);

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = stage.width;
        const H = stage.height;
        // Supersample the glyph texture so each cell keeps ~9 texels even when
        // the canvas is shown large (e.g. the narrative reader) — sizing it to
        // bare canvas px gives only ~5 texels/glyph there, so characters blur
        // into coarse dots. Floor at COLS*9; the GPU downsamples (LinearFilter).
        const ss = Math.max(1, (COLS * 9) / Math.max(1, W * dpr));
        const TW = Math.max(2, Math.round(W * dpr * ss));
        const TH = Math.max(2, Math.round(H * dpr * ss));
        if (tcanvas.width !== TW || tcanvas.height !== TH) {
            tcanvas.width = TW;
            tcanvas.height = TH;
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

        for (let cy = 0; cy < ROWS; cy++) {
            for (let cx = 0; cx < COLS; cx++) {
                const i = cy * COLS + cx;
                // accumulated brightness -> 0..1, soft-clamped so dense overlaps
                // still ride the ramp instead of all pinning to max.
                let v = field[i];
                if (v <= 0.04) continue; // below the floor: clean void
                v = clamp(v, 0, 1);

                // hot '@' on the brightest cores (the burning galactic heart)
                let glyph;
                let alpha;
                if (v > 0.85) {
                    glyph = "@";
                    alpha = 0.92 + 0.08 * Math.sin(t * 4 + i);
                } else {
                    const idx = Math.max(
                        0,
                        Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1)))
                    );
                    glyph = RAMP[idx];
                    if (glyph === " ") continue;
                    // high opacity floor so even faint stars/haze read strongly
                    alpha = 0.72 + 0.28 * v;
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
            // structural params reshape the grid / star list; spin & twinkle
            // take effect next frame for free.
            if (k === "cols") {
                allocGrid();
                buildStars();
            } else if (k === "arms" || k === "density") {
                buildStars();
            }
        },
        resize: () => {
            stage.resize();
            allocGrid(); // re-derive ROWS from the new canvas aspect (stars reused)
        },
        dispose: () => {
            stage.dispose();
            tex.dispose();
            planeMat.dispose();
        },
        _init: () => {
            allocGrid(); // value buffer ready before the first frame
            buildStars(); // deterministic star list, built once
        },
    };
}
