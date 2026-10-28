// nav.js: the site's tab list, kept in one place.
//
// Each page carries an empty nav and loads this file straight after it, without
// defer, so the tabs exist before the page's own scripts (scroll-spy, burger) run:
//
//   <nav class="site-nav" id="site-nav" aria-label="sections" data-page="registry"></nav>
//   <script src="/nav.js"></script>
//
// data-page: "home" (index.html: section tabs scroll in place, page tabs carry ↗),
// or the name of a page tab below (that tab is marked active).
(function () {
    const nav = document.getElementById("site-nav");
    if (!nav) return;
    const page = nav.dataset.page || "";
    const home = page === "home";

    // sections of index.html, in page order (scroll-spy tracks these #sec-* links)
    const SECTIONS = [
        ["home", "sec-home"],
        ["narrative", "sec-narrative"],
        ["symbients", "sec-symbients"],
        // ["lexicon", "sec-lexicon"], // section temporarily disabled
        ["events", "sec-events"],
        ["writings", "sec-writings"],
        ["organics", "sec-organics"],
        // ["tree", "sec-tree"], // section temporarily disabled
    ];
    // separate pages
    const PAGES = [
        ["registry", "/registry.html"],
        ["timeline", "/timeline.html"],
    ];

    const tab = (label, href, current) =>
        '<a class="tab' + (current ? " active" : "") + '" href="' + href + '"' +
        (current ? ' aria-current="page"' : "") + ">" + label + "</a>";

    nav.innerHTML =
        SECTIONS.map(([label, id]) => tab(label, (home ? "#" : "/#") + id, false)).join("") +
        PAGES.map(([label, href]) => tab(home ? label + "&nbsp;↗" : label, href, label === page)).join("");
})();
