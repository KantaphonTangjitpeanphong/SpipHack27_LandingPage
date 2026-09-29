/* =================================================================
   Shared code for every SPIP Hack page: helpers, navbar,
   scroll progress bar and scroll-reveal animations.
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
// Highlight a navbar link. key = "home" | "event" | "rounds" | "venue" | "partners" | "about"
function setActiveNav(key) {
  $$(".nav-links a").forEach((a) => {
    const active = a.dataset.nav === key;
    a.classList.toggle("is-active", active);
    if (active) a.setAttribute("aria-current", key === "about" ? "page" : "true");
    else a.removeAttribute("aria-current");
  });
}

function initNav() {
  const header = $("#site-header");
  const toggle = $(".nav-toggle", header);
  const menu = $("#nav-menu");
  const desktop = window.matchMedia("(min-width: 1080px)");

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
