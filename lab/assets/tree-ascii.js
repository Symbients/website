// tree-ascii.js — ASSET 2
// "ASCII Sapling" — a recursive branching tree rasterised into a monospace
// glyph grid, drawn to a CanvasTexture on a single fullscreen plane.
// This is the most literal echo of symdome's ascii trees: branches are walked
// with Bresenham and stamped as / \ | _ glyphs; nodes get * ; the growing tip
// gets the hot @ glyph. A tonal twinkle animates the field over time.
//
// 2D: one fullscreen plane, OrthographicCamera(-1..1). The "shader" here is a
// procedural canvas, kept deliberately as a glyph field (symdome's ascii.js
// builds a 68x34 raster through a tonal ramp the same way).

import { THREE, Stage2D, makeRng } from "./common.js";

export const meta = {
    id: "tree-ascii",
    name: "ASCII Sapling",
    evokes:
        "the symdome ascii trees made literal — recursive branches stamped as / \\ | _ * with a hot @ at each growing tip.",
    params: [
        { key: "depth", label: "branch depth", min: 3, max: 9, step: 1, value: 7 },
        { key: "cols", label: "grid width", min: 40, max: 120, step: 2, value: 80 },
        { key: "angle", label: "split angle", min: 12, max: 55, step: 1, value: 30 },
        { key: "shrink", label: "child shrink", min: 0.6, max: 0.85, step: 0.01, value: 0.72 },
        { key: "twinkle", label: "twinkle", min: 0, max: 1, step: 0.01, value: 0.5 },
        { key: "seed", label: "seed", min: 1, max: 999, step: 1, value: 42 },
    ],
};

const RAMP = " .:-=+*#%"; // symdome's tonal ramp; '@' is the hot accent

export function create(canvas) {
    const stage = new Stage2D(canvas);
    // Normalized fullscreen-plane camera. pixelCamera=false stops Stage2D's
    // resize() from rewriting these bounds into pixel space (which would push
    // the -1..1 plane off-screen).
    stage.pixelCamera = false;
    stage.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    stage.onResize(() => {}); // plane is normalized; nothing to do

    let palette = null;
    let params = Object.fromEntries(meta.params.map((p) => [p.key, p.value]));

    // offscreen raster of glyph cells (value 0..1) + char overrides
    let COLS = params.cols | 0;
    let ROWS = Math.round(COLS * 0.62); // pleasing aspect for a tree
    let field, chars, hot;

    // glyph texture canvas
    const tcanvas = document.createElement("canvas");
    const tctx = tcanvas.getContext("2d");
    const tex = new THREE.CanvasTexture(tcanvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;

    // DoubleSide: the ortho camera looks down -Z and the plane's front faces
    // +Z, so without this the textured face gets back-face culled.
    const planeMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), planeMat);
    stage.scene.add(plane);

    function allocGrid() {
        COLS = params.cols | 0;
        ROWS = Math.max(20, Math.round(COLS * 0.62));
        field = new Float32Array(COLS * ROWS);
        chars = new Int16Array(COLS * ROWS).fill(-1); // -1 = use ramp
        hot = new Uint8Array(COLS * ROWS);
    }

    function stamp(cx, cy, val, ch, isHot) {
        if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
        const i = cy * COLS + cx;
        if (val > field[i]) field[i] = val;
        if (ch != null) chars[i] = ch;
        if (isHot) hot[i] = 1;
    }

    // glyph chosen by line direction, like an ascii tree
    function dirGlyph(dx, dy) {
        const a = Math.atan2(dy, dx); // screen coords, y down
        const deg = (a * 180) / Math.PI;
        if (Math.abs(dy) < 0.35) return "_".charCodeAt(0);
        if (Math.abs(dx) < 0.35) return "|".charCodeAt(0);
        return (deg < 0 ? "/" : "\\").charCodeAt(0); // up-left=/ , up-right=\
        // (note: y is down so a branch going up-right has dy<0)
    }

    function buildTree() {
        allocGrid();
        const rng = makeRng(params.seed | 0);
        const maxDepth = params.depth | 0;
        const ang = (params.angle * Math.PI) / 180;
        const baseLen = ROWS * 0.34;

        function line(x0, y0, x1, y1, depth) {
            const dx = x1 - x0;
            const dy = y1 - y0;
            const steps = Math.max(1, Math.round(Math.hypot(dx, dy)));
            const g = dirGlyph(dx, dy);
            const v = 0.45 + 0.5 * (1 - depth / (maxDepth + 1));
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                stamp(Math.round(x0 + dx * t), Math.round(y0 + dy * t), v, g, false);
            }
        }

        function grow(x, y, dir, len, depth) {
            if (depth > maxDepth || len < 1) {
                // growing tip → hot @ node
                stamp(Math.round(x), Math.round(y), 1, "@".charCodeAt(0), true);
                return;
            }
            const nx = x + Math.cos(dir) * len;
            const ny = y + Math.sin(dir) * len;
            line(x, y, nx, ny, depth);
            // node marker
            stamp(Math.round(nx), Math.round(ny), 0.9, "*".charCodeAt(0), false);
            const jL = (rng() - 0.5) * ang * 0.4;
            const jR = (rng() - 0.5) * ang * 0.4;
            const cl = len * params.shrink;
            grow(nx, ny, dir - ang + jL, cl, depth + 1);
            grow(nx, ny, dir + ang + jR, cl, depth + 1);
            if (depth < maxDepth - 2 && rng() > 0.7) {
                grow(nx, ny, dir + (rng() - 0.5) * ang, cl * 0.8, depth + 2);
            }
        }
        grow(COLS / 2, ROWS - 1, -Math.PI / 2, baseLen, 0);
        // soil line of '_' along the base for grounding
        for (let cx = 0; cx < COLS; cx++) {
            if (rng() > 0.25) stamp(cx, ROWS - 1, 0.22, "_".charCodeAt(0), false);
        }
    }

    function render(t) {
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
                const tw1 = 0.85 + tw * 0.4 * Math.sin(t * 1.6 + cx * 0.7 + cy * 0.9);
                v = Math.min(1, v * tw1);
                let glyph;
                if (chars[i] >= 0) glyph = String.fromCharCode(chars[i]);
                else {
                    const idx = Math.max(
                        0,
                        Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1)))
                    );
                    glyph = RAMP[idx];
                }
                const alpha = hot[i] ? 0.95 + 0.05 * Math.sin(t * 4 + i) : 0.55 + 0.45 * v;
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
            buildTree();
        },
        resize: () => stage.resize(),
        dispose: () => {
            stage.dispose();
            tex.dispose();
            planeMat.dispose();
        },
        _init: () => buildTree(),
    };
}
