/* =================================================================
   Shared code for every SPIP Hack page: helpers, navbar,
   scroll progress bar, scroll-reveal animations and liquid glass.
   Load this BEFORE the page's own script (home.js / team.js / info.js / sponsors.js).
   ================================================================= */
"use strict";

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const isReduced = () => reducedMotion.matches;

document.documentElement.classList.replace("no-js", "js");

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- Nav ---------- */
// Highlight a navbar link. key = "home" | "sponsors" | "rubric" | "faq" | "about"
function setActiveNav(key) {
  $$(".nav-links a").forEach((a) => {
    const active = a.dataset.nav === key;
    a.classList.toggle("is-active", active);
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function initNav() {
  const header = $("#site-header");
  const toggle = $(".nav-toggle", header);
  const menu = $("#nav-menu");
  const desktop = window.matchMedia("(min-width: 1200px)");

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const focusables = () => [$(".brand", header), toggle].concat($$("a, button", menu));

  function setOpen(open) {
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("is-locked", open);
    if (open) $("a", menu).focus();
  }
  const isOpen = () => header.classList.contains("menu-open");

  toggle.addEventListener("click", () => setOpen(!isOpen()));
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a") && isOpen()) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") {
      setOpen(false);
      toggle.focus();
    } else if (e.key === "Tab") {
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  desktop.addEventListener("change", () => { if (desktop.matches && isOpen()) setOpen(false); });

  // Disabled "Register" button
  $$("[data-disabled]").forEach((btn) => btn.addEventListener("click", (e) => e.preventDefault()));
  // Placeholder links (href="#") shouldn't jump to top
  $$("[data-placeholder-link]").forEach((a) => a.addEventListener("click", (e) => {
    if (a.getAttribute("href") === "#") e.preventDefault();
  }));
}

/* ---------- Scroll progress bar under the navbar ---------- */
function initScrollProgress() {
  const header = $("#site-header");
  let ticking = false;
  function update() {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.style.setProperty("--progress", max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener("resize", update);
  update();
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
  $$("[data-reveal-group]").forEach((group) => {
    $$("[data-reveal]", group).forEach((el, i) => el.style.setProperty("--i", i));
  });
  if (isReduced() || !("IntersectionObserver" in window)) {
    $$("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
    return;
  }
  // Replays every time: elements leaving above the viewport come back
  // down from above when scrolling up; those below rise up when scrolling down
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.classList.add("is-visible");
      } else {
        el.dataset.from = entry.boundingClientRect.top < 0 ? "above" : "below";
        el.classList.remove("is-visible");
      }
    });
  }, { threshold: .12, rootMargin: "0px 0px -40px 0px" });
  $$("[data-reveal]").forEach((el) => io.observe(el));
}

/* ---------- Liquid glass ---------- */
// Surfaces whose rim glint and specular highlight follow the pointer
// (their ::before / ::after in style.css; .nav-inner's pill is its pseudos)
const GLASS_SEL = ".glass, .card, .frame-grad, .btn--ghost, .btn--grad, .btn--primary, " +
  ".icon-btn, .lead, .sponsor, .countdown__tile, .hero-banner picture, .theme__card, .nav-inner";

function initLiquidGlass() {
  const root = document.documentElement;

  // Refraction: Chromium is the only engine that renders an SVG filter
  // inside backdrop-filter; everyone else keeps the plain blurred glass.
  const isChromium = !!(navigator.userAgentData && navigator.userAgentData.brands
    .some((b) => /Chromium/.test(b.brand)));
  const reducedTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
  if (isChromium && !reducedTransparency) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    // Low-frequency noise nudges the blurred backdrop around, so what's
    // behind the glass looks bent by a thick, slightly uneven lens
    svg.innerHTML = `<filter id="lg-refract" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".006 .009" numOctaves="2" seed="7" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="28" xChannelSelector="R" yChannelSelector="G"/>
      </filter>`;
    document.body.appendChild(svg);
    root.classList.add("lg-refract");
  }

  // Specular highlight follows the pointer across whichever glass surface
  // it's over (mouse / pen only; skipped when motion is reduced).
  //
  // Every move repaints that surface's rim and glow (and re-runs its
  // backdrop filter), so this keeps the work per frame small: one rAF loop
  // that only runs while something is moving, rects read once per surface
  // instead of every frame, and the easing done here rather than by a CSS
  // transition on --mx / --my (which restarts on every move and trails the
  // pointer by ~0.2s).
  if (isReduced() || !window.matchMedia("(hover: hover)").matches) return;

  const REST_X = 30, REST_Y = 0; // where the glint sits when nothing is hovering (matches style.css)
  const TRACK_MS = 45;           // glint easing toward the pointer (smaller = tighter)
  const RELEASE_MS = 140;        // easing back to rest after the pointer leaves
  const live = new Map();        // surface -> { x, y, rect, wx, wy } (current %, cached rect, last written values)
  let active = null;             // surface under the pointer
  let px = 0, py = 0;            // latest pointer position
  let rectsStale = false;        // scroll / resize moved the surfaces
  let looping = false, lastT = 0;

  const kick = () => { if (!looping) { looping = true; lastT = 0; requestAnimationFrame(frame); } };

  function target(s) {
    const r = s.rect;
    return [(px - r.left) / (r.width || 1) * 100, (py - r.top) / (r.height || 1) * 100];
  }

  function write(el, s) {
    const wx = s.x.toFixed(1), wy = s.y.toFixed(1);
    if (wx !== s.wx) { s.wx = wx; el.style.setProperty("--mx", wx + "%"); }
    if (wy !== s.wy) { s.wy = wy; el.style.setProperty("--my", wy + "%"); }
  }

  function frame(now) {
    const dt = lastT ? Math.min(now - lastT, 64) : 16;
    lastT = now;
    let moving = false;
    for (const [el, s] of live) {
      const hot = el === active;
      let tx = REST_X, ty = REST_Y;
      if (hot) {
        if (rectsStale || !s.rect) s.rect = el.getBoundingClientRect();
        [tx, ty] = target(s);
      }
      const k = 1 - Math.exp(-dt / (hot ? TRACK_MS : RELEASE_MS));
      s.x += (tx - s.x) * k;
      s.y += (ty - s.y) * k;
      const settled = Math.abs(tx - s.x) < .05 && Math.abs(ty - s.y) < .05;
      if (settled && !hot) { // back at rest: hand the surface back to the stylesheet
        el.style.removeProperty("--mx");
        el.style.removeProperty("--my");
        live.delete(el);
        continue;
      }
      write(el, s);
      if (!settled) moving = true;
    }
    rectsStale = false;
    if (moving) requestAnimationFrame(frame); else looping = false;
  }

  document.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    px = e.clientX;
    py = e.clientY;
    const next = e.target instanceof Element ? e.target.closest(GLASS_SEL) : null;
    if (next !== active) {
      active = next;
      if (next) {
        let s = live.get(next);
        if (s) { // still easing back to rest: carry on from where it is
          s.rect = next.getBoundingClientRect();
        } else {
          // Entering a surface: start the glint under the pointer instead of
          // sweeping it across from the resting corner
          s = { x: REST_X, y: REST_Y, rect: next.getBoundingClientRect(), wx: "", wy: "" };
          [s.x, s.y] = target(s);
          live.set(next, s);
        }
      }
    }
    if (live.size) kick();
  }, { passive: true });

  // Pointer left the window: let the glint settle back to rest
  document.documentElement.addEventListener("pointerleave", () => { active = null; if (live.size) kick(); });

  // Cached rects go stale when the page scrolls or resizes; they're re-read
  // on the next pointer move rather than repainting during the scroll itself
  const stale = () => { rectsStale = true; };
  window.addEventListener("scroll", stale, { passive: true });
  window.addEventListener("resize", stale, { passive: true });
}
