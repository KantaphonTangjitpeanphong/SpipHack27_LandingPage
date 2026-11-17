/* =================================================================
   Home page (index.html): countdown, poster carousel, theme
   flashcards, partners marquee and hero parallax.
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
  const EVENT_DATE = "2027-03-13T09:00:00+07:00"; // Hackathon Day 1 (13–14 Mar 2027), 09:00 as in the countdown spec
  // The countdown's first square: the first meeting. It shows one square per day from here to EVENT_DATE.
  const COUNTDOWN_START = "2026-09-17T00:00:00+07:00";

  // ★ Sponsor logos, names and descriptions are edited in js/sponsors-data.js

  /* ---------- Countdown ("T-minus", spip-hack-countdown.md) ---------- */
  // One square per day from COUNTDOWN_START to EVENT_DATE (177 squares, 19 to a row).
  // Days gone by are lit in the SPIP gradient colour of their column at half brightness,
  // today's square has a pink outline, and the days to come stay dark. Only the colons
  // blink, and each seconds digit drops in from the top as it changes. At zero the clock
  // stops at T- 000:00:00:00 with every square lit; nothing else happens. All the dates
  // are Bangkok time, so it shows the same on any computer whatever its time zone.
  function initCountdown() {
    const root = $("#countdown");
    const target = new Date(EVENT_DATE).getTime();
    const start = new Date(COUNTDOWN_START).getTime();
    if (!root || Number.isNaN(target) || Number.isNaN(start)) return;

    const DAY = 86400000;
    const COLS = 19;
    const total = Math.floor((target - start) / DAY); // 177
    // The gradient's four stops, the same colours as --cd-1 … --cd-4 in css/style.css
    const STOPS = [[90, 95, 168], [181, 79, 154], [224, 79, 106], [236, 122, 60]];
    function colourAt(t) { // t: 0 (left column) … 1 (right column)
      const x = t * (STOPS.length - 1);
      const i = Math.min(Math.floor(x), STOPS.length - 2);
      const f = x - i;
      return STOPS[i].map((v, k) => Math.round(v + (STOPS[i + 1][k] - v) * f));
    }

    // The squares, built once
    const grid = $("[data-cd-grid]", root);
    grid.style.setProperty("--cd-cols", COLS);
    const cells = Array.from({ length: total }, (_, i) => {
      const cell = document.createElement("span");
      cell.className = "cd-cell";
      const [r, g, b] = colourAt((i % COLS) / (COLS - 1));
      cell.dataset.past = `rgb(${r >> 1}, ${g >> 1}, ${b >> 1})`; // half brightness
      return cell;
    });
    grid.append(...cells);

    // Status bar date, e.g. "13.03.27 09:00 ICT"
    const when = $("[data-cd-when]", root);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(target));
    const part = (type) => parts.find((p) => p.type === type).value;
    if (when) when.textContent = `${part("day")}.${part("month")}.${part("year")} ${part("hour")}:${part("minute")} ICT`;

    const clock = $("[data-cd-clock]", root);
    const num = {};
    $$("[data-cd]", root).forEach((el) => { num[el.dataset.cd] = el; });
    const pad = (n) => String(n).padStart(2, "0");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastDay = -1;
    let lastLabel = "";
    let timer = 0;

    // Seconds: each digit in its own window (.cd-digit), so a changed digit can drop in
    const slots = [0, 1].map(() => {
      const slot = document.createElement("span");
      slot.className = "cd-digit";
      slot.append(document.createElement("span"));
      return slot;
    });
    num.seconds.replaceChildren(...slots);
    function setSeconds(text, animate) {
      [...text].forEach((ch, i) => {
        const slot = slots[i];
        $$(".is-out", slot).forEach((el) => el.remove()); // one still sliding out from last time
        const current = slot.lastElementChild;
        if (current.textContent === ch) return;
        if (!animate || reduceMotion.matches || document.hidden) { current.textContent = ch; return; }
        current.className = "is-out";
        current.setAttribute("aria-hidden", "true");
        current.addEventListener("animationend", () => current.remove(), { once: true });
        const next = document.createElement("span");
        next.className = "is-in";
        next.textContent = ch;
        slot.append(next);
      });
    }

    function tick(animate) {
      const now = Date.now();
      const left = Math.max(0, target - now);
      const s = Math.floor(left / 1000);
      const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
      num.days.textContent = String(d).padStart(3, "0");
      num.hours.textContent = pad(h);
      num.minutes.textContent = pad(m);
      setSeconds(pad(s % 60), animate);
      const label = `${d} days, ${h} hours and ${m} minutes until SPIP Hack 2027`;
      if (label !== lastLabel) { clock.setAttribute("aria-label", label); lastLabel = label; }

      // Squares before today; repainted only when the day changes
      const day = left === 0 ? total : Math.min(total, Math.max(0, Math.floor((now - start) / DAY)));
      if (day !== lastDay) {
        cells.forEach((cell, i) => {
          cell.style.background = i < day ? cell.dataset.past : "";
          cell.classList.toggle("is-today", i === day);
        });
        lastDay = day;
      }
      if (left === 0) {
        clearTimeout(timer);
        clock.classList.remove("is-running"); // the colons stop blinking at zero
      }
    }

    // Tick just after each second turns over (EVENT_DATE is on a whole second, so that's
    // when Date.now() is a whole second too), so the digits change in time with the colons
    function next() {
      timer = setTimeout(() => {
        tick(true);
        if (target > Date.now()) next();
      }, 1000 - (Date.now() % 1000) + 15);
    }
    tick(false);
    if (target > Date.now()) {
      // Start the colons' blink at the turn of a second
      clock.style.setProperty("--cd-blink-delay", -(Date.now() % 1000) + "ms");
      clock.classList.add("is-running");
      next();
    }
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

  /* ---------- Theme flashcards ---------- */
  // Click / tap anywhere on a card (or Enter / Space on its title button)
  // turns it over; with a mouse it also leans toward the pointer.
  function initThemeCards() {
    const TILT = 8; // max lean, degrees
    const canTilt = window.matchMedia("(hover: hover)").matches;

    $$(".theme").forEach((card) => {
      const inner = $(".theme__card", card);
      const toggle = $(".theme__toggle", card);

      card.addEventListener("click", () => {
        if (card.classList.contains("is-turning")) return; // let the turn finish
        const flipped = !card.classList.contains("is-flipped");
        card.classList.toggle("is-flipped", flipped);
        toggle.setAttribute("aria-expanded", String(flipped));
        if (!isReduced()) card.classList.add("is-turning");
      });
      const turned = (e) => { if (e.target === inner) card.classList.remove("is-turning"); };
      inner.addEventListener("animationend", turned);
      inner.addEventListener("animationcancel", turned);

      if (!canTilt) return;
      let raf = 0, px = 0, py = 0;
      function lean() {
        raf = 0;
        const r = card.getBoundingClientRect();
        const x = (px - r.left) / (r.width || 1) - .5;
        const y = (py - r.top) / (r.height || 1) - .5;
        card.style.setProperty("--ry", (x * TILT * 2).toFixed(2) + "deg");
        card.style.setProperty("--rx", (-y * TILT * 2).toFixed(2) + "deg");
      }
      card.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch" || isReduced()) return;
        px = e.clientX;
        py = e.clientY;
        card.classList.add("is-tilting");
        if (!raf) raf = requestAnimationFrame(lean);
      });
      card.addEventListener("pointerleave", () => {
        cancelAnimationFrame(raf);
        raf = 0;
        card.classList.remove("is-tilting");
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      });
    });
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
    const hero = $(".hero");
    let heroTop = hero.offsetTop; // the intro sits above the hero, so measure from the hero
    let ticking = false;
    function update() {
      ticking = false;
      const y = Math.max(0, window.scrollY - heroTop);
      if (isReduced() || y > window.innerHeight * 1.5) return;
      const t = Math.min(1, y / (window.innerHeight * 0.9));
      banner.style.setProperty("--parallax-scale", (1 - t * 0.08).toFixed(4));
      banner.style.setProperty("--parallax-fade", (1 - t * 0.55).toFixed(3));
    }
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", () => { heroTop = hero.offsetTop; update(); });
    update();
  }

  /* ---------- Boot ---------- */
  initNav();
  setActiveNav("home");
  initCountdown();
  initCarousel();
  initThemeCards();
  initPartners();
  initReveal();
  initScrollProgress();
  initParallax();
})();
