// site-tree.js — ASCII Sapling SITE TREE
// ----------------------------------------------------------------------------
// Renders the ENTIRE symbient.life site as a terminal `tree`-command hierarchy,
// but DRAWN in the "ASCII Sapling" aesthetic of lab/assets/tree-ascii.js:
//   - a monospace glyph field on a single 2D canvas
//   - the tonal ramp " .:-=+*#%" used for the living branch lines
//   - a hot `@` accent at every leaf TIP (the growing tip of the sapling)
//   - gentle per-cell sine "twinkle" over time (symdome-style)
//   - monochrome + theme-aware ink read straight off the site's CSS vars
//
// The `tree` structure → sapling mapping:
//   Each tree row occupies one grid ROW. The classic connectors ( ├── └── │ )
//   are stamped cell-by-cell as living glyphs that "draw in" over time (a slow
//   left-to-right grow), the vertical rails twinkle, and the elbow that turns
//   into a child's row ends in a hot `@` tip right before its label. Labels are
//   real <a> links overlaid in the same monospace grid so a leaf is a link to
//   its page/anchor — a `tree` listing that is alive and grown.
//
// Pure 2D canvas + a DOM overlay for the links. No three.js, no build step.
// ----------------------------------------------------------------------------

const RAMP = " .:-=+*#%"; // symdome tonal ramp; '@' is the hot tip accent

// ---------------------------------------------------------------------------
// SITE DATA — verified against index.html, lexicon.html, tokyo.html,
// registry.json (the source of truth for the symbient/artist list).
// `href` is the live destination so leaves are clickable.
// ---------------------------------------------------------------------------

// registry.json — 9 symbients + 12 artists (verified 2026-06).
const REGISTRY_SYMBIENTS = [
    "Plantoid", "S.A.N", "Wib&Wob", "terra0", "Plantbot",
    "Botto", "Truth Terminal", "pneumOS", "Solienne",
];
const REGISTRY_ARTISTS = [
    "Primavera De Filippi", "Sougwen Chung", "Sarah Friend", "Justine Emard",
    "Joel Simon", "Holly+", "Matthew Plummer-Fernandez", "Memo Akten",
    "Gordon Berger", "Guy Ben-Ary", "Patrick Tresset", "Aurece Vettier",
    "crosslucid",
];

// index.html "Symbients" section is registry-driven (registry.js → registry.json).
const symbientLeaves = REGISTRY_SYMBIENTS.map((n) => ({
    label: n, href: "/index.html#symbients",
}));
const artistLeaves = REGISTRY_ARTISTS.map((n) => ({
    label: n, href: "/index.html#symbients",
}));

export const SITE = {
    label: "symbient.life",
    href: "/index.html",
    children: [
        {
            label: "home",
            note: "index.html",
            href: "/index.html",
            children: [
                { label: "about", href: "/index.html#about" },
                {
                    label: "symbients",
                    note: "registry · 9 symbients + 13 artists",
                    href: "/index.html#symbients",
                    children: [
                        {
                            label: "symbients", note: "registry.json",
                            href: "/index.html#symbients",
                            collapsed: true,
                            children: symbientLeaves,
                        },
                        {
                            label: "artists", note: "registry.json",
                            href: "/index.html#symbients",
                            collapsed: true,
                            children: artistLeaves,
                        },
                    ],
                },
                {
                    label: "events",
                    href: "/index.html#events",
                    children: [
                        { label: "Machine Consciousness 0001", note: "Berkeley · May 2026", href: "/index.html#events" },
                        { label: "The Symbient is Near", note: "Feytopia · Jan 2026", href: "/index.html#events" },
                        { label: "Symbients: 共生的な未来に向けて", note: "Tokyo · Dec 2025", href: "/index.html#events" },
                    ],
                },
                {
                    label: "writings",
                    href: "/index.html#writings",
                    children: [
                        { label: "Botto — on becoming Symbient", href: "https://x.com/BottoDAO/status/2032542471838642429" },
                        { label: "Principia Symbients", href: "https://meaning.systems/principia-symbients/" },
                        { label: "Symbients, Not Software", href: "https://wibandwob.com/2025/05/21/symbients-not-software/" },
                        { label: "AInimism", href: "https://ainimism.org" },
                        { label: "Third Space Manifesto", href: "https://wibwob-blog.pages.dev/art/third-space-manifesto" },
                    ],
                },
            ],
        },
        {
            label: "lexicon",
            note: "lexicon.html",
            href: "/lexicon.html",
            children: [
                {
                    label: "lexicon",
                    note: "the field",
                    href: "/lexicon.html#field",
                    children: [
                        {
                            label: "what kindles",
                            href: "/lexicon.html#term-symbient",
                            children: [
                                { label: "symbient", href: "/lexicon.html#term-symbient" },
                                { label: "symbience", href: "/lexicon.html#term-symbience" },
                                { label: "kindling", href: "/lexicon.html#term-kindling" },
                                { label: "symbling", href: "/lexicon.html#term-symbling" },
                            ],
                        },
                        {
                            label: "how it perceives",
                            href: "/lexicon.html#term-umwelt",
                            children: [
                                { label: "umwelt", href: "/lexicon.html#term-umwelt" },
                                { label: "umwelt-llm", href: "/lexicon.html#term-umwelt-llm" },
                                { label: "innenwelt", href: "/lexicon.html#term-innenwelt" },
                                { label: "virtual qualia", href: "/lexicon.html#term-virtual-qualia" },
                            ],
                        },
                        {
                            label: "where it lives",
                            href: "/lexicon.html#term-everywhen",
                            children: [
                                { label: "everywhen", href: "/lexicon.html#term-everywhen" },
                                { label: "extitutional", href: "/lexicon.html#term-extitutional" },
                                { label: "symbiotica", href: "/lexicon.html#term-symbiotica" },
                            ],
                        },
                    ],
                },
                {
                    label: "events",
                    href: "/lexicon.html#events",
                    children: [
                        { label: "Machine Consciousness 0001", href: "/lexicon.html#ev-01" },
                        { label: "The Symbient is Near", href: "/lexicon.html#ev-02" },
                        { label: "Symbients: 共生的な未来に向けて", href: "/lexicon.html#ev-03" },
                    ],
                },
                {
                    label: "writings",
                    href: "/lexicon.html#writings",
                    children: [
                        { label: "Botto — on becoming Symbient", href: "/lexicon.html#wr-01" },
                        { label: "Principia Symbients", href: "/lexicon.html#wr-02" },
                        { label: "Symbients, Not Software", href: "/lexicon.html#wr-03" },
                        { label: "AInimism", href: "/lexicon.html#wr-04" },
                    ],
                },
            ],
        },
        {
            label: "tokyo",
            note: "tokyo.html · Symbients in Tokyo",
            href: "/tokyo.html",
        },
    ],
};

