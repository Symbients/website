// being-composer.js — generative lab asset in the ASCII Sapling lineage.
// "Faggot Familiars" — a procedural *being composer*. Each seed lays out a
// rough bilateral skeleton (head, spine, shoulders, hips, paired limbs, an
// optional tail/aura) and then DRESSES every bone with a motif drawn from the
// Faggots / Ned Asta vocabulary: logarithmic-spiral curls, cloud-puffs, beaded
// dotted chains, smoke-plumes, jagged lightning bolts, flowing ocean waves and
// crosshatch tonal masses. The pieces are parametric stroke-generators that
// rasterise into a COLS×ROWS glyph field, which is then rendered through the
// symdome tonal ramp " .:-=+*#%" with a hot '@' on the densest cores — exactly
// like tree-ascii.js. The result reads as a *creature assembled from ornament*:
// a spiral head, a bead spine, tendril/lightning arms, smoke/wave legs.
//
// 2D: one fullscreen plane, OrthographicCamera(-1..1). pixelCamera=false so
// Stage2D.resize() leaves the clip-space plane untouched. Monochrome, theme-
// aware (ink + void read from the palette), gently breathing.

import { THREE, Stage2D, makeRng, clamp, lerp } from "./common.js";

export const meta = {
    id: "being-composer",
    name: "Faggot Familiars",
    evokes:
        "a being composed of Faggots ornament — a spiral-or-cloud head, a beaded-chain spine, tendril & lightning arms, smoke & wave legs; each seed conjures a different familiar in living ascii.",
    params: [
        { key: "seed", label: "seed", min: 1, max: 999, step: 1, value: 7 },
        { key: "cols", label: "grid width", min: 50, max: 130, step: 2, value: 92 },
        { key: "limbs", label: "limbs", min: 2, max: 6, step: 1, value: 4 },
        { key: "mix", label: "motif mix", min: 0, max: 1, step: 0.01, value: 0.5 },
        { key: "symmetry", label: "symmetry", min: 0, max: 1, step: 0.01, value: 0.8 },
        { key: "twinkle", label: "twinkle", min: 0, max: 1, step: 0.01, value: 0.45 },
    ],
};

const RAMP = " .:-=+*#%"; // symdome's tonal ramp; '@' is the hot accent

