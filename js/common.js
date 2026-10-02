/* =================================================================
   Shared code for every SPIP Hack page: helpers, navbar,
   scroll progress bar, scroll-reveal animations and liquid glass.
   Load this BEFORE the page's own script (home.js / team.js).
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
// Highlight a navbar link. key = "home" | "event" | "rounds" | "venue" | "partners" | "rubric" | "faq" | "about"
function setActiveNav(key) {
  $$(".nav-links a").forEach((a) => {
    const active = a.dataset.nav === key;
    a.classList.toggle("is-active", active);
    if (active) a.setAttribute("aria-current", ["about", "rubric", "faq"].includes(key) ? "page" : "true");
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
// Surfaces that carry the moving specular highlight (.…::after in style.css)
const GLASS_SEL = ".glass, .card, .frame-grad, .btn--ghost, .btn--grad, .btn--primary, " +
  ".icon-btn, .lead, .sponsor, .countdown__tile, .hero-banner picture";

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
  // it's over (mouse / pen only; skipped when motion is reduced)
  if (isReduced() || !window.matchMedia("(hover: hover)").matches) return;
  let el = null, x = 0, y = 0, queued = false;
  function paint() {
    queued = false;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", ((x - r.left) / r.width * 100).toFixed(1) + "%");
    el.style.setProperty("--my", ((y - r.top) / r.height * 100).toFixed(1) + "%");
  }
  document.addEventListener("pointermove", (e) => {
    const next = e.target instanceof Element ? e.target.closest(GLASS_SEL) : null;
    if (el && el !== next) { el.style.removeProperty("--mx"); el.style.removeProperty("--my"); }
    el = next;
    x = e.clientX;
    y = e.clientY;
    if (el && !queued) { queued = true; requestAnimationFrame(paint); }
  }, { passive: true });
}