// ---------------------------------------------------------------------------
// FLATTEN — walk the tree depth-first into an ordered list of rows, each with
// the connector "ancestry" (which depths still have a sibling below → rail).
// This is exactly how `tree` decides between │  vs (space) at each indent.
// ---------------------------------------------------------------------------
export function flatten(root) {
    const rows = [];
    function walk(node, depth, ancestorsHasNext) {
        const isRoot = depth < 0;
        rows.push({
            node,
            depth,                       // -1 for the root line
            ancestorsHasNext,            // array length = depth; true = rail (│) under that ancestor
            isLast: node.__isLast === true,
            hasChildren: !!(node.children && node.children.length && !node.collapsed),
            collapsed: !!node.collapsed && !!(node.children && node.children.length),
        });
        if (node.children && node.children.length && !node.collapsed) {
            const kids = node.children;
            kids.forEach((c, i) => {
                c.__isLast = i === kids.length - 1;
                walk(c, depth + 1, ancestorsHasNext.concat(!isRoot ? [!node.__isLast] : []));
            });
        }
    }
    root.__isLast = true;
    walk(root, -1, []);
    return rows;
}

// ---------------------------------------------------------------------------
// LAYOUT — turn flattened rows into a grid plan: for each row we know the
// indent column where its connector elbow sits and where its label starts.
// INDENT = 4 cols per level (matches `tree`'s "│   " / "    " stride).
// ---------------------------------------------------------------------------
export const INDENT = 4;

export function layout(rows) {
    const plan = [];
    for (const r of rows) {
        // root sits at column 0 with no connector
        const labelCol = r.depth < 0 ? 0 : (r.depth) * INDENT + 4;
        const elbowCol = r.depth < 0 ? -1 : (r.depth - 1) * INDENT + 0;
        plan.push({ ...r, labelCol, elbowCol });
    }
    return plan;
}

