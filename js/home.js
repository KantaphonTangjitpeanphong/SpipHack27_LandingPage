/* =================================================================
   Home page (index.html): countdown, poster carousel,
   partners marquee and hero parallax.
   Needs js/common.js and js/sponsors-data.js loaded first.
   ================================================================= */
(function () {
  "use strict";

  // Old links like index.html#/about or #/event (from the one-page version) still work
  if (location.hash.startsWith("#/")) {
    const seg = location.hash.slice(2).split(/[/?]/)[0].toLowerCase();
    if (seg === "about") { location.replace("about.html"); return; }
    history.replaceState(null, "", seg && seg !== "home" ? "#" + seg : location.pathname);
    if (seg && seg !== "home") requestAnimationFrame(() => document.getElementById(seg)?.scrollIntoView());
  }

  // ▼▼▼ ★ EDIT EVENT DATE HERE (Bangkok time, UTC+7) ▼▼▼
  const EVENT_DATE = "2027-03-06T08:00:00+07:00"; // TENTATIVE — Hackathon Day 1 (6–7 Mar 2027, Participant Rulebook v3); start time TBC

  // ★ Sponsor logos, names and descriptions are edited in js/sponsors-data.js

  /* ---------- Countdown ---------- */
  function initCountdown() {
    const target = new Date(EVENT_DATE).getTime();
    const tiles = $("[data-countdown-tiles]");
    const live = $("[data-countdown-live]");
    const els = {};
    $$("[data-unit]", tiles).forEach((el) => { els[el.dataset.unit] = el; });
    if (Number.isNaN(target)) return;

    const pad = (n) => String(n).padStart(2, "0");
    let timer = null;

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        tiles.hidden = true;
        live.hidden = false;
        clearInterval(timer);
        return;
      }
      const s = Math.floor(diff / 1000);
      els.days.textContent = pad(Math.floor(s / 86400));
      els.hours.textContent = pad(Math.floor((s % 86400) / 3600));
      els.minutes.textContent = pad(Math.floor((s % 3600) / 60));
      els.seconds.textContent = pad(s % 60);
    }
    tick();
    timer = setInterval(tick, 1000);
  }

  /* ---------- Poster carousel ---------- */
  function initCarousel() {
    const root = $("#carousel");
    const posters = $$(".poster", root);
    const panels = $$(".slide-panel", root);
    const dots = $$(".dot", root);
    const liveRegion = $("[data-carousel-live]", root);
    const current = $("[data-carousel-current]", root);
    const progress = $("[data-carousel-progress]", root);
    const toggle = $("[data-carousel-toggle]", root);
    const stage = $("[data-carousel-stage]", root);
    const DELAY = 6000;
    const total = posters.length;

    let index = 0;
    let timer = null;
    let userPaused = false;
    let inView = false;

    const SWIPE_CLASSES = ["is-leaving", "in-left", "in-right", "out-left", "out-right"];

    // dir: 1 = forward (swipe in from the right), -1 = backward
    function go(n, fromUser, dir) {
      const next = (n + total) % total;
      if (next !== index) {
        const forward = dir ? dir > 0 : next > index;
        const prev = posters[index];
        const incoming = posters[next];
        posters.forEach((el) => el.classList.remove(...SWIPE_CLASSES));
        void incoming.offsetWidth;

        prev.classList.remove("is-active");
        prev.classList.add("is-leaving", forward ? "out-left" : "out-right");
        prev.setAttribute("aria-hidden", "true");
        incoming.classList.add("is-active", forward ? "in-right" : "in-left");
        incoming.removeAttribute("aria-hidden");

        stage.classList.remove("sweep-left", "sweep-right");
        void stage.offsetWidth;
        stage.classList.add(forward ? "sweep-right" : "sweep-left");

        panels[index].hidden = true;
        panels[next].hidden = false;
        panels[next].style.setProperty("--dir", forward ? 1 : -1);
        panels[next].classList.remove("is-entering");
        void panels[next].offsetWidth;
        panels[next].classList.add("is-entering");
        dots[index].removeAttribute("aria-current");
        dots[next].setAttribute("aria-current", "true");
        index = next;
        current.textContent = String(index + 1).padStart(2, "0");
      }
      if (fromUser) liveRegion.setAttribute("aria-live", "polite");
      schedule();
    }

    function canRun() {
      return !isReduced() && !userPaused && inView && !document.hidden;
    }

    function schedule() {
      clearTimeout(timer);
      progress.classList.remove("is-running");
      if (!canRun()) return;
      liveRegion.setAttribute("aria-live", "off");
      void progress.offsetWidth;
      progress.classList.add("is-running");
      timer = setTimeout(() => go(index + 1, false, 1), DELAY);
    }

    $("[data-carousel-prev]", root).addEventListener("click", () => go(index - 1, true, -1));
    $("[data-carousel-next]", root).addEventListener("click", () => go(index + 1, true, 1));
    posters.forEach((el) => el.addEventListener("animationend", () => {
      if (!el.classList.contains("is-active")) el.classList.remove(...SWIPE_CLASSES);
    }));
    dots.forEach((dot, i) => dot.addEventListener("click", () => go(i, true)));

    toggle.addEventListener("click", () => {
      userPaused = !userPaused;
      root.classList.toggle("is-paused-by-user", userPaused);
      toggle.setAttribute("aria-label", userPaused ? "Play automatic slide show" : "Pause automatic slide show");
      schedule();
    });

    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1, true, -1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1, true, 1); }
    });

    // Touch / pen swipe
    let startX = null;
    let startY = null;
    stage.addEventListener("pointerdown", (e) => { startX = e.clientX; startY = e.clientY; });
    stage.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1), true, dx < 0 ? 1 : -1);
      startX = null;
    });
    stage.addEventListener("pointercancel", () => { startX = null; });

    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      schedule();
    }, { threshold: .35 }).observe(root);
    document.addEventListener("visibilitychange", schedule);
    reducedMotion.addEventListener("change", schedule);
  }

  /* ---------- Partners marquee ---------- */
  function initPartners() {
    const wrap = $("[data-marquee]");
    const viewport = $(".marquee", wrap);
    const track = $("[data-marquee-track]", wrap);
    const SPEED = 36; // px per second

    function tileHTML(s, clone) {
      const hidden = clone ? ' aria-hidden="true"' : "";
      const tab = clone ? ' tabindex="-1"' : "";
      const logo = s.logo
        ? `<div class="sponsor__logo"><img src="${escapeHTML(s.logo)}" alt="${clone ? "" : escapeHTML(s.name) + " logo"}" loading="lazy" decoding="async"></div>`
        : `<div class="sponsor__logo sponsor__logo--empty" aria-hidden="true">Sponsor logo</div>`;
      const inner = `${logo}<p class="sponsor__name">${escapeHTML(s.name)}</p>`;
      const cls = "sponsor";
      const tile = s.url
        ? `<a class="${cls}" href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer"${tab}>${inner}</a>`
        : `<div class="${cls}">${inner}</div>`;
      return `<li${hidden}>${tile}</li>`;
    }

    let sets = 1;
    let loopW = 0;

    function build() {
      sets = 1;
      loopW = 0;
      const base = SPONSORS.map((s) => tileHTML(s, false)).join("");
      track.innerHTML = base;
      if (isReduced()) {
        wrap.classList.add("is-static");
        return;
      }
      wrap.classList.remove("is-static");
      // Repeat the set until it spans the viewport, then duplicate once for a seamless loop
      const setWidth = track.scrollWidth || 1;
      const repeats = Math.max(1, Math.ceil(viewport.clientWidth / setWidth));
      const cloneSet = SPONSORS.map((s) => tileHTML(s, true)).join("");
      track.innerHTML = base + cloneSet.repeat(repeats * 2 - 1);
      sets = repeats * 2;
      loopW = 0;
    }

    build();

    let offset = 0;
    let nudge = 0;
    let last = 0;
    let hovering = false;
    let inView = false;
    let rafId = null;

    function loopWidth() {
      if (!loopW && sets > 1) {
        const half = track.children[SPONSORS.length * sets / 2];
        loopW = half ? half.offsetLeft - track.firstElementChild.offsetLeft : 0;
      }
      return loopW;
    }

    function frame(t) {
      const dt = last ? Math.min((t - last) / 1000, .05) : 0;
      last = t;
      if (!hovering) offset += SPEED * dt;
      if (nudge) {
        const step = nudge * Math.min(1, dt * 7);
        offset += step;
        nudge = Math.abs(nudge - step) < .5 ? 0 : nudge - step;
      }
      const w = loopWidth();
      if (w) offset = ((offset % w) + w) % w;
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (rafId || isReduced() || !inView || document.hidden) return;
      last = 0;
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    const step = () => {
      const tile = track.firstElementChild;
      return tile ? tile.getBoundingClientRect().width + 24 : 200;
    };
    $("[data-marquee-prev]", wrap).addEventListener("click", () => { nudge -= step(); });
    $("[data-marquee-next]", wrap).addEventListener("click", () => { nudge += step(); });
    viewport.addEventListener("mouseenter", () => { hovering = true; });
    viewport.addEventListener("mouseleave", () => { hovering = false; });
    viewport.addEventListener("focusin", () => { hovering = true; });
    viewport.addEventListener("focusout", () => { hovering = false; });

    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView) start(); else stop();
    }).observe(wrap);
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else start(); });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { stop(); build(); start(); }, 200);
    });
    reducedMotion.addEventListener("change", () => { stop(); offset = 0; build(); start(); });
  }

  /* ---------- Hero parallax ---------- */
  function initParallax() {
    const banner = $(".hero-banner");
    let ticking = false;
    function update() {
      ticking = false;
      const y = window.scrollY;
      if (isReduced() || y > window.innerHeight * 1.5) return;
      const t = Math.min(1, y / (window.innerHeight * 0.9));
      banner.style.setProperty("--parallax-scale", (1 - t * 0.08).toFixed(4));
      banner.style.setProperty("--parallax-fade", (1 - t * 0.55).toFixed(3));
    }
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- Boot ---------- */
  initNav();
  initLiquidGlass();
  setActiveNav("home");
  initCountdown();
  initCarousel();
  initPartners();
  initReveal();
  initScrollProgress();
  initParallax();
})();
