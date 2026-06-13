/* ----------------------------------------------------------------------
   ascii.js — living tonal ASCII illustrations for the About essay.

   Each <pre class="ascii-fig" data-fig="…"> is a 68x34 character raster
   rendered from light-and-density fields (metaballs, a lemniscate, a
   log-spiral, a machine head) through a tonal ramp with dithered grain.
   Time is one more input to the fields: each figure loops through N
   frames of seamless motion. Frames are computed lazily on first use
   and cached. prefers-reduced-motion holds frame 0.

   "@" is the accent glyph: it is wrapped in <span class="hot"> so the
   hottest parts of each image carry the site's tan.

   Preview in a terminal:  node tools/render-figs.js [fig] [frames…]
   The CSS line-height/char-width ratio (1.15 / 0.6) must match ASPECT
   below — change them together.
   ---------------------------------------------------------------------- */
(function () {
    "use strict";

    var W = 68;
    var H = 34;
    var ASPECT = 1.92; // char cell height/width (line-height 1.15 / 0.6)
    var XSPAN = W / (H * ASPECT);
    var RAMP = " .:-=+*#%";
    var TAU = Math.PI * 2;
    var HOT = "@";

    /* ---------------- deterministic noise ---------------- */

    function hash2(ix, iy) {
        var h = (ix * 374761393 + iy * 668265263) | 0;
        h = ((h ^ (h >>> 13)) * 1274126177) | 0;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    }

    function smooth(t) {
        return t * t * (3 - 2 * t);
    }

    function vnoise(x, y) {
        var ix = Math.floor(x), iy = Math.floor(y);
        var fx = x - ix, fy = y - iy;
        var a = hash2(ix, iy), b = hash2(ix + 1, iy);
        var c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
        var u = smooth(fx), v = smooth(fy);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }

    function fbm(x, y) {
        return (
            0.55 * vnoise(x, y) +
            0.3 * vnoise(x * 2.13 + 7.7, y * 2.13 + 3.1) +
            0.15 * vnoise(x * 4.41 + 13.3, y * 4.41 + 9.2)
        );
    }

    function clamp(v, lo, hi) {
        return v < lo ? lo : v > hi ? hi : v;
    }

    function sstep(e0, e1, v) {
        var t = clamp((v - e0) / (e1 - e0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    /* ---------------- canvas ---------------- */

    function cellX(i) {
        return ((i + 0.5) / W * 2 - 1) * XSPAN;
    }

    function cellY(j) {
        return (j + 0.5) / H * 2 - 1;
    }

    // shade(x, y, i, j) -> 0..1; hot(x, y) -> bool; overlays: [r, c, text]
    function render(shade, hot, overlays) {
        var rows = [];
        for (var j = 0; j < H; j++) {
            var y = cellY(j);
            var line = "";
            for (var i = 0; i < W; i++) {
                var x = cellX(i);
                if (hot && hot(x, y)) {
                    line += "@";
                    continue;
                }
                var v = clamp(shade(x, y, i, j), 0, 1);
                // Grain: break the tonal banding up organically.
                v += (hash2(i, j * 7 + 1) - 0.5) * 0.08;
                var idx = clamp(
                    Math.round(v * (RAMP.length - 1)), 0, RAMP.length - 1);
                line += RAMP[idx];
            }
            rows.push(line);
        }
        (overlays || []).forEach(function (o) {
            var r = rows[o[0]].split("");
            for (var k = 0; k < o[2].length; k++) r[o[1] + k] = o[2][k];
            rows[o[0]] = r.join("");
        });
        return rows;
    }

    /* ---------------- figures ----------------
       Each builds frame t (0..1, seamless loop); f is the frame index
       for per-frame twinkle. */

    var FIGS = {};

    /* The inverted cyborg: a vast machine head, tan eyes lit — and in
       its chest chamber, where a reactor should be, a small human.
       The aura around the kept being breathes; the beacon pulses;
       once a cycle, it blinks. */
    FIGS.cyborg = {
        frames: 16,
        speed: 240,
        build: function (t) {
            var HW = 0.66, HH = 0.64, HCY = 0.04;
            var CHX = 0, CHY = 0.3, CHR = 0.2;
            var breath = Math.sin(TAU * t);
            var beacon = 0.6 + 0.35 * (0.5 + 0.5 * Math.sin(TAU * t + 1));
            var blink = t > 0.9;

            function headS(x, y) {
                return (
                    Math.pow(Math.abs(x) / HW, 3.5) +
                    Math.pow(Math.abs(y - HCY) / HH, 3.5)
                );
            }

            function shade(x, y) {
                var S = headS(x, y);
                var v;
                if (S < 1) {
                    // Hull: brushed metal, lit from above.
                    v = 0.58 - 0.22 * (y - HCY) - 0.06 * x +
                        0.13 * fbm(x * 6, y * 6);
                    // Dashed panel seams.
                    if (Math.abs(y + 0.14) < 0.016 && Math.sin(x * 34) > -0.2)
                        v *= 0.55;
                    if (Math.abs(y - 0.6) < 0.016 && Math.sin(x * 34) > -0.2)
                        v *= 0.55;
                    // Recessed eye sockets.
                    if (Math.abs(y + 0.32) < 0.08 &&
                        Math.abs(Math.abs(x) - 0.2) < 0.12) v *= 0.4;
                    // Mouth slit, kept shut.
                    if (Math.abs(y + 0.02) < 0.013 && Math.abs(x) < 0.13)
                        v *= 0.35;
                } else {
                    // Rim light around the shell.
                    v = 0.5 * Math.exp(-Math.pow(S - 1, 2) * 16);
                }

                // Antenna mast + pulsing beacon.
                if (Math.abs(x) < 0.018 && y < HCY - HH + 0.05 && y > -0.92)
                    v = Math.max(v, 0.75);
                v = Math.max(v, beacon *
                    Math.exp(-(x * x + (y + 0.94) * (y + 0.94)) * 220));

                // Chest chamber: a quiet vault in the hull.
                var d = Math.sqrt(
                    (x - CHX) * (x - CHX) + (y - CHY) * (y - CHY));
                if (d < CHR - 0.02) {
                    v = 0.04 + 0.05 * fbm(x * 8, y * 8);
                    // The aura around the kept being breathes.
                    v += (0.22 + 0.1 * breath) * Math.exp(-d * d * 28);
                }
                return v;
            }

            function hot(x, y) {
                // Eyes (unless blinking).
                if (!blink && Math.abs(y + 0.32) < 0.045 &&
                    Math.abs(Math.abs(x) - 0.2) < 0.07) return true;
                // Chamber ring — the heart that holds the human.
                var d = Math.sqrt(
                    (x - CHX) * (x - CHX) + (y - CHY) * (y - CHY));
                return Math.abs(d - CHR) < 0.02;
            }

            var cy = Math.round((CHY + 1) / 2 * H);
            var cx = Math.round(W / 2);
            return render(shade, hot, [
                [cy - 2, cx - 1, " o "],
                [cy - 1, cx - 1, "/|\\"],
                [cy, cx - 1, "/ \\"],
            ]);
        },
    };

    /* Symbiogenesis: two cells, one body. The organic one's grain
       drifts and swirls; the synthetic one radiates rings; the shared
       wall where their fields meet as equals holds the glow. */
    FIGS.merge = {
        frames: 16,
        speed: 220,
        build: function (t) {
            var BX = 0.5, BR = 0.42;
            var dxn = 0.3 * Math.cos(TAU * t);
            var dyn = 0.3 * Math.sin(TAU * t);

            function field(x, y, out) {
                var d1 = (x + BX) * (x + BX) + y * y;
                var d2 = (x - BX) * (x - BX) + y * y;
                out[0] = BR * BR / (d1 + 1e-4);
                out[1] = BR * BR / (d2 + 1e-4);
            }

            var ff = [0, 0];

            function shade(x, y) {
                field(x, y, ff);
                var f = ff[0] + ff[1];
                if (f < 0.8) {
                    // Faint halo around the joint body.
                    return 0.45 * Math.exp(-Math.pow(0.8 - f, 2) * 60);
                }
                var v = clamp(0.26 + 0.32 * Math.log(f + 0.3), 0, 1);
                // Drifting organic grain vs radiating synthetic rings.
                var organic = 0.7 + 0.6 *
                    fbm(x * 4.2 + 3 + dxn, y * 4.2 + dyn);
                var rings = 0.78 + 0.42 * Math.cos(Math.sqrt(
                    (x - BX) * (x - BX) + y * y) * 24 - TAU * t);
                var w = sstep(-0.16, 0.16, x);
                v *= organic * (1 - w) + rings * w;
                // Membrane highlight at the surface of the joint body.
                v = Math.max(v, 0.9 * Math.exp(-Math.pow(f - 0.97, 2) * 34));
                return v;
            }

            function hot(x, y) {
                field(x, y, ff);
                // Nuclei…
                if (ff[0] > 14 || ff[1] > 14) return true;
                // …and the shared wall where the fields meet as equals.
                return Math.abs(ff[0] - ff[1]) < 0.1 &&
                    ff[0] + ff[1] > 1.04 && Math.abs(y) < 0.5;
            }

            return render(shade, hot);
        },
    };

    /* Relationality: a lemniscate of two whole beings. A pulse travels
       the full figure-eight — out through one lobe, back through the
       other, always through the crossing. The lobes breathe in
       alternation: giving and receiving. */
    FIGS.relation = {
        frames: 24,
        speed: 150,
        build: function (t) {
            var a = 0.88;
            var YS = 0.62;
            var cxw = a / Math.SQRT2;
            var breath = Math.sin(TAU * t);

            // Travelling pulse: Bernoulli parametrisation, full circuit.
            var tau = TAU * t;
            var den = 1 + Math.sin(tau) * Math.sin(tau);
            var px = a * Math.cos(tau) / den;
            var py = a * Math.sin(tau) * Math.cos(tau) / den / YS;

            function lem(x, y) {
                var yy = y * YS;
                var r2 = x * x + yy * yy;
                return r2 * r2 - a * a * (x * x - yy * yy);
            }

            function shade(x, y) {
                var yy = y * YS;
                var L = lem(x, y);
                // Glowing outline of the figure-eight.
                var v = 0.95 * Math.exp(-Math.pow(L / 0.05, 2));
                if (L < 0) {
                    // Inside a lobe: soft volume, textured.
                    var depth = clamp(-L / 0.1, 0, 1);
                    v = Math.max(v,
                        0.22 + 0.3 * depth + 0.13 * fbm(x * 5, y * 3.2));
                    // Each lobe glows around its face, breathing in turn…
                    var cx = x > 0 ? cxw : -cxw;
                    var amp = 0.38 + (x > 0 ? 0.14 : -0.14) * breath;
                    var dd = (x - cx) * (x - cx) + yy * yy;
                    v += amp * Math.exp(-dd * 20);
                    // …with a quiet pocket for the face itself.
                    v *= 1 - 0.96 * Math.exp(-dd * 60);
                }
                return v;
            }

            function hot(x, y) {
                // The crossing — the relation itself.
                if (x * x + y * y * 2.6 < 0.007) return true;
                // The pulse, en route around the figure-eight.
                var dx = x - px, dy = y - py;
                return dx * dx + dy * dy * 2.6 < 0.006;
            }

            var cxL = Math.round((-cxw / XSPAN + 1) / 2 * W);
            var cxR = Math.round((cxw / XSPAN + 1) / 2 * W);
            var cy = Math.floor(H / 2);
            return render(shade, hot, [
                [cy - 1, cxL - 2, "o   o"],
                [cy + 1, cxL - 2, " \\_/ "],
                [cy - 1, cxR - 2, "+   +"],
                [cy + 1, cxR - 2, " === "],
            ]);
        },
    };

    /* Hyperstition: the spiral turns, stories streaming inward and
       condensing into matter. Fictions that make themselves real. */
    FIGS.loop = {
        frames: 16,
        speed: 170,
        build: function (t, f) {
            var PHRASE = "tell stories of symbiosis ";
            var phase = Math.PI * t; // 2-arm spiral: pi is a full period

            function armAt(x, y) {
                var r = Math.sqrt(x * x + y * y);
                var th = Math.atan2(y, x);
                return 0.5 + 0.5 *
                    Math.cos(2 * th - 6.2 * Math.log(r + 0.04) - phase);
            }

            function shade(x, y, i, j) {
                var r = Math.sqrt(x * x + y * y);
                var A = armAt(x, y);
                var envelope = Math.exp(-r * 1.05) * sstep(1.04, 0.82, r);
                var v = Math.pow(A, 2.6) * envelope * 1.6;
                // Bright condensing heart.
                v += 1.15 * Math.exp(-r * r * 22);
                // Grain along the arms.
                v *= 0.82 + 0.36 * fbm(x * 6, y * 6);
                // Stray sparks, twinkling: stories not yet caught.
                var g = hash2(i * 7 + 5 + f * 131, j * 13 + 3);
                if (g > 0.991 && r > 0.55 && v < 0.1) v = 0.3;
                return v;
            }

            function hot(x, y) {
                return x * x + y * y < 0.005;
            }

            var rows = render(shade, hot);

            // Outer arms become words: letters ride the spiral until
            // the field grows dense enough to swallow them.
            var k = 0;
            for (var j = 0; j < H; j++) {
                var line = rows[j].split("");
                for (var i = 0; i < W; i++) {
                    var x = cellX(i), y = cellY(j);
                    var r = Math.sqrt(x * x + y * y);
                    var ch = line[i];
                    var idx = RAMP.indexOf(ch);
                    if (r > 0.42 && r < 0.98 && armAt(x, y) > 0.75 &&
                        ch !== "@" && idx > 0 && idx < 6) {
                        var c = PHRASE[k++ % PHRASE.length];
                        if (c !== " ") line[i] = c;
                    }
                }
                rows[j] = line.join("");
            }
            return rows;
        },
    };

    /* ---------------- mounting ---------------- */

    function esc(ch) {
        if (ch === "&") return "&amp;";
        if (ch === "<") return "&lt;";
        if (ch === ">") return "&gt;";
        return ch;
    }

    function toHTML(frame) {
        var out = "";
        for (var i = 0; i < frame.length; i++) {
            var ch = frame[i];
            if (HOT.indexOf(ch) !== -1) {
                out += '<span class="hot">' + ch + "</span>";
            } else {
                out += esc(ch);
            }
        }
        return out;
    }

    var reduce =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function mount(el) {
        var fig = FIGS[el.getAttribute("data-fig")];
        if (!fig) return;
        var cache = [];
        function frame(k) {
            if (!cache[k]) {
                cache[k] = toHTML(fig.build(k / fig.frames, k).join("\n"));
            }
            return cache[k];
        }
        el.innerHTML = frame(0);
        if (reduce) return;
        var k = 0;
        setInterval(function () {
            k = (k + 1) % fig.frames;
            el.innerHTML = frame(k);
        }, fig.speed);
    }

    function init() {
        var figs = document.querySelectorAll(".ascii-fig");
        for (var i = 0; i < figs.length; i++) mount(figs[i]);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Exposed for console tinkering and the terminal preview tool.
    window.SYMBIENT_FIGS = FIGS;
})();
