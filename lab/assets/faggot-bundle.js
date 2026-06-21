// faggot-bundle.js — ASSET 3
// "Bound Sheaf" — a faggot in its older, literal sense: a bundle of sticks /
// kindling bound together. N slightly-irregular sticks are cinched at one or
// more binding points; between bindings they bow apart, at bindings they pull
// tight. Resonates with the Symbients "kindled, not coded" motif.
//
// 2D: pixel-space OrthographicCamera (Stage2D). Hairline LineSegments only.

import { THREE, Stage2D, makeRng, lineMaterial, lerp, clamp } from "./common.js";

export const meta = {
    id: "faggot-bundle",
    name: "Bound Sheaf",
    evokes:
        "a faggot in the old sense — a bundle of sticks bound together; kindling cinched at the binds, bowing free between them.",
    params: [
        { key: "sticks", label: "stick count", min: 5, max: 60, step: 1, value: 26 },
        { key: "binds", label: "binds", min: 1, max: 5, step: 1, value: 2 },
        { key: "tight", label: "bind tightness", min: 0.05, max: 1, step: 0.01, value: 0.7 },
        { key: "bow", label: "bow / splay", min: 0, max: 1, step: 0.01, value: 0.5 },
        { key: "crook", label: "crookedness", min: 0, max: 1, step: 0.01, value: 0.4 },
        { key: "seed", label: "seed", min: 1, max: 999, step: 1, value: 7 },
    ],
};

