/* ----------------------------------------------------------------------
   reveal.js — scroll-triggered section reveals.

   Tags every below-the-fold <section> (and section divider) with .reveal,
   then promotes each to .is-visible the first time it approaches the
   viewport, so sections arrive as the reader reaches them instead of all
   animating at page load. The classes are only added from here: without
   JS, or under prefers-reduced-motion, the page stays fully visible.
   ---------------------------------------------------------------------- */
(function () {
    "use strict";

    if (!("IntersectionObserver" in window)) return;
    if (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
        return;

    var targets = document.querySelectorAll(
        "article > section:not(.header-section), .section-divider",
    );
    if (!targets.length) return;

    var io = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                io.unobserve(entry.target);
            });
        },
        // Fire once any part of the element clears the bottom tenth of
        // the viewport — tall sections shouldn't wait for a ratio.
        { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );

    targets.forEach(function (el) {
        el.classList.add("reveal");
        io.observe(el);
    });
})();
