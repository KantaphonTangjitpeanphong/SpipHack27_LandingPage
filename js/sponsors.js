/* =================================================================
   Sponsors page (sponsors.html): one card per sponsor, with logo,
   name and description. Needs js/common.js and js/sponsors-data.js
   loaded first.
   ================================================================= */
(function () {
  "use strict";

  function cardHTML(s) {
    const logo = s.logo
      ? `<div class="sponsor__logo"><img src="${escapeHTML(s.logo)}" alt="${escapeHTML(s.name)} logo" loading="lazy" decoding="async"></div>`
      : `<div class="sponsor__logo sponsor__logo--empty" aria-hidden="true">Sponsor logo</div>`;
    const about = s.about
      ? `<p class="sponsor__about">${escapeHTML(s.about)}</p>`
      : `<p class="sponsor__about sponsor__about--empty">Who they are and what they value — coming soon.</p>`;
    const visit = s.url
      ? `<span class="sponsor__link">Visit website <svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg><span class="visually-hidden">(opens in a new tab)</span></span>`
      : "";
    const inner = `${logo}<h3 class="sponsor__name">${escapeHTML(s.name)}</h3>${about}${visit}`;
    const tile = s.url
      ? `<a class="sponsor" href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
      : `<div class="sponsor">${inner}</div>`;
    return `<li data-reveal>${tile}</li>`;
  }

  function initSponsors() {
    $("[data-sponsors-grid]").innerHTML = SPONSORS.map(cardHTML).join("");
  }

  /* ---------- Boot ---------- */
  initNav();
  initLiquidGlass();
  setActiveNav("sponsors");
  initSponsors();
  initReveal();
  initScrollProgress();
})();
