// faggot-radial.js — ASSET 5
// "Radial Sheaf" — kindling bound at the centre and fanning outward in a ring,
// a faggot opened into a rosette. Echoes symdome's mandala.js: a radial field
// with a slow breathe (radialDir * breathe * radialDist) so the whole rosette
// inhales and exhales. Each spoke is a slightly crooked stick; a central bind
// cinches them; faint concentric ghost-rings sit behind, like a barcode wheel.
//
// 2D: pixel-space OrthographicCamera (Stage2D). Hairline LineSegments only.

import { THREE, Stage2D, makeRng, lineMaterial, lerp } from "./common.js";

export const meta = {
    id: "faggot-radial",
    name: "Radial Sheaf",
    evokes:
        "a faggot opened into a rosette — kindling bound at the centre, fanning out; symdome's mandala breathe applied to a bundle.",
    params: [
        { key: "spokes", label: "spokes", min: 8, max: 80, step: 1, value: 40 },
        { key: "rings", label: "ghost rings", min: 0, max: 8, step: 1, value: 4 },
        { key: "crook", label: "crookedness", min: 0, max: 1, step: 0.01, value: 0.35 },
        { key: "breathe", label: "breathe", min: 0, max: 1, step: 0.01, value: 0.5 },
        { key: "gap", label: "centre gap", min: 0, max: 0.5, step: 0.01, value: 0.12 },
        { key: "seed", label: "seed", min: 1, max: 999, step: 1, value: 99 },
    ],
};