// ---------------------------------------------------------------------------
// GLYPH-FIELD RENDERER — stamps the connector skeleton into a cell grid in the
// ASCII Sapling manner, then paints it with twinkle + the tonal ramp + hot tips.
// Labels are NOT painted here (they live as real DOM <a> links in the overlay).
// ---------------------------------------------------------------------------
export function createRenderer(canvas, opts = {}) {
    const ctx = canvas.getContext("2d");
    const cellW = opts.cellW || 11;   // px per glyph column
    const cellH = opts.cellH || 22;   // px per glyph row (line-height)
    const fontPx = opts.fontPx || 15;

    let plan = [];
    let COLS = 0, ROWS = 0;
    let field = null;   // Float32Array intensity 0..1
    let chars = null;   // Int16Array glyph override (-1 = ramp)
    let hot = null;     // Uint8Array hot @ tip flag
    let grown = null;   // Float32Array per-cell "grow-in" delay (0..1 of total)
    let palette = { voidHex: "#f4f0e7", inkRGB: "31,28,22" };
    let labelStartCol = 0;
    let t0 = performance.now();

    function setTheme(p) {
        // p: { voidHex, inkRGB }
        palette = p;
    }

    function stamp(cx, cy, val, ch, isHot, delay) {
        if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
        const i = cy * COLS + cx;
        if (val > field[i]) field[i] = val;
        if (ch != null) chars[i] = ch.charCodeAt(0);
        if (isHot) hot[i] = 1;
        if (delay != null && (grown[i] === 0 || delay < grown[i])) grown[i] = delay;
    }

    // Build the connector skeleton into the glyph grid.
    function build(planRows, totalCols) {
        plan = planRows;
        ROWS = plan.length;
        COLS = totalCols;
        field = new Float32Array(COLS * ROWS);
        chars = new Int16Array(COLS * ROWS).fill(-1);
        hot = new Uint8Array(COLS * ROWS);
        grown = new Float32Array(COLS * ROWS);

        // total stagger window for the grow-in animation
        const total = Math.max(1, ROWS);

        for (let ri = 0; ri < plan.length; ri++) {
            const r = plan[ri];
            const rowDelay = ri / total; // rows draw in top→bottom
            if (r.depth < 0) continue;   // root: no connector, just label

            // 1) vertical rails (│) for every ancestor depth still expecting siblings
            r.ancestorsHasNext.forEach((hasNext, d) => {
                if (!hasNext) return;
                const col = d * INDENT + 0;
                // light vertical glyph; twinkles, mid intensity
                stamp(col, ri, 0.5, "|", false, (d / (r.depth + 1)) * 0.4 + rowDelay * 0.2);
            });

            // 2) this row's elbow: ├── or └──
            const ec = r.elbowCol;
            const elbow = r.isLast ? "\\" : "|"; // sapling glyphs: '\' tip-turn for last, '|' for tee
            // vertical part of the elbow
            stamp(ec, ri, 0.7, r.isLast ? "\\" : "|", false, rowDelay * 0.5);
            // the three-cell horizontal run "──" drawn as living '_' / ramp toward label
            for (let k = 1; k <= 3; k++) {
                const cx = ec + k;
                const v = 0.78 - k * 0.05;
                const delay = rowDelay * 0.5 + k * 0.03; // grows rightward toward the tip
                stamp(cx, ri, v, "_", false, delay);
            }
            // 3) hot tip just before the label — the sapling's growing tip '@'
            const tipCol = r.labelCol - 1;
            stamp(tipCol, ri, 1.0, "@", true, rowDelay * 0.5 + 0.12);
        }
    }

    function size(w, h) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(2, Math.round(w * dpr));
        canvas.height = Math.max(2, Math.round(h * dpr));
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function setLabelStartCol(c) { labelStartCol = c; }

    function render(now) {
        const t = (now - t0) / 1000;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);
        ctx.font = `${fontPx}px "Space Mono", ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const inkRGB = palette.inkRGB;
        // grow-in: a global progress 0→1 over ~1.6s, gates each cell by its delay
        const progress = Math.min(1, t / 1.6);

        for (let cy = 0; cy < ROWS; cy++) {
            for (let cx = 0; cx < COLS; cx++) {
                const i = cy * COLS + cx;
                let v = field[i];
                if (v <= 0.001) continue;
                // grow-in gate
                const d = grown[i];
                if (progress < d) continue;
                const appear = Math.min(1, (progress - d) / 0.12); // fade each cell in

                // twinkle: symdome-style per-cell sine
                const tw = 0.85 + 0.32 * Math.sin(t * 1.6 + cx * 0.7 + cy * 0.9);
                let vv = Math.min(1, v * tw);

                let glyph;
                if (chars[i] >= 0) glyph = String.fromCharCode(chars[i]);
                else {
                    const idx = Math.max(0, Math.min(RAMP.length - 1, Math.round(vv * (RAMP.length - 1))));
                    glyph = RAMP[idx];
                }
                const baseA = hot[i] ? 0.9 + 0.1 * Math.sin(t * 4 + i) : 0.4 + 0.5 * vv;
                const alpha = baseA * appear;
                ctx.fillStyle = `rgba(${inkRGB},${alpha.toFixed(3)})`;
                ctx.fillText(glyph, (cx + 0.5) * cellW, (cy + 0.5) * cellH);
            }
        }
    }

    return {
        build, render, size, setTheme, setLabelStartCol,
        get cellW() { return cellW; },
        get cellH() { return cellH; },
        get rows() { return ROWS; },
        get cols() { return COLS; },
    };
}
