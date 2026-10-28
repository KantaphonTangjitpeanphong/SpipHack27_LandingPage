/* =================================================================
   Scroll-pinned intro above the hero (index.html). Styles: css/intro.css.
   Needs js/common.js (helpers) and js/home.js (event date) loaded first.

   How it stays fast:
   - The black layer with the "SPIP HACK 2027" holes is drawn ONCE into
     canvases (on load, font load and resize). Scrolling only changes
     transform and opacity, so nothing repaints while you scroll.
   - One requestAnimationFrame loop. It runs only while the intro is on
     screen and stops as soon as scroll and mouse have settled.
   - No layout reads inside the loop: sizes are measured up front.
   ================================================================= */
(function () {
  "use strict";

  const root = $(".intro");
  if (!root) return;

  /* ---------- Tuning ---------- */
  // Scroll breakpoints, as a fraction (0–1) of the pinned scroll
  const P_HOLD_END   = .10; // first stop: nothing moves until here
  const P_GLIDE_END  = .28; // SPIP HACK slides so the "I" is centred; 2027 fades to black
  const P_DIVE_END   = .60; // zoom through the "I" is done, poster fills the screen
  const P_SOON_START = .68; // second stop ends, COMING SOON starts rising in
  const P_SOON_END   = .88; // COMING SOON settled; hold until the pin releases
  const P_FADE_START = .94; // bottom of the scene fades into the page

  const P_COPY_FADE_END = .16; // eyebrow gone by here
  const P_HINT_FADE_END = .03; // scroll hint gone almost as soon as scrolling starts
  const DIVE_FADE    = .15;    // last share of the dive over which the black layer fades out
  const OUTLINE_FADE = .35;    // share of the dive over which the letter outlines fade out
  const ZOOM_OVERSHOOT = 1.3;  // final zoom = (scale that just covers the screen) × this

  const WIDTH_FILL = .85; // the title fills this much of the screen width
  const HEIGHT_MAX = .55; // ...but its block is never taller than this much of the height
  const TRACKING   = .01; // letter spacing, in em
  const LINE_GAP   = 1.02; // baseline to baseline when stacked, in em

  const BG_SHIFT   = 12; // px, poster parallax
  const SOON_SHIFT = 20; // px, COMING SOON moves the other way
  const SOON_TILT  = 6;  // degrees
  const SOON_RISE  = 80; // px it rises from
  const MOUSE_LERP  = .1; // per 60 Hz frame
  const SCROLL_LERP = .09; // smooths stepped mouse wheels: lower = more in-between frames per tick
  const SETTLE = .001;
  const MAX_DPR = 2;
  const EVENT_DAYS = 2; // Hackathon is two days (6–7 March)

  /* ---------- Elements ---------- */
  const stage   = $(".intro__stage", root);
  const bgImg   = $(".intro__bg img", root);
  const shade   = $(".intro__shade", root);
  const soon    = $(".intro__soon", root);
  const cutout  = $(".intro__cutout", root);
  const eyebrow = $(".intro__eyebrow", root);
  const hint    = $(".intro__hint", root);
  const fade    = $(".intro__fade", root);
  const finePointer = window.matchMedia("(pointer: fine)");

  /* ---------- Poster: text-free export, or the regular banner as a fallback ---------- */
  function useFallbackBanner() {
    if (root.classList.contains("has-baked-text")) return;
    root.classList.add("has-baked-text");
    $$(".intro__bg [data-fallback]", root).forEach((el) => {
      if (el.tagName === "IMG") el.src = el.dataset.fallback;
      else el.srcset = el.dataset.fallback;
    });
  }
  if (bgImg.complete && bgImg.naturalWidth === 0) useFallbackBanner(); // failed before this script ran
  else bgImg.addEventListener("error", useFallbackBanner, { once: true });

  /* ---------- Date line under COMING SOON (from EVENT_DATE in home.js) ---------- */
  (function writeDate() {
    const el = $("[data-intro-date]", root);
    const start = new Date(window.SPIP_EVENT_DATE);
    if (!el || Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + (EVENT_DAYS - 1) * 86400000);
    const opt = (o) => new Intl.DateTimeFormat("en-GB", Object.assign({ timeZone: "Asia/Bangkok" }, o));
    const day = opt({ day: "numeric" });
    const monthYear = opt({ month: "long", year: "numeric" });
    const sameMonth = monthYear.format(start) === monthYear.format(end);
    const range = sameMonth
      ? `${day.format(start)}–${day.format(end)} ${monthYear.format(end)}`
      : `${opt({ day: "numeric", month: "long" }).format(start)} – ${opt({ day: "numeric", month: "long", year: "numeric" }).format(end)}`;
    el.textContent = `Hackathon · ${range} (tentative)`;
  })();

  /* ---------- State ---------- */
  let live = false;     // scroll-driven version is set up
  let visible = false;  // intro is on screen
  let raf = 0, lastT = 0;
  let geo = null;       // measured layout (see build)
  let secTop = 0, secRange = 1;
  let stageW = 0, stageH = 0;
  const target = { p: 0, mx: 0, my: 0 };
  const cur    = { p: 0, mx: 0, my: 0 };
  const written = new Map(); // el -> { prop: value } so unchanged values aren't re-set

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ramp = (v, a, b) => clamp01((v - a) / (b - a));
  const easeInOutCubic = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function set(el, prop, value) {
    let w = written.get(el);
    if (!w) { w = {}; written.set(el, w); }
    if (w[prop] === value) return;
    w[prop] = value;
    el.style[prop] = value;
  }

  /* ---------- Measure + draw (load, font load, resize only) ---------- */
  function measureSection() {
    secTop = root.getBoundingClientRect().top + window.scrollY;
    secRange = Math.max(1, root.offsetHeight - stage.clientHeight);
  }

  function build() {
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    stageW = W;
    stageH = H;
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "sans-serif";
    const stacked = W < 768 || W < H;
    const lines = stacked ? ["SPIP HACK", "2027"] : ["SPIP HACK 2027"];

    // Measure at 100px, then scale to fit
    const m = document.createElement("canvas").getContext("2d");
    m.font = `700 100px ${family}`;
    const adv = (ch) => m.measureText(ch).width + TRACKING * 100;
    const lineW = (s) => Array.from(s).reduce((sum, ch) => sum + adv(ch), 0) - TRACKING * 100;
    const capH100 = m.measureText("H").actualBoundingBoxAscent || 72;
    const widest = Math.max(...lines.map(lineW));
    const block100 = capH100 + (lines.length - 1) * LINE_GAP * 100;
    const size = Math.min(WIDTH_FILL * W * 100 / widest, HEIGHT_MAX * H * 100 / block100);
    const k = size / 100;
    const font = `700 ${size}px ${family}`;
    const blockH = block100 * k;
    const textTop = (H - blockH) / 2;

    // Glyph positions; "stays" = SPIP HACK, which stays cut out (we zoom into its "I").
    // Only 2027 closes up.
    const glyphs = [];
    let stem = null;
    const widths100 = lines.map(lineW);
    m.font = font;
    lines.forEach((line, li) => {
      let x = (W - widths100[li] * k) / 2;
      const y = textTop + capH100 * k + li * LINE_GAP * size;
      Array.from(line).forEach((ch, ci) => {
        const stays = li === 0 && ci < 9; // "SPIP HACK"
        if (ch !== " ") glyphs.push({ ch, x, y, stays });
        if (li === 0 && ci === 2) { // the "I" in SPIP
          const g = m.measureText("I");
          const left = x - g.actualBoundingBoxLeft;
          const right = x + g.actualBoundingBoxRight;
          const asc = g.actualBoundingBoxAscent || capH100 * k;
          stem = { x: (left + right) / 2, y: y - asc / 2, w: Math.max(1, right - left), h: Math.max(1, asc) };
        }
        x += m.measureText(ch).width + TRACKING * size;
      });
    });

    const dx = W / 2 - stem.x;
    const dy = H / 2 - stem.y;
    const maxScale = Math.max(W / stem.w, H / stem.h) * ZOOM_OVERSHOOT;

    function canvas(x, y, w, h) {
      const c = document.createElement("canvas");
      c.width = Math.ceil(w * dpr);
      c.height = Math.ceil(h * dpr);
      c.style.left = x + "px";
      c.style.top = y + "px";
      c.style.width = w + "px";
      c.style.height = h + "px";
      const ctx = c.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.translate(-x, -y); // draw in stage coordinates
      ctx.font = font;
      ctx.textBaseline = "alphabetic";
      return [c, ctx];
    }

    // 1. Black with every letter cut out. Extra margin covers the glide.
    const mx = Math.ceil(Math.abs(dx)) + 2;
    const my = Math.ceil(Math.abs(dy)) + 2;
    const [cut, cctx] = canvas(-mx, -my, W + 2 * mx, H + 2 * my);
    cctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#0A0A10";
    cctx.fillRect(-mx, -my, W + 2 * mx, H + 2 * my);
    cctx.globalCompositeOperation = "destination-out";
    cctx.fillStyle = "#000";
    glyphs.forEach((g) => cctx.fillText(g.ch, g.x, g.y));

    // 2 + 3 only need the band the text sits in
    const pad = Math.ceil(size * .15);
    const bandY = Math.floor(textTop - pad);
    const bandH = Math.ceil(blockH + 2 * pad);

    // 2. Thin outline around every letter
    const [line, lctx] = canvas(0, bandY, W, bandH);
    lctx.strokeStyle = "rgba(255,255,255,.25)";
    lctx.lineWidth = 1;
    lctx.lineJoin = "round";
    glyphs.forEach((g) => lctx.strokeText(g.ch, g.x, g.y));

    // 3. "2027" in solid black, faded in to close those holes
    const [fill, fctx] = canvas(0, bandY, W, bandH);
    fctx.fillStyle = cctx.fillStyle;
    fctx.strokeStyle = cctx.fillStyle;
    fctx.lineWidth = 2.5; // also covers the outline and the hole's anti-aliased edge
    fctx.lineJoin = "round";
    glyphs.filter((g) => !g.stays).forEach((g) => {
      fctx.fillText(g.ch, g.x, g.y);
      fctx.strokeText(g.ch, g.x, g.y);
    });

    cutout.replaceChildren(cut, line, fill);
    written.delete(line);
    written.delete(fill);
    written.delete(cutout);

    root.style.setProperty("--intro-ox", stem.x.toFixed(2) + "px");
    root.style.setProperty("--intro-oy", stem.y.toFixed(2) + "px");
    root.style.setProperty("--intro-text-top", textTop.toFixed(1) + "px");

    geo = { dx, dy, maxScale, line, fill };
    measureSection();
  }

  /* ---------- Render (transform + opacity only) ---------- */
  function render() {
    if (!geo) return;
    const p = cur.p;

    // Copy
    const hintO = 1 - ramp(p, 0, P_HINT_FADE_END);
    set(eyebrow, "opacity", (1 - ramp(p, P_HOLD_END, P_COPY_FADE_END)).toFixed(3));
    set(hint, "opacity", hintO.toFixed(3));
    root.classList.toggle("is-hint-gone", hintO === 0);

    // Glide: SPIP's "I" to the centre while 2027 closes up
    const g = easeInOutCubic(ramp(p, P_HOLD_END, P_GLIDE_END));
    set(geo.fill, "opacity", ramp(p, P_HOLD_END, P_HOLD_END + (P_GLIDE_END - P_HOLD_END) * .7).toFixed(3));

    // Dive: scale grows linearly with scroll (no easing)
    const t = ramp(p, P_GLIDE_END, P_DIVE_END);
    const s = 1 + (geo.maxScale - 1) * t;
    set(cutout, "transform", `translate3d(${(geo.dx * g).toFixed(2)}px, ${(geo.dy * g).toFixed(2)}px, 0) scale(${s.toFixed(4)})`);
    set(cutout, "opacity", (1 - ramp(t, 1 - DIVE_FADE, 1)).toFixed(3));
    set(geo.line, "opacity", (1 - ramp(t, 0, OUTLINE_FADE)).toFixed(3));
    root.classList.toggle("is-dived", p >= P_DIVE_END);
    set(shade, "opacity", ramp(t, .7, 1).toFixed(3));

    // Poster parallax
    set(bgImg, "transform", `translate3d(${(-cur.mx * BG_SHIFT).toFixed(2)}px, ${(-cur.my * BG_SHIFT).toFixed(2)}px, 0) scale(1.08)`);

    // COMING SOON: rises in, then follows the mouse the other way with a tilt
    const e = easeOutCubic(ramp(p, P_SOON_START, P_SOON_END));
    const sx = cur.mx * SOON_SHIFT * e;
    const sy = cur.my * SOON_SHIFT * e + (1 - e) * SOON_RISE;
    set(soon, "opacity", e.toFixed(3));
    set(soon, "transform", `perspective(900px) translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0) rotateX(${(-cur.my * SOON_TILT * e).toFixed(2)}deg) rotateY(${(cur.mx * SOON_TILT * e).toFixed(2)}deg)`);

    // Hand-off to the hero
    set(fade, "opacity", ramp(p, P_FADE_START, 1).toFixed(3));
  }

  /* ---------- Loop that sleeps ---------- */
  const progressNow = () => clamp01((window.scrollY - secTop) / secRange);

  function frame(now) {
    raf = 0;
    const dt = lastT ? Math.min(64, now - lastT) : 16.667;
    lastT = now;
    const f = dt / 16.667;
    const kp = 1 - Math.pow(1 - SCROLL_LERP, f);
    const km = 1 - Math.pow(1 - MOUSE_LERP, f);

    target.p = progressNow();
    cur.p += (target.p - cur.p) * kp;
    cur.mx += (target.mx - cur.mx) * km;
    cur.my += (target.my - cur.my) * km;

    const settled = Math.abs(target.p - cur.p) < SETTLE &&
      Math.abs(target.mx - cur.mx) < SETTLE && Math.abs(target.my - cur.my) < SETTLE;
    if (settled) {
      cur.p = target.p;
      cur.mx = target.mx;
      cur.my = target.my;
    }
    render();
    if (!settled && visible && live) raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (raf || !visible || !live) return;
    lastT = 0;
    raf = requestAnimationFrame(frame);
  }

  /* ---------- Events (they only store values and wake the loop) ---------- */
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    document.body.classList.toggle("intro-active", visible && live);
    if (visible) wake();
  });

  window.addEventListener("scroll", wake, { passive: true });

  window.addEventListener("pointermove", (e) => {
    if (!live || e.pointerType === "touch" || !finePointer.matches) return;
    target.mx = (e.clientX / (stageW || 1)) * 2 - 1;
    target.my = (e.clientY / (stageH || 1)) * 2 - 1;
    wake();
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => {
    target.mx = 0;
    target.my = 0;
    wake();
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!live) return;
      // Phone URL bars resize the window but not the 100svh stage: only redraw if the stage changed
      if (stage.clientWidth !== stageW || stage.clientHeight !== stageH) build();
      else measureSection();
      cur.p = target.p = progressNow();
      render();
    }, 150);
  }, { passive: true });

  /* ---------- On / off (reduced motion turns it off) ---------- */
  function enable() {
    if (live) return;
    const fontReady = document.fonts
      ? Promise.race([
          document.fonts.load("700 100px Kanit").then(() => document.fonts.ready),
          new Promise((r) => setTimeout(r, 3000)), // never wait forever for the web font
        ])
      : Promise.resolve();
    fontReady.catch(() => {}).then(() => {
      if (isReduced()) return;
      build();
      live = true;
      root.classList.add("is-live");
      cur.p = target.p = progressNow();
      render();
      io.observe(root);
    });
  }

  function disable() {
    live = false;
    cancelAnimationFrame(raf);
    raf = 0;
    io.disconnect();
    visible = false;
    document.body.classList.remove("intro-active");
    root.classList.remove("is-live", "is-dived", "is-hint-gone");
    for (const el of written.keys()) el.removeAttribute("style");
    written.clear();
    cutout.replaceChildren();
    geo = null;
  }

  reducedMotion.addEventListener("change", () => (isReduced() ? disable() : enable()));
  if (!isReduced()) enable();
})();
