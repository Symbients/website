// tree-recursive.js — ASSET 1
// "Kindling Tree" — a recursive binary branching form drawn as hairline
// line segments. Echoes symdome's ascii trees: a recursion that spawns
// children at an angle, jittered by a seeded RNG, gently swaying in time.
//
// 2D: pixel-space OrthographicCamera (via Stage2D), flat on the plane.

import { THREE, Stage2D, makeRng, lineMaterial, lerp, clamp } from "./common.js";

export const meta = {
    id: "tree-recursive",
    name: "Kindling Tree",
    evokes:
        "symdome's ascii trees — a recursive branch that splits, jitters and sways; a sapling of bound line.",
    params: [
        { key: "depth", label: "branch depth", min: 4, max: 11, step: 1, value: 9 },
        { key: "angle", label: "split angle", min: 8, max: 48, step: 1, value: 24 },
        { key: "spread", label: "asymmetry", min: 0, max: 1, step: 0.01, value: 0.4 },
        { key: "shrink", label: "child shrink", min: 0.6, max: 0.86, step: 0.005, value: 0.74 },
        { key: "sway", label: "sway", min: 0, max: 1, step: 0.01, value: 0.45 },
        { key: "seed", label: "seed", min: 1, max: 999, step: 1, value: 137 },
    ],
};

export function create(canvas) {
    const stage = new Stage2D(canvas);
    let palette = null;
    const group = new THREE.Group();
    stage.scene.add(group);

    let geom = null;
    let mat = lineMaterial(0x000000, 0.85);
    let lines = null;
    let params = Object.fromEntries(meta.params.map((p) => [p.key, p.value]));

    // Static skeleton: positions + a per-vertex "phase" used for sway in the
    // animate step. We rebuild only when structural knobs change.
    let segs = []; // {x0,y0,x1,y1, depth, branchPhase}

    function build() {
        const w = stage.width;
        const h = stage.height;
        const rng = makeRng(params.seed | 0);
        segs = [];
        const maxDepth = params.depth | 0;
        const baseLen = h * 0.30;
        const ang = (params.angle * Math.PI) / 180;

        // recursion: grow from (x,y) heading `dir` (radians, -PI/2 = up)
        function grow(x, y, dir, len, depth) {
            if (depth > maxDepth || len < 1.2) return;
            const nx = x + Math.cos(dir) * len;
            const ny = y + Math.sin(dir) * len;
            segs.push({
                x0: x,
                y0: y,
                x1: nx,
                y1: ny,
                depth,
                branchPhase: rng() * Math.PI * 2,
            });
            const a = params.asym !== undefined ? params.asym : params.spread;
            // left & right children, asymmetric + jittered (symdome-flavoured)
            const jL = (rng() - 0.5) * ang * 0.5;
            const jR = (rng() - 0.5) * ang * 0.5;
            const bias = (rng() - 0.5) * a * ang;
            const childLen = len * params.shrink;
            grow(nx, ny, dir - ang + jL + bias, childLen * lerp(1, 0.82, a * rng()), depth + 1);
            grow(nx, ny, dir + ang + jR + bias, childLen, depth + 1);
            // occasional third shoot for kindling density at shallow depths
            if (depth < maxDepth - 3 && rng() > 0.72) {
                grow(nx, ny, dir + (rng() - 0.5) * ang * 0.6, childLen * 0.8, depth + 2);
            }
        }
        grow(w * 0.5, h * 0.98, -Math.PI / 2, baseLen, 0);

        const n = segs.length;
        const pos = new Float32Array(n * 6);
        const phase = new Float32Array(n * 2);
        const dep = new Float32Array(n * 2);
        for (let i = 0; i < n; i++) {
            const s = segs[i];
            pos[i * 6 + 0] = s.x0;
            pos[i * 6 + 1] = s.y0;
            pos[i * 6 + 2] = 0;
            pos[i * 6 + 3] = s.x1;
            pos[i * 6 + 4] = s.y1;
            pos[i * 6 + 5] = 0;
            phase[i * 2] = s.branchPhase;
            phase[i * 2 + 1] = s.branchPhase;
            dep[i * 2] = s.depth;
            dep[i * 2 + 1] = s.depth;
        }
        if (geom) geom.dispose();
        geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geom.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
        geom.setAttribute("aDepth", new THREE.BufferAttribute(dep, 1));
        geom._basePos = pos.slice();
        geom._maxDepth = maxDepth;

        if (lines) group.remove(lines);
        lines = new THREE.LineSegments(geom, mat);
        group.add(lines);
    }

    function applyTheme(p) {
        palette = p;
        mat.color.copy(p.ink);
        stage.renderer.setClearColor(p.void, 1);
    }

    stage.onResize(() => build());

    stage.onFrame((t) => {
        if (!geom) return;
        const base = geom._basePos;
        const attr = geom.attributes.position.array;
        const ph = geom.attributes.aPhase.array;
        const dp = geom.attributes.aDepth.array;
        const md = geom._maxDepth;
        const sway = params.sway;
        // sway scales with depth: tips move, trunk holds — like wind in kindling.
        for (let i = 0; i < attr.length; i += 3) {
            const vi = i / 3;
            const d = dp[vi];
            const amp = Math.pow(d / md, 1.6) * 10 * sway;
            const s = Math.sin(t * 0.9 + ph[vi] + d * 0.25);
            attr[i] = base[i] + s * amp;
            attr[i + 1] = base[i + 1] + Math.cos(t * 0.7 + ph[vi]) * amp * 0.35;
        }
        geom.attributes.position.needsUpdate = true;
        // faint opacity pulse, instrument-like restraint
        mat.opacity = 0.78 + 0.08 * Math.sin(t * 0.6);
    });

    return {
        meta,
        start: () => stage.start(),
        stop: () => stage.stop(),
        setTheme: applyTheme,
        setParam: (k, v) => {
            params[k] = v;
            // structural knobs trigger a rebuild
            if (["depth", "angle", "spread", "shrink", "seed"].includes(k)) build();
        },
        resize: () => stage.resize(),
        dispose: () => {
            stage.dispose();
            if (geom) geom.dispose();
            mat.dispose();
        },
        _init: () => build(),
    };
}
