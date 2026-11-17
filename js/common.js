/* =================================================================
   Shared code for every SPIP Hack page: helpers, navbar,
   scroll progress bar and scroll-reveal animations. (The pointer-following
   "liquid glass" highlight was removed on 17 Nov 2026.)
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

/* ---------- Expression of Interest (EOI) ---------- */
// ▼▼▼ ★ EOI LINK AND ON/OFF SWITCH ▼▼▼
// The EOI Google Form. initEoiLinks() below points every EOI link at this URL; the same
// URL is also written as their href in the HTML (search the .html files for data-eoi), so
// they work without JavaScript. If the link changes, update it here and there.
// No utm_ tracking tags: the forms.gle redirect drops them and Google Forms doesn't read them.
const EOI_URL = "https://forms.gle/T4Pa6pyx9E69tFyXA";
// false = EOI closed: no pop-ups, and the navbar button goes back to "Notify me"
const EOI_OPEN = true;
// The moment the EOI closes on its own, in Bangkok time (the poster says "Submit by 30 Nov.
// 2026", so this is the end of that day). From then on, with no upload needed, the pop-ups
// stop and the site goes back to its "Notify me" wording. null = no end date.
const EOI_CLOSES = "2026-12-01T00:00:00+07:00";

const eoiIsOpen = () => EOI_OPEN && (!EOI_CLOSES || Date.now() < new Date(EOI_CLOSES).getTime());

// Every EOI link (<a data-eoi="navbar" | "hero_banner" | "launch_popup" | "corner_popup" |
// "notify_section">) goes to EOI_URL. Once the EOI has closed, the navbar button turns
// back into "Notify me", any other EOI link is hidden (with the hero's poster banner or
// the #notify button row around it), and text with a data-eoi-closed attribute (the
// #notify section) switches to that wording.
function initEoiLinks() {
  const open = eoiIsOpen();
  $$("a[data-eoi]").forEach((a) => {
    if (open) {
      a.href = EOI_URL;
    } else if (a.dataset.eoi === "navbar") {
      a.href = "index.html#notify";
      a.removeAttribute("target");
      a.removeAttribute("rel");
      a.innerHTML = '<svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg> Notify me';
    } else {
      (a.closest(".hero-banner, .eoi-cta") || a).hidden = true;
    }
  });
  if (!open) $$("[data-eoi-closed]").forEach((el) => { el.textContent = el.dataset.eoiClosed; });
}

// ▼▼▼ ★ FACEBOOK AND LINKTREE LINKS ▼▼▼
// Paste each full link (starting https://) between the quotes. Until a link is filled in,
// its line in the footer (Facebook under "Contact us", Linktree under "Quick links") stays
// hidden on every page. label = the text shown next to the icon, e.g. the Facebook page's name.
const SOCIAL_LINKS = {
  facebook: { url: "", label: "SPIP Hack" },
  linktree: { url: "", label: "Linktree" },
};

// Fills in and shows each footer line marked data-social="facebook" | "linktree"
function initSocialLinks() {
  $$("[data-social]").forEach((el) => {
    const link = SOCIAL_LINKS[el.dataset.social];
    if (!link || !/^https:\/\/\S+$/.test(link.url)) return;
    const a = el.matches("a") ? el : $("a", el);
    const label = $("[data-social-label]", el);
    if (!a) return;
    a.href = link.url;
    if (label && link.label) label.textContent = link.label;
    el.hidden = false;
  });
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

  initEoiLinks(); // the navbar's EOI button is on every page
  initSocialLinks(); // the footer is on every page too

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
