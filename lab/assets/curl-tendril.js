// curl-tendril.js — ASSET 6
// "Curl Tendrils" — flowing pen-line tendrils that curl into spirals and shed
// beaded chains, channelling Ned Asta's art-nouveau line work in the Faggots
// book (ornamental curls, dotted strings, coiling growth). Structurally still
// a recursive branch (tree family) but the lines bend into logarithmic curls
// instead of straight kindling, and bud beads (small dots) at their tips —
// the symdome ascii '*'/'o' accent made gestural.
//
// 2D: pixel-space OrthographicCamera (Stage2D). Hairline lines + point beads.

import { THREE, Stage2D, makeRng, lineMaterial, lerp } from "./common.js";

export const meta = {
    id: "curl-tendril",
    name: "Curl Tendrils",
    evokes:
        "Ned Asta's Faggots pen-curls — coiling tendrils that spiral and shed beaded chains; the ascii accent made gestural.",
    params: [
        { key: "tendrils", label: "tendrils", min: 2, max: 14, step: 1, value: 6 },
        { key: "coil", label: "coil tightness", min: 0.2, max: 2.5, step: 0.05, value: 1.2 },
        { key: "splits", label: "split depth", min: 0, max: 4, step: 1, value: 2 },
        { key: "beads", label: "beads", min: 0, max: 1, step: 0.01, value: 0.6 },
        { key: "drift", label: "drift", min: 0, max: 1, step: 0.01, value: 0.5 },
        { key: "seed", label: "seed", min: 1, max: 999, step: 1, value: 314 },
    ],
};

