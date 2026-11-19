/* =================================================================
   Simple content pages (rubric.html, faq.html): navbar and scroll
   effects only. Needs js/common.js loaded first.
   ================================================================= */
(function () {
  "use strict";

  /* ---------- Boot ---------- */
  initNav();
  setActiveNav(document.body.dataset.view);
  initReveal();
  initScrollProgress();
})();
