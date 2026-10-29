// nav.js: the site's tab list and footer, kept in one place. One tab per page; the home
// page's sections are reached by scrolling, not from the bar.
//
// Each page carries the nav and loads this file straight after it, without
// defer, so the tabs exist before the page's own scripts (burger menu) run:
//
//   <nav class="site-nav" id="site-nav" aria-label="pages" data-page="registry">
//       <a class="tab" href="/">home</a> … registry, timeline   (fallback without JavaScript)
//   </nav>
//   <script src="/nav.js"></script>
//
// data-page names the current page; its tab is marked active. To add a page
// (about, contact), add a line to PAGES.
(function () {
    const nav = document.getElementById("site-nav");
    if (!nav) return;
    const page = nav.dataset.page || "";

    const PAGES = [
        ["home", "/"],
        ["registry", "/registry.html"],
        ["timeline", "/timeline.html"],
    ];

    nav.innerHTML = PAGES.map(([label, href]) => {
        const on = label === page;
        return (
            '<a class="tab' + (on ? " active" : "") + '" href="' + href + '"' +
            (on ? ' aria-current="page"' : "") + ">" + label + "</a>"
        );
    }).join("");
})();

// ---- the site footer: a map of the site, the socials and the credit ----
//
// Each page carries <footer class="page-foot" id="site-foot" data-page="…"> with the
// credit as static HTML (the fallback without JavaScript). Children marked
// class="foot-keep" (the timeline's version line) are kept and moved to the end.
(function () {
    function build() {
        const foot = document.getElementById("site-foot");
        if (!foot) return;
        const home = foot.dataset.page === "home";
        const keep = [...foot.querySelectorAll(".foot-keep")];

        // the home page's sections, in page order
        const SECTIONS = [
            ["narrative", "sec-narrative"],
            ["symbients", "sec-symbients"],
            ["events", "sec-events"],
            ["writings", "sec-writings"],
            ["organics", "sec-organics"],
        ];
        const PAGES = [
            ["home", "/"],
            ["registry", "/registry.html"],
            ["timeline", "/timeline.html"],
        ];
        // machine-readable copies of the site
        const DATA = [
            ["llms.txt", "/llms.txt"],
            ["registry.json", "/registry.json"],
            ["timeline.json", "/timeline.json"],
        ];
        const SOCIAL = [
            ["X", "https://x.com/symbients", "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"],
            ["GitHub", "https://github.com/Symbients", "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"],
            ["Discord", "https://discord.gg/U4a2SmES6A", "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9459 2.4189-2.1568 2.4189Z"],
        ];

        const a = ([label, href]) => '<a href="' + href + '">' + label + "</a>";
        const row = (k, items) =>
            '<p class="foot-row"><span class="foot-k">' + k + "</span> " + items.map(a).join(" · ") + "</p>";
        const icon = ([label, href, d]) =>
            '<a href="' + href + '" target="_blank" rel="noopener" aria-label="' + label + '">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' +
            d + '"/></svg></a>';

        foot.innerHTML =
            '<nav class="foot-map" aria-label="site map">' +
            row("home", SECTIONS.map(([l, id]) => [l, (home ? "#" : "/#") + id])) +
            row("pages", PAGES) +
            row("for machines", DATA) +
            "</nav>" +
            '<p class="foot-credit">◈ <a href="https://glitchart.org" target="_blank" rel="noopener">Symbient Research Unit</a> ©2025 ◈' +
            '<span class="foot-social">' + SOCIAL.map(icon).join("") + "</span></p>";
        keep.forEach((el) => foot.appendChild(el));
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
    else build();
})();
