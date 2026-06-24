// registry.js — renders the filterable symbient/artist directory from
// registry.json into any page that provides the markup. Single guarded IIFE,
// like the other shared scripts; it silently bails on pages without a
// #registry-grid (so it's safe to load anywhere). The initial filter is taken
// from whichever .registry-filter button carries .is-active in the HTML, so a
// page can default to "all", "symbient" or "artist" purely in markup.
(function () {
    const grid = document.getElementById("registry-grid");
    if (!grid) return;

    const countEl = document.querySelector(".registry-count");
    const emptyEl = document.querySelector(".registry-empty");
    const searchInput = document.getElementById("registry-q");
    const filterBtns = Array.from(
        document.querySelectorAll(".registry-filter"),
    );

    let entries = [];
    const initialBtn = filterBtns.find((b) =>
        b.classList.contains("is-active"),
    );
    let activeFilter = initialBtn ? initialBtn.dataset.filter : "all";
    let query = "";

    const norm = (s) => (s || "").toLowerCase();

    // Display label for the kind badge, keyed by `type`.
    const TYPE_LABELS = {
        symbient: "Symbient",
        artist: "Artist",
        researcher: "Researcher",
    };

    // An entry's `type` may be a single string ("artist") or an array of
    // kinds (["artist", "researcher"]). Normalise to an array everywhere.
    const typesOf = (e) =>
        (Array.isArray(e.type) ? e.type : [e.type]).filter(Boolean);

    // Initials for the monogram placeholder used by entries with no image
    // (e.g. researchers): first + last word initial, or first two letters.
    function initials(name) {
        const parts = (name || "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "?";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    // The card grid is the same on every page that uses the registry, so the
    // responsive `sizes` is a shared constant rather than repeated per entry.
    const IMG_SIZES =
        "(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 33vw";

    // Inline brand glyphs (24×24, currentColor). Anything we don't
    // recognise falls back to a generic globe.
    const ICONS = {
        x: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/>',
        instagram:
            '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>',
        youtube:
            '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',
        github: '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>',
        linkedin:
            '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>',
        facebook:
            '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>',
        bluesky:
            '<path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.479 0-.688-.139-1.86-.902-2.203-.659-.299-1.664-.621-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/>',
        substack:
            '<path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>',
        mastodon:
            '<path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z"/>',
        tiktok: '<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>',
        vimeo: '<path d="M23.9765 6.4168c-.105 2.338-1.739 5.5429-4.894 9.6088-3.2679 4.247-6.0258 6.3699-8.2898 6.3699-1.409 0-2.578-1.294-3.553-3.881l-1.9179-7.1138c-.719-2.584-1.488-3.878-2.312-3.878-.179 0-.806.378-1.881 1.132L0 7.3258c1.219-1.0791 2.426-2.1581 3.616-3.234C5.231 2.7158 6.4488 1.9758 7.2668 1.9008c1.939-.187 3.131 1.139 3.581 3.978.487 3.067.825 4.974 1.013 5.72.563 2.587 1.181 3.878 1.856 3.878.525 0 1.313-.825 2.366-2.475 1.05-1.65 1.613-2.913 1.688-3.787.15-1.425-.413-2.138-1.688-2.138-.6 0-1.219.138-1.856.413 1.219-3.999 3.556-5.942 7.012-5.829 2.563.075 3.772 1.735 3.625 4.984z"/>',
        medium: '<path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>',
        discord:
            '<path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>',
        email: '<path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z"/><path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z"/>',
        globe: '<g fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9.25"/><path d="M2.75 12h18.5M12 2.75c2.5 2.5 3.75 5.75 3.75 9.25S14.5 18.75 12 21.25M12 2.75c-2.5 2.5-3.75 5.75-3.75 9.25S9.5 18.75 12 21.25"/></g>',
    };

    function platformKey(label) {
        const l = norm(label);
        if (l.indexOf("instagram") !== -1) return "instagram";
        if (l === "x" || l.indexOf("twitter") !== -1) return "x";
        if (l.indexOf("youtube") !== -1) return "youtube";
        if (l.indexOf("github") !== -1) return "github";
        if (l.indexOf("linkedin") !== -1) return "linkedin";
        if (l.indexOf("facebook") !== -1) return "facebook";
        if (l.indexOf("bluesky") !== -1) return "bluesky";
        if (l.indexOf("substack") !== -1) return "substack";
        if (l.indexOf("mastodon") !== -1) return "mastodon";
        if (l.indexOf("tiktok") !== -1) return "tiktok";
        if (l.indexOf("vimeo") !== -1) return "vimeo";
        if (l.indexOf("medium") !== -1) return "medium";
        if (l.indexOf("discord") !== -1) return "discord";
        if (l.indexOf("email") !== -1 || l.indexOf("mail") !== -1)
            return "email";
        return "globe";
    }

    // Resolve a social entry to a real href, or null if it's just
    // a descriptive note (e.g. "OpenSea NFT collections").
    function socialHref(s) {
        const u = (s.url || "").trim();
        if (/^https?:\/\//i.test(u) || /^mailto:/i.test(u)) return u;
        if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u)) return "mailto:" + u;
        return null;
    }

    // Build the searchable haystack for one entry.
    const haystack = (e) =>
        norm(
            [
                e.name,
                typesOf(e).join(" "),
                e.category,
                e.description,
                e.location,
                e.creator_or_steward,
                (e.socials || []).map((s) => s.label).join(" "),
            ].join(" "),
        );

    function makeCard(e) {
        const card = document.createElement("div");
        card.className = "example-item registry-card";
        card.dataset.type = typesOf(e).join(" ");
        card.dataset.search = haystack(e);

        // Main click target → the entity's primary website.
        const main = document.createElement("a");
        main.className = "registry-main";
        main.href = e.website || "#";
        main.target = "_blank";
        main.rel = "noopener";

        const imgWrap = document.createElement("div");
        imgWrap.className = "example-image";
        const img = document.createElement("img");
        img.src = e.image;
        img.alt = e.name + " — " + e.category;
        img.loading = "lazy";
        img.decoding = "async";
        // Entries with a `sources` object (the symbients, which have
        // avif/webp/multi-size variants on disk) render as a <picture> for
        // sharp, light images; entries with a plain `image` fall back to an
        // <img>; entries with neither (e.g. researchers) get a monogram.
        const src = e.sources;
        if (!src && !e.image) {
            imgWrap.classList.add("registry-monogram");
            const mono = document.createElement("span");
            mono.setAttribute("aria-hidden", "true");
            mono.textContent = initials(e.name);
            imgWrap.appendChild(mono);
        } else if (src) {
            const picture = document.createElement("picture");
            [
                ["image/avif", src.avif],
                ["image/webp", src.webp],
            ].forEach(([type, srcset]) => {
                if (!srcset) return;
                const source = document.createElement("source");
                source.type = type;
                source.srcset = srcset;
                source.sizes = IMG_SIZES;
                picture.appendChild(source);
            });
            if (src.fallback) {
                img.srcset = src.fallback;
                img.sizes = IMG_SIZES;
            }
            if (src.width) img.width = src.width;
            if (src.height) img.height = src.height;
            picture.appendChild(img);
            imgWrap.appendChild(picture);
        } else {
            imgWrap.appendChild(img);
        }

        const text = document.createElement("div");
        text.className = "example-text";

        const arrow = document.createElement("span");
        arrow.className = "example-arrow";
        arrow.textContent = "↗";

        const name = document.createElement("span");
        name.className = "example-name";
        name.textContent = e.name;

        const cat = document.createElement("div");
        cat.className = "example-pron";
        cat.textContent = e.category;

        const desc = document.createElement("p");
        desc.className = "example-desc";
        desc.textContent = e.description;

        text.append(arrow, name, cat, desc);

        // Meta line: one kind badge per type · steward.
        const meta = document.createElement("div");
        meta.className = "registry-meta";
        typesOf(e).forEach((t) => {
            const badge = document.createElement("span");
            badge.className = "registry-badge";
            badge.dataset.type = t;
            badge.textContent = TYPE_LABELS[t] || t;
            meta.appendChild(badge);
        });
        if (e.creator_or_steward) {
            const s = document.createElement("span");
            s.className = "registry-meta-bit";
            s.textContent = "by " + e.creator_or_steward;
            meta.appendChild(s);
        }
        text.appendChild(meta);

        main.append(imgWrap, text);
        card.appendChild(main);

        // Socials row — icon links, siblings of the main link (no
        // nested <a>). The card body already links to the website,
        // so that one is skipped here. Non-link notes are dropped.
        const socials = (e.socials || [])
            .filter((s) => s.label !== "Website")
            .map((s) => ({ s, href: socialHref(s) }))
            .filter((x) => x.href);
        if (socials.length) {
            const row = document.createElement("div");
            row.className = "registry-socials";
            socials.forEach(({ s, href }) => {
                const key = platformKey(s.label);
                const a = document.createElement("a");
                a.href = href;
                if (href.indexOf("mailto:") !== 0) {
                    a.target = "_blank";
                    a.rel = "noopener";
                }
                a.setAttribute("aria-label", s.label);
                a.title = s.label;
                a.innerHTML =
                    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
                    ICONS[key] +
                    "</svg>";
                row.appendChild(a);
            });
            card.appendChild(row);
        }

        return card;
    }

    function render() {
        const frag = document.createDocumentFragment();
        let shown = 0;
        entries.forEach((e) => {
            const matchesType =
                activeFilter === "all" || typesOf(e).includes(activeFilter);
            const matchesQuery =
                !query || haystack(e).indexOf(query) !== -1;
            if (matchesType && matchesQuery) {
                frag.appendChild(e._card);
                shown++;
            }
        });
        grid.replaceChildren(frag);

        const total = entries.length;
        if (countEl) {
            countEl.textContent =
                shown === total
                    ? total + " entries"
                    : shown + " of " + total + " entries";
        }
        if (emptyEl) emptyEl.hidden = shown !== 0;
    }

    function setFilter(f) {
        activeFilter = f;
        filterBtns.forEach((b) => {
            const on = b.dataset.filter === f;
            b.classList.toggle("is-active", on);
            b.setAttribute("aria-pressed", String(on));
        });
        render();
    }

    filterBtns.forEach((b) =>
        b.addEventListener("click", () => setFilter(b.dataset.filter)),
    );

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            query = norm(searchInput.value).trim();
            render();
        });
    }

    const resetBtn = document.querySelector(".registry-reset");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            query = "";
            setFilter(initialBtn ? initialBtn.dataset.filter : "all");
        });
    }

    fetch("registry.json")
        .then((r) => {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
        })
        .then((data) => {
            entries = data;
            entries.forEach((e) => (e._card = makeCard(e)));
            render();
        })
        .catch((err) => {
            if (countEl) countEl.textContent = "Could not load the registry.";
            console.error("registry load failed:", err);
        });
})();
