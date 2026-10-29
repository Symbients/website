// nav.js: the site's tab list, kept in one place. One tab per page; the home
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