export function create(canvas) {
    const stage = new Stage2D(canvas);
    let palette = null;

    const lineMat = lineMaterial(0x000000, 0.8);
    let lineGeom, lines;
    const beadMat = new THREE.PointsMaterial({
        size: 4,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.9,
    });
    let beadGeom, beads;

    let params = Object.fromEntries(meta.params.map((p) => [p.key, p.value]));

    // Build a set of curling polylines + bead positions. Each tendril is a
    // logarithmic spiral; recursive splits spawn child spirals at points along
    // the parent. Stored as static base geometry; animation rotates phase.
    let segVerts = []; // flat [x,y,...] pairs for LineSegments
    let beadVerts = [];
    let tendrilSeeds = [];

    const STEPS = 90;

    function curl(out, beadsOut, x, y, dir, scale, coilSign, depth, splits, rng, beadProb) {
        // logarithmic spiral: radius grows, angle accumulates
        const turns = 1.4 + rng() * 0.8;
        const totalAng = turns * Math.PI * 2 * coilSign;
        const k = 0.12 * params.coil; // tightness
        let px = x;
        let py = y;
        let a = dir;
        let r = scale * 0.02;
        const splitAt = depth < splits ? 0.45 + rng() * 0.3 : -1;
        for (let s = 1; s <= STEPS; s++) {
            const u = s / STEPS;
            a = dir + totalAng * u;
            r = scale * (0.02 + 0.5 * u) * Math.exp(k * u * 2);
            const nx = x + Math.cos(a) * r;
            const ny = y + Math.sin(a) * r;
            out.push(px, py, nx, ny);
            px = nx;
            py = ny;
            // shed a bead occasionally along the curl
            if (rng() < beadProb * 0.06) beadsOut.push(nx, ny);
            // spawn a child spiral mid-way (recursive split)
            if (splitAt > 0 && Math.abs(u - splitAt) < 1 / STEPS) {
                curl(
                    out,
                    beadsOut,
                    nx,
                    ny,
                    a + (Math.PI / 2) * (rng() > 0.5 ? 1 : -1),
                    scale * 0.5,
                    -coilSign,
                    depth + 1,
                    splits,
                    rng,
                    beadProb
                );
            }
        }
        // bud bead at the very tip (the curl's eye)
        beadsOut.push(px, py);
    }

    function build() {
        const w = stage.width;
        const h = stage.height;
        const rng = makeRng(params.seed | 0);
        const n = params.tendrils | 0;
        segVerts = [];
        beadVerts = [];
        tendrilSeeds = [];
        for (let i = 0; i < n; i++) {
            // root anchored along the bottom, fanning up
            const rx = lerp(w * 0.12, w * 0.88, n === 1 ? 0.5 : i / (n - 1)) + (rng() - 0.5) * w * 0.05;
            const ry = h * (0.62 + rng() * 0.3);
            const dir = -Math.PI / 2 + (rng() - 0.5) * 1.2;
            const scale = Math.min(w, h) * lerp(0.4, 0.7, rng());
            const coilSign = rng() > 0.5 ? 1 : -1;
            tendrilSeeds.push({ rx, ry, baseDir: dir });
            curl(
                segVerts,
                beadVerts,
                rx,
                ry,
                dir,
                scale,
                coilSign,
                0,
                params.splits | 0,
                rng,
                params.beads
            );
        }
        const lpos = new Float32Array(segVerts.length / 2 * 3);
        for (let i = 0, j = 0; i < segVerts.length; i += 2) {
            lpos[j++] = segVerts[i];
            lpos[j++] = segVerts[i + 1];
            lpos[j++] = 0;
        }
        if (lineGeom) lineGeom.dispose();
        lineGeom = new THREE.BufferGeometry();
        lineGeom.setAttribute("position", new THREE.BufferAttribute(lpos, 3));
        lineGeom._base = lpos.slice();
        if (lines) stage.scene.remove(lines);
        lines = new THREE.LineSegments(lineGeom, lineMat);
        stage.scene.add(lines);

        const bpos = new Float32Array((beadVerts.length / 2) * 3);
        for (let i = 0, j = 0; i < beadVerts.length; i += 2) {
            bpos[j++] = beadVerts[i];
            bpos[j++] = beadVerts[i + 1];
            bpos[j++] = 0;
        }
        if (beadGeom) beadGeom.dispose();
        beadGeom = new THREE.BufferGeometry();
        beadGeom.setAttribute("position", new THREE.BufferAttribute(bpos, 3));
        beadGeom._base = bpos.slice();
        if (beads) stage.scene.remove(beads);
        beads = new THREE.Points(beadGeom, beadMat);
        stage.scene.add(beads);
    }

    function update(t) {
        if (!lineGeom) return;
        const drift = params.drift;
        // gentle global breathing sway: displace every vertex by a smooth field
        const base = lineGeom._base;
        const arr = lineGeom.attributes.position.array;
        for (let i = 0; i < arr.length; i += 3) {
            const bx = base[i];
            const by = base[i + 1];
            const s = Math.sin(t * 0.6 + bx * 0.01 + by * 0.012) * 4 * drift;
            const c = Math.cos(t * 0.5 + by * 0.01) * 4 * drift;
            arr[i] = bx + s;
            arr[i + 1] = by + c;
        }
        lineGeom.attributes.position.needsUpdate = true;
        if (beadGeom) {
            const bb = beadGeom._base;
            const ba = beadGeom.attributes.position.array;
            for (let i = 0; i < ba.length; i += 3) {
                const bx = bb[i];
                const by = bb[i + 1];
                ba[i] = bx + Math.sin(t * 0.6 + bx * 0.01 + by * 0.012) * 4 * drift;
                ba[i + 1] = by + Math.cos(t * 0.5 + by * 0.01) * 4 * drift;
            }
            beadGeom.attributes.position.needsUpdate = true;
            beadMat.opacity = 0.7 + 0.25 * Math.sin(t * 1.2);
        }
        lineMat.opacity = 0.72 + 0.08 * Math.sin(t * 0.4);
    }

    function applyTheme(p) {
        palette = p;
        lineMat.color.copy(p.ink);
        beadMat.color.copy(p.ink);
        stage.renderer.setClearColor(p.void, 1);
    }

    stage.onResize(() => build());
    stage.onFrame((t) => update(t));

    return {
        meta,
        start: () => stage.start(),
        stop: () => stage.stop(),
        setTheme: applyTheme,
        setParam: (k, v) => {
            params[k] = v;
            if (["tendrils", "coil", "splits", "beads", "seed"].includes(k)) build();
        },
        resize: () => stage.resize(),
        dispose: () => {
            stage.dispose();
            lineGeom && lineGeom.dispose();
            beadGeom && beadGeom.dispose();
            lineMat.dispose();
            beadMat.dispose();
        },
        _init: () => build(),
    };
}
