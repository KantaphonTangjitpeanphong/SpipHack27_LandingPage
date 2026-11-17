/* =================================================================
   EOI pop-ups (index.html):
   - Launch pop-up: the EOI poster covers the page shortly after it opens,
     every time the home page loads (a first visit, a refresh, coming back
     with the Back button, a new tab).
   - Corner pop-up: desktop only, bottom right, once the hero's poster and
     countdown have scrolled past (so never during the SPIP HACK intro). Its ×
     hides it for the rest of the browser session.
   Both go to the EOI form. The link and the on/off switch (EOI_URL,
   EOI_OPEN, EOI_CLOSES) are in js/common.js; styles are the "EOI
   pop-ups" block in css/style.css.
   Load after js/common.js, js/home.js and js/intro.js.
   ================================================================= */
(function () {
  "use strict";

  if (!eoiIsOpen()) return;

  const LAUNCH_DELAY = 600;  // ms, so the page paints before the pop-up covers it
  const POSTER_WAIT = 3000;  // ms: on a slow connection, open after this even if the poster is still loading
  const CORNER_KEY = "spip_eoi_corner_dismissed";

  // Storage can be blocked (private windows, strict settings): then the
  // corner's × lasts until the page is reloaded
  const session = {
    has(key) { try { return sessionStorage.getItem(key) === "1"; } catch (e) { return false; } },
    set(key) { try { sessionStorage.setItem(key, "1"); } catch (e) { /* not remembered */ } },
  };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // The launch pop-up used to show once per session and remember that here; clear it
  try { sessionStorage.removeItem("spip_eoi_launch_seen"); } catch (e) { /* nothing stored */ }

  let launchActive = false;    // launch pop-up is waiting to open, or open
  let updateCorner = () => {}; // set by initCorner

  // Resolves true once the image has loaded, false if it can't load
  function imageReady(img) {
    return new Promise((resolve) => {
      if (img.complete) { resolve(img.naturalWidth > 0); return; }
      img.addEventListener("load", () => resolve(true), { once: true });
      img.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  /* ---------- Launch pop-up ---------- */
  function initLaunch() {
    const modal = $(".eoi-modal");
    if (!modal || typeof modal.showModal !== "function") return; // very old browser: navbar link only

    const img = $(".eoi-modal__poster img", modal);
    const cta = $(".eoi-modal__cta", modal);
    let pending = false;
    let returnFocus = null;
    let scrollTop = 0;

    function launch() {
      if (pending || modal.open) return;
      pending = launchActive = true;
      updateCorner();
      const poster = Promise.race([imageReady(img), wait(POSTER_WAIT)]);
      Promise.all([poster, wait(LAUNCH_DELAY)]).then(([loaded]) => {
        pending = false;
        if (loaded === false) { // the poster can't load: no pop-up rather than an empty frame
          launchActive = false;
          updateCorner();
          return;
        }
        open();
      });
    }

    function lockPage(lock) {
      const body = document.body;
      if (lock) {
        // Width of a classic scrollbar (0 with overlay scrollbars), padded back in while it's hidden
        body.style.setProperty("--eoi-sbw", (window.innerWidth - document.documentElement.clientWidth) + "px");
        body.classList.add("eoi-locked");
      } else {
        body.classList.remove("eoi-locked");
        body.style.removeProperty("--eoi-sbw");
      }
      // js/intro.js stops its animation loop while the page is covered
      document.dispatchEvent(new CustomEvent("spip:intro-pause", { detail: lock }));
    }

    function open() {
      returnFocus = document.activeElement;
      scrollTop = window.scrollY;
      lockPage(true);
      modal.showModal();
      cta.focus();
    }

    // Fade + scale out, then close. "close" below does the tidying up, because
    // the browser can also close the dialog itself (e.g. a second Esc).
    function requestClose() {
      if (!modal.open || modal.classList.contains("is-closing")) return;
      modal.classList.add("is-closing");
      const fallback = setTimeout(finish, 800); // in case animationend never comes
      function onEnd(e) { if (e.target === modal) finish(); }
      function finish() {
        clearTimeout(fallback);
        modal.removeEventListener("animationend", onEnd);
        modal.close();
      }
      modal.addEventListener("animationend", onEnd);
    }

    modal.addEventListener("close", () => {
      modal.classList.remove("is-closing");
      lockPage(false);
      if (window.scrollY !== scrollTop) window.scrollTo(0, scrollTop); // back exactly where they were
      if (returnFocus && returnFocus !== document.body && document.contains(returnFocus)) {
        returnFocus.focus({ preventScroll: true });
      }
      launchActive = false;
      updateCorner();
    });

    // Esc: animate out instead of vanishing (when the browser lets us)
    modal.addEventListener("cancel", (e) => {
      if (!e.cancelable) return;
      e.preventDefault();
      requestClose();
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) requestClose();                       // the darkened page around the poster
      else if (e.target.closest("a[data-eoi]")) requestClose();     // went to the form (it opens in a new tab)
      else if (e.target.closest(".eoi-modal__close")) requestClose();
    });

    launch();
    // Back / Forward can bring the page back from the browser's cache exactly as it was
    // left, without running this file again, so open the pop-up again from here
    window.addEventListener("pageshow", (e) => { if (e.persisted) launch(); });
  }

  /* ---------- Corner pop-up (desktop only) ---------- */
  function initCorner() {
    const corner = $(".eoi-corner");
    const countdown = $("#countdown");
    if (!corner || !countdown || !("IntersectionObserver" in window)) return;

    const desktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const covering = new Set(); // the hero's poster or countdown, the #notify section or the footer on screen
    let reached = false;        // the countdown has been on screen, so the intro is behind them
    let dismissed = session.has(CORNER_KEY);

    updateCorner = function () {
      const show = reached && !dismissed && !launchActive && covering.size === 0 && desktop.matches;
      if (show && corner.hidden) {
        corner.hidden = false;
        void corner.offsetWidth; // lay it out hidden first, so it slides in rather than popping
      }
      corner.classList.toggle("is-shown", show);
    };

    // From the first time the countdown, or anything below it, is on screen. Watching
    // only the countdown would miss a jump straight past it (a link to index.html#rounds).
    const seen = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      reached = true;
      seen.disconnect();
      updateCorner();
    });
    [countdown]
      .concat($$("#main-content > section:not(.intro):not(.hero)"), $$(".closing, .site-footer"))
      .forEach((el) => seen.observe(el));

    // Not while the same poster is on screen in the hero, nor over the wide countdown card
    // under it, and out of the way of the EOI button in #notify and of the footer links
    const cover = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) covering.add(e.target); else covering.delete(e.target); });
      updateCorner();
    });
    [".hero-banner", "#countdown", "#notify", ".closing", ".site-footer"].forEach((sel) => { const el = $(sel); if (el) cover.observe(el); });

    $(".eoi-corner__close", corner).addEventListener("click", () => {
      dismissed = true;
      session.set(CORNER_KEY);
      updateCorner();
    });
    desktop.addEventListener("change", () => updateCorner());

    // If the thumbnail can't load, the card shows its text only
    const media = $(".eoi-corner__media", corner);
    const thumb = media && $("img", media);
    if (thumb) imageReady(thumb).then((ok) => { if (!ok) media.hidden = true; });
  }

  initCorner(); // first, so the launch pop-up can keep the corner one hidden while it's up
  initLaunch();
})();
