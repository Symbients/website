// common.js — shared scaffolding for the 2D three.js lab assets.
// Strictly 2D: every asset uses either an OrthographicCamera in screen space
// or a single fullscreen plane + fragment shader. No perspective, no orbiting.
//
// Aesthetic notes (echoing symdome + the Faggots book):
//  - monochrome / theme-aware: ink-on-void, one tone, hairline strokes.
//  - symdome shader vocabulary: time-driven sine fields, hash noise, fbm,
//    smoothstep edges, polar/radial warps, scanline banding.
//  - Faggots: bundles of sticks bound together (kindling), flowing pen lines,
//    ornamental curls — high contrast, lots of breathing white space.

import * as THREE from "../vendor/three.module.js";

export { THREE };

// ---------------------------------------------------------------------------
// Palette — read straight off the site's CSS custom properties so the lab is
// theme-aware (light / dark / amber) exactly like lexicon.html.
// ---------------------------------------------------------------------------
export function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const pick = (name, fallback) => {
        const v = cs.getPropertyValue(name).trim();
        return v || fallback;
    };
    const voidHex = pick("--void", "#f4f0e7");
    const textHex = pick("--text", "#1f1c16");
    const dimHex = pick("--dim", "#6c675c");
    const faintHex = pick("--faint", "#a39c8d");
    const fieldRgb = pick("--field-rgb", "92, 90, 82")
        .split(",")
        .map((n) => parseFloat(n.trim()) / 255);
    return {
        void: new THREE.Color(voidHex),
        ink: new THREE.Color(textHex),
        dim: new THREE.Color(dimHex),
        faint: new THREE.Color(faintHex),
        field: new THREE.Color(fieldRgb[0], fieldRgb[1], fieldRgb[2]),
        voidHex,
        textHex,
        dimHex,
        faintHex,
    };
}

// ---------------------------------------------------------------------------
// Seeded RNG — deterministic so a "seed" knob is reproducible.
// mulberry32: small, fast, good enough for visual scatter.
// ---------------------------------------------------------------------------
export function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// JS-side value-noise + fbm, echoing symdome's ascii.js fbm() layering.
export function makeFbm(seed) {
    const rng = makeRng(seed);
    const grad = new Float32Array(256);
    for (let i = 0; i < 256; i++) grad[i] = rng();
    const perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = (rng() * (i + 1)) | 0;
        const t = p[i];
        p[i] = p[j];
        p[j] = t;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const fade = (t) => t * t * (3 - 2 * t);
    function vnoise(x, y) {
        const xi = Math.floor(x) & 255;
        const yi = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const aa = grad[perm[(perm[xi] + yi) & 255]];
        const ba = grad[perm[(perm[xi + 1] + yi) & 255]];
        const ab = grad[perm[(perm[xi] + yi + 1) & 255]];
        const bb = grad[perm[(perm[xi + 1] + yi + 1) & 255]];
        const u = fade(xf);
        const v = fade(yf);
        return (
            aa * (1 - u) * (1 - v) +
            ba * u * (1 - v) +
            ab * (1 - u) * v +
            bb * u * v
        );
    }
    return function fbm(x, y) {
        return (
            0.55 * vnoise(x, y) +
            0.3 * vnoise(x * 2.13 + 7.7, y * 2.13 + 3.1) +
            0.15 * vnoise(x * 4.41 + 13.3, y * 4.41 + 9.2)
        );
    };
}

// ---------------------------------------------------------------------------
// Reusable GLSL — lifted in spirit from symdome's hash3 / noise3d / fbm.
// 2D variants here since the look must stay flat.
// ---------------------------------------------------------------------------
export const GLSL_NOISE = /* glsl */ `
  float hash21(vec2 p){
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.5);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  // fbm with the same cascade shape symdome uses (p*=2.1, a*=0.5-ish)
  float fbm(vec2 p){
    float v = 0.0;
    float a = 0.5;
    for(int i = 0; i < 5; i++){
      v += a * vnoise(p);
      p = p * 2.1 + vec2(11.3, 7.7);
      a *= 0.5;
    }
    return v;
  }
`;

// ---------------------------------------------------------------------------
// Base 2D renderer. Wraps a WebGLRenderer + an OrthographicCamera mapped to
// pixel space (0,0 top-left → w,h bottom-right) so line assets can think in px.
// Handles resize, devicePixelRatio, RAF, and a clean dispose().
// ---------------------------------------------------------------------------
export class Stage2D {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.scene = new THREE.Scene();
        // Pixel-space ortho camera: x∈[0,w], y∈[0,h], origin top-left.
        this.camera = new THREE.OrthographicCamera(0, 1, 0, 1, -1000, 1000);
        this.time = 0;
        this._running = false;
        this._onFrame = null;
        this._raf = 0;
        this._last = 0;
        this.resize();
    }
    get width() {
        return this.canvas.clientWidth || 1;
    }
    get height() {
        return this.canvas.clientHeight || 1;
    }
    resize() {
        const w = this.width;
        const h = this.height;
        this.renderer.setSize(w, h, false);
        // Pixel-space ortho mapping (top-left origin, y down). Assets that use
        // a normalized fullscreen plane set `pixelCamera = false` so we leave
        // their camera bounds (and any clip-space plane) untouched.
        if (this.pixelCamera !== false) {
            this.camera.left = 0;
            this.camera.right = w;
            this.camera.top = 0;
            this.camera.bottom = h;
            this.camera.updateProjectionMatrix();
        }
        if (this._onResize) this._onResize(w, h);
    }
    onFrame(fn) {
        this._onFrame = fn;
    }
    onResize(fn) {
        this._onResize = fn;
    }
    start() {
        if (this._running) return;
        this._running = true;
        this._last = performance.now();
        const loop = (now) => {
            if (!this._running) return;
            // Self-heal: keep the drawing buffer matched to the displayed size.
            // The canvas can be relocated/resized between explicit resize() calls
            // (e.g. moved into the narrative reader); without this the buffer
            // stays at the old size and the canvas renders blurry/low-res.
            const cw = this.canvas.clientWidth;
            const ch = this.canvas.clientHeight;
            if (cw && ch && (cw !== this._cw || ch !== this._ch)) {
                this._cw = cw;
                this._ch = ch;
                this.resize();
            }
            const dt = Math.min((now - this._last) / 1000, 0.05);
            this._last = now;
            this.time += dt;
            if (this._onFrame) this._onFrame(this.time, dt);
            this.renderer.render(this.scene, this.camera);
            this._raf = requestAnimationFrame(loop);
        };
        this._raf = requestAnimationFrame(loop);
    }
    stop() {
        this._running = false;
        cancelAnimationFrame(this._raf);
    }
    dispose() {
        this.stop();
        this.scene.traverse((o) => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
                const m = o.material;
                (Array.isArray(m) ? m : [m]).forEach((mm) => mm.dispose());
            }
        });
        this.renderer.dispose();
    }
}

// Helper: build a fat-ish line as a thin quad strip is overkill; we use plain
// THREE.LineSegments with a LineBasicMaterial. lineWidth is mostly 1px on most
// platforms, so we lean on opacity + density for "weight" instead.
export function lineMaterial(color, opacity) {
    return new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: opacity == null ? 1 : opacity,
    });
}

// Map a 0..1 control to a numeric range.
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