export function create(canvas) {
    const stage = new Stage2D(canvas);
    let palette = null;

    let geom = null;
    const mat = lineMaterial(0x000000, 0.7);
    let lines = null;
    let bindGeom = null;
    const bindMat = lineMaterial(0x000000, 0.95);
    let bindLines = null;

    let params = Object.fromEntries(meta.params.map((p) => [p.key, p.value]));

    // Per-stick precomputed lateral profile so animation just re-projects it.
    let sticks = []; // {offset, crookAmp, crookPhase, lenScale, wobblePhase}
    const SEGMENTS = 40; // samples along each stick

    function buildSticks() {
        const rng = makeRng(params.seed | 0);
        const n = params.sticks | 0;
        sticks = [];
        for (let i = 0; i < n; i++) {
            sticks.push({
                offset: (i / (n - 1) - 0.5), // -0.5..0.5 across the bundle
                crookAmp: (rng() * 2 - 1),
                crookPhase: rng() * Math.PI * 2,
                crookFreq: 1 + rng() * 2.2,
                lenScale: lerp(0.86, 1.0, rng()),
                wobblePhase: rng() * Math.PI * 2,
                end: rng(), // ragged stick ends
            });
        }
        // allocate geometry: n sticks * (SEGMENTS) line segments
        const vertsPerStick = SEGMENTS * 2;
        const total = n * vertsPerStick;
        const pos = new Float32Array(total * 3);
        if (geom) geom.dispose();
        geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        if (lines) stage.scene.remove(lines);
        lines = new THREE.LineSegments(geom, mat);
        stage.scene.add(lines);

        // binding cinches: short cross-strokes wrapped around the waist
        const bn = params.binds | 0;
        const bpos = new Float32Array(bn * 8 * 6); // a few strokes each
        if (bindGeom) bindGeom.dispose();
        bindGeom = new THREE.BufferGeometry();
        bindGeom.setAttribute("position", new THREE.BufferAttribute(bpos, 3));
        if (bindLines) stage.scene.remove(bindLines);
        bindLines = new THREE.LineSegments(bindGeom, bindMat);
        stage.scene.add(bindLines);
    }

    // bind positions along the bundle's length (0=top .. 1=bottom)
    function bindAt(k, bn) {
        // distribute binds in the inner 0.2..0.8 band
        if (bn === 1) return 0.5;
        return lerp(0.24, 0.78, k / (bn - 1));
    }

    function update(t) {
        const w = stage.width;
        const h = stage.height;
        const n = sticks.length;
        const cx = w * 0.5;
        const topY = h * 0.1;
        const botY = h * 0.9;
        const L = botY - topY;
        const halfWidth = w * 0.16 * (0.5 + params.bow); // splay width
        const bn = params.binds | 0;
        const tight = params.tight;
        const bow = params.bow;
        const crook = params.crook;

        // bind tightness profile: at each bind point the bundle pinches to a
        // narrow waist; between binds it relaxes outward (bows). product of
        // gaussians around each bind gives the classic faggot silhouette.
        function widthAt(u) {
            // u: 0..1 along length
            let pinch = 1;
            for (let b = 0; b < bn; b++) {
                const c = bindAt(b, bn);
                const d = (u - c) / 0.12;
                const g = Math.exp(-d * d); // 1 at bind, →0 away
                pinch *= 1 - g * tight * 0.92;
            }
            // bow: between binds the bundle bulges
            const bulge = 1 + bow * 0.5 * Math.sin(u * Math.PI);
            return pinch * bulge;
        }

        const arr = geom.attributes.position.array;
        let p = 0;
        for (let i = 0; i < n; i++) {
            const s = sticks[i];
            const stickTop = topY + (1 - s.lenScale) * L * 0.5;
            const stickBot = botY - s.end * L * 0.06;
            let prevX = 0,
                prevY = 0;
            for (let seg = 0; seg < SEGMENTS; seg++) {
                const u0 = seg / (SEGMENTS - 1);
                // y down the stick
                const y = lerp(stickTop, stickBot, u0);
                const wd = widthAt(u0);
                // lateral position: base offset * current width, plus a crook
                // (gentle S-curve) and a slow live wobble
                const crookTerm =
                    crook *
                    halfWidth *
                    0.5 *
                    s.crookAmp *
                    Math.sin(u0 * Math.PI * s.crookFreq + s.crookPhase + t * 0.3);
                const wobble =
                    Math.sin(t * 0.8 + s.wobblePhase + u0 * 2.0) * (1 - widthAt(u0)) * 4 * bow;
                const x = cx + s.offset * halfWidth * 2 * wd + crookTerm + wobble;
                if (seg > 0) {
                    arr[p++] = prevX;
                    arr[p++] = prevY;
                    arr[p++] = 0;
                    arr[p++] = x;
                    arr[p++] = y;
                    arr[p++] = 0;
                }
                prevX = x;
                prevY = y;
            }
        }
        // fill any remaining (unused) verts at origin
        while (p < arr.length) arr[p++] = 0;
        geom.attributes.position.needsUpdate = true;
        geom.setDrawRange(0, n * (SEGMENTS - 1) * 2);

        // ---- binding cinches: little wrapped cross-strokes at each waist ----
        const barr = bindGeom.attributes.position.array;
        let bp = 0;
        for (let b = 0; b < bn; b++) {
            const u = bindAt(b, bn);
            const y = lerp(topY, botY, u);
            const wd = widthAt(u);
            const halfW = halfWidth * wd + 2;
            const wraps = 4;
            for (let k = 0; k < wraps; k++) {
                const yy = y + (k - (wraps - 1) / 2) * 3.2;
                // a slightly slanted wrap stroke + tiny tie wobble
                const slant = Math.sin(t * 0.5 + b + k) * 1.5;
                barr[bp++] = cx - halfW;
                barr[bp++] = yy - slant;
                barr[bp++] = 0;
                barr[bp++] = cx + halfW;
                barr[bp++] = yy + slant;
                barr[bp++] = 0;
            }
        }
        while (bp < barr.length) barr[bp++] = 0;
        bindGeom.attributes.position.needsUpdate = true;
        bindGeom.setDrawRange(0, bn * 4 * 2);

        mat.opacity = 0.62 + 0.06 * Math.sin(t * 0.5);
    }

    function applyTheme(p) {
        palette = p;
        mat.color.copy(p.dim);
        bindMat.color.copy(p.ink);
        stage.renderer.setClearColor(p.void, 1);
    }

    stage.onFrame((t) => update(t));

    return {
        meta,
        start: () => stage.start(),
        stop: () => stage.stop(),
        setTheme: applyTheme,
        setParam: (k, v) => {
            params[k] = v;
            if (["sticks", "binds", "seed"].includes(k)) buildSticks();
        },
        resize: () => stage.resize(),
        dispose: () => {
            stage.dispose();
            if (geom) geom.dispose();
            if (bindGeom) bindGeom.dispose();
            mat.dispose();
            bindMat.dispose();
        },
        _init: () => buildSticks(),
    };
}
