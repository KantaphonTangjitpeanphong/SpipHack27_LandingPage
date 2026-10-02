/* =================================================================
   Simple content pages (rubric.html, faq.html): navbar, glass and
   scroll effects only. Needs js/common.js loaded first.
   ================================================================= */
(function () {
  "use strict";

  /* ---------- Boot ---------- */
  initNav();
  initLiquidGlass();
  setActiveNav(document.body.dataset.view);
  initReveal();
  initScrollProgress();
})();