export function create(canvas) {
    const stage = new Stage2D(canvas);
    // Normalized fullscreen-plane camera (see tree-ascii.js for the why).
    stage.pixelCamera = false;
    stage.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    stage.onResize(() => {}); // plane is normalized; nothing to do

    let palette = null;
    let params = Object.fromEntries(meta.params.map((p) => [p.key, p.value]));

    // glyph field (0..1 density) over a COLS x ROWS grid + per-cell flags.
    // chars[i] >= 0 overrides the ramp glyph (used for the @ hot eyes/tips);
    // hot[i] marks cores that flicker the hot '@'.
    let COLS = params.cols | 0;
    // Grid sized to the live canvas aspect (set in allocGrid); the upright being
    // is drawn in a centered portrait box inside it, letterboxed with blank cols.
    let ROWS = Math.round(COLS * 0.75);
    let field, chars, hot;

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
        COLS = Math.max(20, params.cols | 0);
        // Size the grid to the live CANVAS aspect so each cell is a SQUARE
        // on-screen patch (no horizontal stretch). The upright portrait being is
        // laid out in a centered box inside this grid, with blank padding cols
        // left/right — so the figure keeps true proportions in any container.
        const W = stage.width, H = stage.height;
        const screenAR = (W && H) ? W / H : (4 / 3); // w/h
        ROWS = Math.max(24, Math.round(COLS / screenAR));
        field = new Float32Array(COLS * ROWS);
        chars = new Int16Array(COLS * ROWS).fill(-1);
        hot = new Uint8Array(COLS * ROWS);
    }

    // -----------------------------------------------------------------------
    // Brush — a soft round dab into the field. Most motifs are polylines made
    // of many dabs; `rad` gives stroke weight, `val` the ink core density. The
    // dab falls off with distance so neighbouring cells get the tonal fringe
    // that makes the ramp read as engraved line rather than hard pixels.
    // -----------------------------------------------------------------------
    function dab(x, y, val, rad) {
        // brush radius governs stroke weight; we add a touch so even a rad~0.7
        // hairline paints a solid core cell rather than a faint speck. A slightly
        // fatter add gives the strokes bolder, heavier ink weight.
        const r = rad + 0.7;
        const x0 = Math.max(0, Math.floor(x - r));
        const x1 = Math.min(COLS - 1, Math.ceil(x + r));
        const y0 = Math.max(0, Math.floor(y - r));
        const y1 = Math.min(ROWS - 1, Math.ceil(y + r));
        const r2 = r * r;
        for (let cy = y0; cy <= y1; cy++) {
            for (let cx = x0; cx <= x1; cx++) {
                const dx = cx - x + 0.0;
                const dy = cy - y + 0.0;
                const d2 = dx * dx + dy * dy;
                if (d2 > r2) continue;
                // solid plateau in the inner ~70% of the brush, soft fringe
                // outside it — this gives stark Faggots ink cores with a thin
                // tonal halo (so the ramp shows " .:-=" only at stroke edges).
                const dist = Math.sqrt(d2);
                const f = dist <= r * 0.55 ? 1 : 1 - (dist - r * 0.55) / (r * 0.45 + 1e-4);
                const v = val * clamp(f, 0, 1);
                const i = cy * COLS + cx;
                if (v > field[i]) field[i] = v;
            }
        }
    }

    // A single sharp glyph override (eyes, curl-eyes, lightning tips).
    function poke(x, y, val, ch, isHot) {
        const cx = Math.round(x);
        const cy = Math.round(y);
        if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
        const i = cy * COLS + cx;
        if (val > field[i]) field[i] = val;
        if (ch != null) chars[i] = ch.charCodeAt(0);
        if (isHot) hot[i] = 1;
    }

    // Walk a parametric curve (fn:u->[x,y]) laying down dabs. `weight(u)` lets
    // a stroke taper. `density` controls how dotted/solid it is.
    function strokeCurve(fn, u0, u1, steps, val, weight, dotted) {
        let pj = 0;
        for (let s = 0; s <= steps; s++) {
            const u = lerp(u0, u1, s / steps);
            const [x, y] = fn(u);
            const w = weight ? weight(u) : 1;
            if (dotted) {
                // beaded: only stamp at intervals, as round beads
                pj++;
                if (pj % dotted === 0) {
                    dab(x, y, val, Math.max(0.6, w));
                }
            } else {
                dab(x, y, val, w);
            }
        }
    }

    // =======================================================================
    // MOTIF GENERATORS — each writes Faggots ornament into the field.
    // All take (cx, cy) anchor, an `ang` facing direction, a `scale`, a coil
    // sign / handedness, the shared rng, and a base ink `val`.
    // =======================================================================

    // spiral() — a logarithmic spiral curl (the Faggots "eye"/shell/sun head).
    // Winds inward to a tight bead; optionally rays out like the plate-03 sun.
    function spiral(cx, cy, ang, scale, sign, rng, val, rays) {
        const turns = 1.7 + rng() * 1.3;
        const totalAng = turns * Math.PI * 2 * sign;
        const k = 0.16 + rng() * 0.1; // tightness of the log spiral
        const r0 = scale * 0.06;
        const fn = (u) => {
            const a = ang + totalAng * u;
            const r = r0 + scale * 0.5 * u * Math.exp(k * u * 2.2);
            return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
        };
        const wt = (u) => lerp(2.0, 0.7, u) * (scale / 18); // fat outside, fine eye
        strokeCurve(fn, 0, 1, 120, val, (u) => Math.max(0.7, wt(u)), 0);
        // bead at the eye
        const [ex, ey] = fn(0);
        dab(ex, ey, Math.min(1, val + 0.2), Math.max(1, scale * 0.05));
        // spiral-sun rays around the rim (plate 03)
        if (rays) {
            const nr = 14 + (rng() * 10 | 0);
            for (let i = 0; i < nr; i++) {
                const a = (i / nr) * Math.PI * 2 + rng() * 0.2;
                const r = scale * (0.55 + rng() * 0.18);
                const len = scale * (0.16 + rng() * 0.14);
                const rx = cx + Math.cos(a) * r;
                const ry = cy + Math.sin(a) * r;
                strokeCurve(
                    (u) => [rx + Math.cos(a) * len * u, ry + Math.sin(a) * len * u],
                    0, 1, 6, val * 0.85,
                    (u) => lerp(1.2, 0.5, u) * (scale / 24), 0
                );
            }
        }
        return [ex, ey]; // the curl-eye, useful as a face anchor
    }

    // cloud() — a stack of art-nouveau cumulus lobes (plate 02 / 03 clouds).
    // A row of overlapping filled bumps; good for a soft round head or torso.
    function cloud(cx, cy, scale, rng, val) {
        const lobes = 3 + (rng() * 3 | 0);
        const span = scale * 1.1;
        for (let i = 0; i < lobes; i++) {
            const t = lobes === 1 ? 0.5 : i / (lobes - 1);
            const lx = cx + (t - 0.5) * span;
            const ly = cy - Math.sin(t * Math.PI) * scale * 0.45 + (rng() - 0.5) * scale * 0.12;
            const lr = scale * (0.32 + rng() * 0.22);
            // filled bump: concentric dabs to a soft round mass
            for (let rr = lr; rr > 0; rr -= 0.8) {
                dab(lx, ly, val * lerp(1.0, 0.7, 1 - rr / lr), rr);
            }
        }
        // soft flat underside line
        strokeCurve(
            (u) => [cx + (u - 0.5) * span, cy + scale * 0.18],
            0, 1, 30, val * 0.7, () => scale / 22, 0
        );
    }

    // tendril() — a curling pen-line that sweeps out and coils into a curl-eye.
    // The Faggots limb-of-choice: arms and antennae. Recursive bud at the tip.
    function tendril(cx, cy, ang, scale, sign, rng, val, depth) {
        const sweep = (0.5 + rng() * 0.7) * sign; // how much it arcs over its run
        const len = scale;
        const fn = (u) => {
            const a = ang + sweep * u * u; // accelerating curl toward the tip
            const r = len * u;
            return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
        };
        const wt = (u) => Math.max(0.6, lerp(1.8, 0.7, u) * (scale / 26));
        strokeCurve(fn, 0, 1, 60, val, wt, 0);
        const [tx, ty] = fn(1);
        const tang = ang + sweep;
        // tip coils into a little spiral curl (the Asta signature)
        spiral(tx, ty, tang + Math.PI * 0.5 * sign, scale * 0.3, -sign, rng, val, false);
        // sometimes a child tendril buds partway (recursive ornament)
        if (depth > 0 && rng() > 0.45) {
            const [bx, by] = fn(0.45 + rng() * 0.2);
            tendril(bx, by, ang + sweep * 0.4 - sign * (0.6 + rng() * 0.5),
                scale * 0.5, sign, rng, val, depth - 1);
        }
        return [tx, ty];
    }

    // beadChain() — a dotted string of beads following a gentle curve. Spine,
    // necklaces, the dream-bubble trails on plate 03.
    function beadChain(x0, y0, x1, y1, scale, rng, val) {
        const mx = (x0 + x1) / 2 + (rng() - 0.5) * scale * 0.6;
        const my = (y0 + y1) / 2 + (rng() - 0.5) * scale * 0.6;
        const fn = (u) => {
            // quadratic bezier through the wandered midpoint
            const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
            return [a * x0 + b * mx + c * x1, a * y0 + b * my + c * y1];
        };
        const n = 7 + (rng() * 6 | 0);
        for (let i = 0; i <= n; i++) {
            const u = i / n;
            const [x, y] = fn(u);
            const br = scale * (0.10 + 0.05 * Math.sin(u * Math.PI)); // swell mid-spine
            dab(x, y, val, Math.max(0.7, br));
        }
        return fn;
    }

    // plume() — a rising/flowing smoke column with S-curve wander (plate 02).
    // Used for flowing bodies and trailing legs. Sheds little tear-droplets.
    function plume(cx, cy, ang, scale, rng, val) {
        const wob = 0.6 + rng() * 0.8;
        const phase = rng() * Math.PI * 2;
        const len = scale;
        const fn = (u) => {
            const along = u * len;
            const lateral = Math.sin(u * Math.PI * wob + phase) * scale * 0.22;
            const a = ang;
            const px = cx + Math.cos(a) * along + Math.cos(a + Math.PI / 2) * lateral;
            const py = cy + Math.sin(a) * along + Math.sin(a + Math.PI / 2) * lateral;
            return [px, py];
        };
        // a smoke column is a body of ink, not a hairline — fat, tapering
        const wt = (u) => Math.max(0.8, lerp(2.6, 0.9, u) * (scale / 24));
        strokeCurve(fn, 0, 1, 70, val, wt, 0);
        // shed a couple of teardrop dots near the tail
        const drops = 2 + (rng() * 3 | 0);
        for (let d = 0; d < drops; d++) {
            const u = 0.75 + rng() * 0.2;
            const [x, y] = fn(u);
            const off = (rng() - 0.5) * scale * 0.3;
            dab(x + off, y + off * 0.4, val * 0.9, scale * 0.06);
        }
        return fn;
    }

    // bolt() — a jagged art-nouveau lightning bolt (plate 03). A polyline of
    // sharp zig-zag segments, tapering to a point. Sparks a hot tip.
    function bolt(cx, cy, ang, scale, rng, val) {
        const segs = 4 + (rng() * 3 | 0);
        let x = cx, y = cy, a = ang;
        let px = x, py = y;
        const tipX = [], tipY = [];
        for (let s = 0; s < segs; s++) {
            const segLen = (scale / segs) * (0.7 + rng() * 0.7);
            a += (rng() - 0.5) * 1.4; // sharp kink each segment
            const nx = px + Math.cos(a) * segLen;
            const ny = py + Math.sin(a) * segLen;
            const wt = lerp(2.2, 0.6, s / segs) * (scale / 30);
            strokeCurve(
                (u) => [lerp(px, nx, u), lerp(py, ny, u)],
                0, 1, Math.max(4, segLen | 0), val, () => Math.max(0.6, wt), 0
            );
            px = nx; py = ny;
            tipX.push(nx); tipY.push(ny);
        }
        // hot spark at the striking tip
        poke(px, py, 1, "@", true);
        return [px, py];
    }

    // wave() — a flowing ocean-wave curl breaking into froth (plate 03 sea).
    // Horizontal-ish S that thickens and throws spray-beads. A flowing skirt.
    function wave(cx, cy, scale, sign, rng, val) {
        const len = scale * 1.4;
        const fn = (u) => {
            const x = cx + (u - 0.5) * len;
            const y = cy + Math.sin(u * Math.PI * 1.5 + rng() * 0) * scale * 0.28 * sign
                - u * scale * 0.1;
            return [x, y];
        };
        const wt = (u) => Math.max(0.8, (1.4 + 1.2 * Math.sin(u * Math.PI)) * (scale / 26));
        strokeCurve(fn, 0, 1, 60, val, wt, 0);
        // the breaking curl at one end
        const [ex, ey] = fn(sign > 0 ? 1 : 0);
        spiral(ex, ey, Math.PI * (sign > 0 ? 1.2 : -0.2), scale * 0.35, sign, rng, val, false);
        // spray beads flung off the crest
        const sprays = 4 + (rng() * 4 | 0);
        for (let i = 0; i < sprays; i++) {
            const u = rng();
            const [x, y] = fn(u);
            dab(x + (rng() - 0.5) * scale * 0.4, y - rng() * scale * 0.3, val * 0.8,
                scale * 0.05);
        }
    }

    // crosshatch() — a tonal mass of stippled ink (plate 10 engraving). A blob
    // of dithered density; used to give a limb or torso solid woodcut weight.
    function crosshatch(cx, cy, rx, ry, rng, val) {
        const x0 = Math.max(0, Math.floor(cx - rx));
        const x1 = Math.min(COLS - 1, Math.ceil(cx + rx));
        const y0 = Math.max(0, Math.floor(cy - ry));
        const y1 = Math.min(ROWS - 1, Math.ceil(cy + ry));
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const dx = (x - cx) / rx;
                const dy = (y - cy) / ry;
                const d = dx * dx + dy * dy;
                if (d > 1) continue;
                // tonal falloff with a noisy crosshatch stipple
                const tone = (1 - d) * val;
                const hatch = 0.6 + 0.4 * Math.sin((x + y) * 1.7 + rng() * 0.0);
                const v = tone * lerp(0.7, 1, rng()) * hatch;
                const i = y * COLS + x;
                if (v > field[i]) field[i] = v;
            }
        }
    }

    // =======================================================================
    // THE BEING COMPOSER — lays out a bilateral skeleton and dresses each bone
    // with a motif. Symmetry blends left/right limb mirroring. Mix steers the
    // motif vocabulary toward curls/clouds (low) vs lightning/waves (high).
    // =======================================================================
    function buildBeing() {
        allocGrid();
        const rng = makeRng((params.seed | 0) * 2654435761 >>> 0 || 1);
        const sym = params.symmetry;
        const mix = params.mix;
        const nLimbs = params.limbs | 0;

        const CX = COLS / 2; // central axis (being centered in the frame)
        // The being is an upright PORTRAIT figure of aspect ≈ 1 : 1.28. Base the
        // size unit on a portrait box that fills the grid HEIGHT, so the figure
        // keeps true proportions and is letterboxed with blank side columns
        // rather than stretched to the (now landscape) grid width.
        const boxW = ROWS / 1.28; // portrait box width (true being aspect)
        const unit = boxW * 0.5; // overall size unit (was COLS * 0.5)
        const val = 0.96; // bolder base ink so the being reads strongly

        // --- skeleton key points (figural proportions, y grows downward) -----
        const headY = ROWS * (0.16 + rng() * 0.04);
        const shoulderY = ROWS * (0.34 + rng() * 0.04);
        const hipY = ROWS * (0.6 + rng() * 0.05);
        const footY = ROWS * (0.92);
        const headR = unit * (0.26 + rng() * 0.1);
        const shoulderW = unit * (0.34 + rng() * 0.12);
        const hipW = unit * (0.2 + rng() * 0.1);

        // a small lateral lean so beings aren't rigidly vertical
        const lean = (rng() - 0.5) * unit * 0.18;
        const headX = CX + lean;

        // ---- HEAD ----------------------------------------------------------
        // pick a head motif: spiral-sun, cloud-puff, or a coiled curl.
        const headRoll = rng();
        let eye = null;
        if (headRoll < 0.4 + mix * 0.2) {
            // spiral / spiral-sun head — the Faggots shell-eye
            eye = spiral(headX, headY, rng() * Math.PI * 2, headR * 1.5,
                rng() > 0.5 ? 1 : -1, rng, val, mix > 0.4 || rng() > 0.5);
        } else if (headRoll < 0.75) {
            cloud(headX, headY, headR, rng, val);
            eye = [headX, headY];
        } else {
            // crosshatch woodcut head with a curl crown
            crosshatch(headX, headY, headR * 0.8, headR * 0.85, rng, val * 0.95);
            tendril(headX - headR * 0.3, headY - headR * 0.5, -Math.PI * 0.55,
                headR * 1.1, -1, rng, val, 1);
            eye = [headX, headY];
        }
        // hot eyes — two @ pokes give the being a face/gaze
        if (eye) {
            const ex = eye[0], ey = eye[1];
            poke(ex - headR * 0.22, ey + headR * 0.05, 1, "@", true);
            poke(ex + headR * 0.22, ey + headR * 0.05, 1, "@", true);
        }

        // ---- NECK / SPINE (beaded chain or smoke column) -------------------
        const spineTopX = headX;
        const spineTopY = headY + headR * 0.7;
        const hipX = CX + lean * 0.5;
        if (mix < 0.5 || rng() > 0.5) {
            beadChain(spineTopX, spineTopY, hipX, hipY, unit * 0.16, rng, val);
        } else {
            plume(spineTopX, spineTopY,
                Math.atan2(hipY - spineTopY, hipX - spineTopX),
                Math.hypot(hipX - spineTopX, hipY - spineTopY), rng, val);
        }

        // ---- TORSO mass — a tapering body column so head+limbs read as one
        // figure. The Faggots being is a solid column of ink (a flowing trunk),
        // not a stipple cloud, so we paint a clean tapering bar from the
        // shoulders to the hips, leaning with the body.
        for (let yy = shoulderY; yy < hipY; yy += 1) {
            const tt = (yy - shoulderY) / (hipY - shoulderY);
            const wx = lerp(headX, hipX, tt);
            const halfW = lerp(shoulderW * 0.34, hipW * 0.85, tt);
            dab(wx, yy, val * 0.95, halfW);
        }

        // ---- ARMS (paired limbs off the shoulders) -------------------------
        // Limb motif vocabulary depends on mix: curls/tendrils dominate low
        // mix, lightning bolts dominate high mix, waves in the middle.
        const armCount = Math.min(2, Math.ceil(nLimbs / 2));
        for (let side = 0; side < 2 && side < Math.max(2, armCount + 1); side++) {
            const s = side === 0 ? -1 : 1; // -1 left, +1 right
            if (side >= armCount && armCount < 2) break;
            const sx = headX + s * shoulderW;
            const sy = shoulderY + (s > 0 ? 0 : 0);
            // downward-outward facing
            const baseAng = (s > 0 ? 0.15 : Math.PI - 0.15) + (rng() - 0.5) * 0.5 * (1 - sym);
            const limbScale = unit * (0.5 + rng() * 0.25);
            const lr = mix < 0.35 ? 0 : mix < 0.65 ? 1 : 2;
            if (lr === 2) {
                bolt(sx, sy, baseAng + 0.3 * s, limbScale, rng, val);
            } else if (lr === 1) {
                wave(sx, sy, limbScale * 0.7, s, rng, val);
            } else {
                tendril(sx, sy, baseAng, limbScale, s, rng, val, 1);
            }
        }

        // ---- LEGS / flowing lower body (smoke or wave, fanning down) --------
        const legCount = Math.max(0, nLimbs - armCount * 2 + 2); // remaining appendages
        const useWaveSkirt = mix >= 0.4 && rng() > 0.4;
        if (useWaveSkirt) {
            // a flowing wave/water skirt instead of discrete legs (plate 03)
            wave(hipX, footY - unit * 0.1, unit * 0.7, 1, rng, val);
            wave(hipX, footY, unit * 0.6, -1, rng, val);
        }
        const nLegs = Math.max(2, Math.min(4, Math.round(2 + (nLimbs - 2) * 0.5)));
        for (let i = 0; i < nLegs; i++) {
            const t = nLegs === 1 ? 0.5 : i / (nLegs - 1);
            const s = t < 0.5 ? -1 : 1;
            const lx = hipX + (t - 0.5) * hipW * 2;
            const ly = hipY;
            const ang = Math.PI / 2 + (t - 0.5) * 0.9 * (1 - sym * 0.5);
            const legScale = unit * (0.5 + rng() * 0.2);
            // legs flow as smoke-plumes (the trailing Faggots body)
            if (mix < 0.55) {
                plume(lx, ly, ang, legScale, rng, val);
            } else {
                tendril(lx, ly, ang, legScale, s, rng, val, 0);
            }
        }

        // ---- AURA / antennae — beaded dream-bubble trail off the head ------
        if (rng() > 0.35) {
            const s = rng() > 0.5 ? 1 : -1;
            const ax = headX + s * headR * 1.2;
            const ay = headY - headR * 0.6;
            beadChain(headX + s * headR * 0.6, headY - headR * 0.3,
                ax + s * unit * 0.3, ay - unit * 0.25, unit * 0.1, rng, val * 0.8);
        }

        // mark densest cores hot so the being shimmers along its heavy ink
        for (let i = 0; i < field.length; i++) {
            if (field[i] > 0.86 && chars[i] < 0) hot[i] = 1;
        }
    }

    // -----------------------------------------------------------------------
    // RENDER — field → glyphs on the CanvasTexture (mirrors tree-ascii.js).
    // Adds a slow vertical "breathing" so the whole being gently inhales.
    // -----------------------------------------------------------------------
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
        const last = RAMP.length - 1;
        // breathing: a slow whole-body density swell
        const breath = 0.94 + 0.06 * Math.sin(t * 0.9);

        for (let cy = 0; cy < ROWS; cy++) {
            for (let cx = 0; cx < COLS; cx++) {
                const i = cy * COLS + cx;
                let v = field[i];
                if (v <= 0.02) continue;
                // Tonal shaping: lift mid densities toward the top of the ramp
                // so stroke cores read as stark Faggots ink (#%) and only the
                // brush fringe stays in the light " .:-=" tones.
                let vv = Math.pow(clamp(v, 0, 1), 0.62);
                // per-cell twinkle (symdome-style sine) — biased to ADD light so
                // solid ink never blinks to grey; plus the global breath swell.
                const tw1 = 1 + tw * 0.18 * Math.sin(t * 1.5 + cx * 0.7 + cy * 0.9);
                vv = Math.min(1, vv * tw1 * breath);

                let glyph, alpha;
                const forced = chars[i];
                const isHot =
                    hot[i] && Math.sin(t * 3.0 + i * 0.13) > 0.1; // shimmer on/off
                if (forced >= 0 && isHot) {
                    glyph = String.fromCharCode(forced); // the @ eyes / bolt tips
                    alpha = 0.92 + 0.08 * Math.sin(t * 5 + i);
                } else if (isHot && vv > 0.7) {
                    glyph = "@";
                    alpha = 0.9 + 0.1 * Math.sin(t * 4 + i);
                } else {
                    const idx = Math.max(0, Math.min(last, Math.round(vv * last)));
                    glyph = RAMP[idx];
                    if (glyph === " ") continue;
                    // high opacity floor so even the lighter ramp tones read bold
                    alpha = 0.8 + 0.2 * vv;
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

    // structural params rebuild the field; render-only params (twinkle) are free
    const STRUCTURAL = new Set(["seed", "cols", "limbs", "mix", "symmetry"]);

    return {
        meta,
        start: () => stage.start(),
        stop: () => stage.stop(),
        setTheme: applyTheme,
        setParam: (k, v) => {
            params[k] = v;
            if (STRUCTURAL.has(k)) buildBeing();
        },
        resize: () => {
            stage.resize();
            buildBeing(); // re-derive ROWS from the new canvas aspect, re-lay-out
        },
        dispose: () => {
            stage.dispose();
            tex.dispose();
            planeMat.dispose();
        },
        _init: () => buildBeing(),
    };
}