export function create(canvas) {
    const stage = new Stage2D(canvas);
    let palette = null;

    const spokeMat = lineMaterial(0x000000, 0.55);
    const ringMat = lineMaterial(0x888888, 0.3);
    const bindMat = lineMaterial(0x000000, 0.9);
    let spokeGeom, ringGeom, bindGeom;
    let spokeLines, ringLines, bindLines;

    let params = Object.fromEntries(meta.params.map((p) => [p.key, p.value]));
    const SEG = 18; // samples per spoke
    let spokes = [];

    function build() {
        const rng = makeRng(params.seed | 0);
        const n = params.spokes | 0;
        spokes = [];
        for (let i = 0; i < n; i++) {
            const baseAng = (i / n) * Math.PI * 2;
            spokes.push({
                ang: baseAng,
                crookAmp: rng() * 2 - 1,
                crookFreq: 1 + rng() * 2,
                phase: rng() * Math.PI * 2,
                lenScale: lerp(0.78, 1.0, rng()),
            });
        }
        const total = n * (SEG - 1) * 2;
        const pos = new Float32Array(total * 3);
        if (spokeGeom) spokeGeom.dispose();
        spokeGeom = new THREE.BufferGeometry();
        spokeGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        if (spokeLines) stage.scene.remove(spokeLines);
        spokeLines = new THREE.LineSegments(spokeGeom, spokeMat);
        stage.scene.add(spokeLines);

        // ghost rings (concentric, drawn as many short chords)
        const rn = params.rings | 0;
        const ringSegs = 96;
        const rpos = new Float32Array(rn * ringSegs * 2 * 3);
        if (ringGeom) ringGeom.dispose();
        ringGeom = new THREE.BufferGeometry();
        ringGeom.setAttribute("position", new THREE.BufferAttribute(rpos, 3));
        if (ringLines) stage.scene.remove(ringLines);
        ringLines = new THREE.LineSegments(ringGeom, ringMat);
        stage.scene.add(ringLines);
        ringGeom._segs = ringSegs;

        // central bind: a small wrapped polygon
        const bpos = new Float32Array(24 * 6);
        if (bindGeom) bindGeom.dispose();
        bindGeom = new THREE.BufferGeometry();
        bindGeom.setAttribute("position", new THREE.BufferAttribute(bpos, 3));
        if (bindLines) stage.scene.remove(bindLines);
        bindLines = new THREE.LineSegments(bindGeom, bindMat);
        stage.scene.add(bindLines);
    }

    function update(t) {
        const w = stage.width;
        const h = stage.height;
        const cx = w * 0.5;
        const cy = h * 0.5;
        const R = Math.min(w, h) * 0.42;
        const n = spokes.length;
        const gap = params.gap;
        const crook = params.crook;
        // symdome mandala breathe: whole rosette inhales/exhales
        const breathe = 1 + params.breathe * 0.12 * Math.sin(t * 0.6);
        const slowSpin = t * 0.04 * params.breathe;

        const arr = spokeGeom.attributes.position.array;
        let p = 0;
        for (let i = 0; i < n; i++) {
            const s = spokes[i];
            const ang = s.ang + slowSpin;
            const ca = Math.cos(ang);
            const sa = Math.sin(ang);
            // perpendicular for crook displacement
            const px = -sa;
            const py = ca;
            const len = R * s.lenScale * breathe;
            const r0 = R * gap;
            let prevX = 0,
                prevY = 0;
            for (let seg = 0; seg < SEG; seg++) {
                const u = seg / (SEG - 1);
                const rr = lerp(r0, len, u);
                const crookTerm =
                    crook *
                    R *
                    0.08 *
                    s.crookAmp *
                    Math.sin(u * Math.PI * s.crookFreq + s.phase + t * 0.4);
                const x = cx + ca * rr + px * crookTerm;
                const y = cy + sa * rr + py * crookTerm;
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
        while (p < arr.length) arr[p++] = 0;
        spokeGeom.attributes.position.needsUpdate = true;

        // ghost rings
        const rn = params.rings | 0;
        const rsegs = ringGeom._segs;
        const rarr = ringGeom.attributes.position.array;
        let rp = 0;
        for (let k = 0; k < rn; k++) {
            const rr = lerp(R * (gap + 0.1), R * 0.95, rn === 1 ? 0.5 : k / (rn - 1)) * breathe;
            for (let j = 0; j < rsegs; j++) {
                const a0 = (j / rsegs) * Math.PI * 2;
                const a1 = ((j + 1) / rsegs) * Math.PI * 2;
                rarr[rp++] = cx + Math.cos(a0) * rr;
                rarr[rp++] = cy + Math.sin(a0) * rr;
                rarr[rp++] = 0;
                rarr[rp++] = cx + Math.cos(a1) * rr;
                rarr[rp++] = cy + Math.sin(a1) * rr;
                rarr[rp++] = 0;
            }
        }
        while (rp < rarr.length) rarr[rp++] = 0;
        ringGeom.attributes.position.needsUpdate = true;
        ringGeom.setDrawRange(0, rn * rsegs * 2);

        // central bind ring
        const barr = bindGeom.attributes.position.array;
        let bp = 0;
        const bindR = R * gap * 0.9;
        const bn = 20;
        for (let j = 0; j < bn; j++) {
            const a0 = (j / bn) * Math.PI * 2;
            const a1 = ((j + 1) / bn) * Math.PI * 2;
            const wob = 1 + 0.06 * Math.sin(t * 1.5 + j);
            barr[bp++] = cx + Math.cos(a0) * bindR * wob;
            barr[bp++] = cy + Math.sin(a0) * bindR * wob;
            barr[bp++] = 0;
            barr[bp++] = cx + Math.cos(a1) * bindR * wob;
            barr[bp++] = cy + Math.sin(a1) * bindR * wob;
            barr[bp++] = 0;
        }
        while (bp < barr.length) barr[bp++] = 0;
        bindGeom.attributes.position.needsUpdate = true;
        bindGeom.setDrawRange(0, bn * 2);

        spokeMat.opacity = 0.5 + 0.08 * Math.sin(t * 0.5);
    }

    function applyTheme(p) {
        palette = p;
        spokeMat.color.copy(p.ink);
        ringMat.color.copy(p.faint);
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
            if (["spokes", "rings", "seed"].includes(k)) build();
        },
        resize: () => stage.resize(),
        dispose: () => {
            stage.dispose();
            spokeGeom && spokeGeom.dispose();
            ringGeom && ringGeom.dispose();
            bindGeom && bindGeom.dispose();
            spokeMat.dispose();
            ringMat.dispose();
            bindMat.dispose();
        },
        _init: () => build(),
    };
}
