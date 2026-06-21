// shader-thicket.js — ASSET 4 (the required fragment-shader piece)
// "Thicket Field" — a fullscreen fragment shader drawing a field of vertical
// kindling-stalks (a barcode-like thicket) that sway and fork. Directly echoes
// symdome's shader vocabulary: hash21 / vnoise / fbm cascade (p*=2.1, a*=0.5),
// time-driven sine warps, smoothstep edges, monochrome ink-on-void. Domain
// warping bends the stalks like the wave-floor / clouds shaders.
//
// 2D: a single fullscreen plane + ShaderMaterial. No geometry forms at all —
// the whole image is computed per-pixel, the way symdome paints its fields.

import { THREE, Stage2D, GLSL_NOISE } from "./common.js";

export const meta = {
    id: "shader-thicket",
    name: "Thicket Field",
    evokes:
        "symdome's noise-field shaders — a barcode thicket of swaying kindling-stalks drawn entirely in a fragment shader.",
    params: [
        { key: "density", label: "stalk density", min: 6, max: 60, step: 1, value: 26 },
        { key: "warp", label: "domain warp", min: 0, max: 1, step: 0.01, value: 0.5 },
        { key: "fork", label: "fork / branch", min: 0, max: 1, step: 0.01, value: 0.45 },
        { key: "weight", label: "line weight", min: 0.2, max: 1, step: 0.01, value: 0.5 },
        { key: "speed", label: "drift speed", min: 0, max: 1, step: 0.01, value: 0.4 },
        { key: "seed", label: "seed", min: 1, max: 999, step: 1, value: 21 },
    ],
};

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uRes;
  uniform vec3  uInk;
  uniform vec3  uVoid;
  uniform vec3  uDim;
  uniform float uDensity;
  uniform float uWarp;
  uniform float uFork;
  uniform float uWeight;
  uniform float uSpeed;
  uniform float uSeed;

  ${GLSL_NOISE}

  void main(){
    // aspect-correct uv; y up
    vec2 uv = vUv;
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2(uv.x * aspect, uv.y);
    float t = uTime * (0.15 + uSpeed * 0.6);

    // ---- domain warp (symdome wave-floor / clouds flavour) -----------------
    // bend the horizontal coordinate by a time-driven fbm so stalks sway.
    float warp = (fbm(vec2(uv.y * 2.0 + uSeed, t * 0.6)) - 0.5);
    warp += 0.4 * sin(uv.y * 6.2831 + t) ;
    float xw = p.x + warp * uWarp * 0.18;

    // ---- the thicket: a periodic comb of vertical stalks -------------------
    float dens = uDensity;
    float col = xw * dens;
    float cell = floor(col);
    float fpos = fract(col) - 0.5;                 // -0.5..0.5 within a stalk

    // per-stalk randomness (hash, symdome-style)
    float r = hash21(vec2(cell, uSeed));
    float r2 = hash21(vec2(cell * 1.7 + 3.0, uSeed));

    // stalk slight lateral drift + thickness taper toward the top
    float lean = (r - 0.5) * 0.6 * sin(t * 0.5 + r * 6.28);
    float center = lean * (uv.y);                  // 0 at root, leans at tip
    float d = abs(fpos - center * dens * 0.04);

    // line weight: thin near tip, a touch fuller near root (kindling)
    float w = mix(0.020, 0.060, uWeight) * (0.5 + 0.5 * (1.0 - uv.y));
    float stalk = 1.0 - smoothstep(w, w + 0.012, d);

    // stalks don't all reach full height — ragged tops, like cut kindling
    float top = 0.18 + 0.74 * r;
    stalk *= smoothstep(top, top - 0.08, uv.y);    // fade out above its top
    // ragged root line at the bottom
    stalk *= smoothstep(0.0, 0.04, uv.y);

    // ---- forks: occasional diagonal shoot off a stalk ----------------------
    float fork = 0.0;
    if (r2 < uFork) {
      float fy = 0.30 + 0.45 * r;                  // fork height
      float branchDir = (r2 < uFork * 0.5) ? 1.0 : -1.0;
      // diagonal line emanating upward from (cell center, fy)
      float run = (uv.y - fy);
      float fx = fpos - branchDir * run * 1.3;
      float fd = abs(fx);
      float fmask = (1.0 - smoothstep(w, w + 0.014, fd))
                  * smoothstep(fy - 0.002, fy + 0.02, uv.y)   // start at fy
                  * smoothstep(fy + 0.34, fy + 0.30, uv.y);   // short shoot
      fork = fmask;
    }

    float ink = clamp(stalk + fork, 0.0, 1.0);

    // ---- a faint fbm haze behind, barcode scanline grain on top -----------
    float haze = fbm(vec2(uv.x * 3.0 + uSeed, uv.y * 3.0 - t * 0.2));
    haze = smoothstep(0.45, 0.85, haze) * 0.10;
    float scan = 0.04 * sin(uv.y * uRes.y * 3.14159);  // subtle scanline
    float grain = (hash21(floor(uv * uRes) + t) - 0.5) * 0.05;

    // composite: ink stalks over void, dim haze, instrument-like restraint
    vec3 base = uVoid;
    base = mix(base, uDim, haze);
    vec3 col3 = mix(base, uInk, ink * (0.86 + scan));
    col3 += grain * (uInk - uVoid);
    gl_FragColor = vec4(col3, 1.0);
  }
`;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0); // already in clip space
  }
`;

export function create(canvas) {
    const stage = new Stage2D(canvas);
    // Fullscreen shader writes gl_Position in clip space; keep the camera out
    // of pixel-space remapping (harmless here, but consistent + future-proof).
    stage.pixelCamera = false;
    stage.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(1, 1) },
        uInk: { value: new THREE.Color(0x000000) },
        uVoid: { value: new THREE.Color(0xffffff) },
        uDim: { value: new THREE.Color(0x888888) },
        uDensity: { value: 26 },
        uWarp: { value: 0.5 },
        uFork: { value: 0.45 },
        uWeight: { value: 0.5 },
        uSpeed: { value: 0.4 },
        uSeed: { value: 21 },
    };
    const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    stage.scene.add(plane);

    let params = Object.fromEntries(meta.params.map((p) => [p.key, p.value]));
    for (const k in params) {
        const u = "u" + k.charAt(0).toUpperCase() + k.slice(1);
        if (uniforms[u]) uniforms[u].value = params[k];
    }

    function applyTheme(p) {
        uniforms.uInk.value.copy(p.ink);
        uniforms.uVoid.value.copy(p.void);
        uniforms.uDim.value.copy(p.dim);
        stage.renderer.setClearColor(p.void, 1);
    }

    stage.onResize((w, h) => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        uniforms.uRes.value.set(w * dpr, h * dpr);
    });
    stage.onFrame((t) => {
        uniforms.uTime.value = t;
    });

    return {
        meta,
        start: () => stage.start(),
        stop: () => stage.stop(),
        setTheme: applyTheme,
        setParam: (k, v) => {
            params[k] = v;
            const u = "u" + k.charAt(0).toUpperCase() + k.slice(1);
            if (uniforms[u]) uniforms[u].value = v;
        },
        resize: () => stage.resize(),
        dispose: () => {
            stage.dispose();
            mat.dispose();
        },
        _init: () => {
            stage.resize();
        },
    };
}
