# Intro scroll scene: build spec for Claude Code

**Project:** SPIP Hack 2027 landing page, in this folder (`index.html`, `css/style.css`, `js/*.js`)
**Goal:** add an Apple-style, scroll-pinned intro **above** the existing hero (`<section class="hero" id="home">`).
**Reference:** the MacBook Pro page on apple.com. Its sections "pin" while you scroll, which creates sudden stops. Then a big image zooms through a letter-shaped cut-out, and headline text fades in.

> A first version of this was built and reverted because it was **unusably laggy**.
> Treat section 4 (Performance) as a hard requirement, not polish.

---

## 1. What the visitor sees

### Screen 1: landing, no scrolling yet
- The screen is **black** (`--bg: #0A0A10`).
- **"SPIP HACK 2027"** is set in huge display type (Kanit 700, uppercase), centred and filling about 85% of the width.
  - Desktop: one line.
  - Portrait or phone: stack it as `SPIP HACK` / `2027`.
- **The letters are holes in the black.** Through them you see the background picture (see 2.1), so the poster's colour "clips through" the letters.
- Small eyebrow above: `1st SPIP Hack · Cross-school innovation hackathon`.
- Small "Scroll" hint at the bottom (mouse icon with a moving dot). It fades as soon as scrolling starts.

### Then, as you scroll (the section stays pinned)
| Scroll progress `p` | What happens |
|---|---|
| 0.00 – 0.10 | **Hold.** Nothing moves except the mouse effects. This is the first "sudden stop". |
| 0.10 – 0.28 | Eyebrow and hint fade out. `HACK 2027` fades back to solid black and slides away. `SPIP` glides so the **"I" in SPIP** sits at the exact centre of the screen. |
| 0.28 – 0.60 | **Dive.** The camera zooms into the stem of that "I" (exponential zoom, so the speed feels constant), until the picture fills the whole screen. The black layer fades to 0 over the last ~15% of the dive. |
| 0.60 – 0.68 | **Hold** on the full-screen picture. Second "sudden stop". |
| 0.68 – 0.88 | The **COMING SOON layer** (see 2.2) rises in and settles. It reacts to the mouse from here on. |
| 0.88 – 1.00 | **Hold**, then the pin releases. The last few % fade the bottom of the scene into `--bg`, so it flows into the existing hero. |

Keep these breakpoints as named constants at the top of the JS file so they're easy to tune.

---

## 2. Layers (back to front)

### 2.1 Background picture (replaces the old CSS gradient)
- Use the **existing poster image**, made to **fill the whole viewport** (`object-fit: cover`, centred):
  - desktop: `assets/posters/hero-banner-16x9.webp`
  - phone: `assets/posters/hero-banner-3x4.webp`
  - Use a `<picture>` element with the same sources and `media` queries the hero already uses.
- **No animated CSS gradients** and no `filter` on this layer.
- Mouse reaction: a gentle parallax only, applied **only** through `transform: translate3d(...) scale(1.08)` on the `<img>` (max ±12px). The 1.08 scale stops the edges showing during the parallax.
- ⚠️ The poster already has "COMING SOON" baked into the image. Once it's full-screen, this will clash with the separate COMING SOON layer. Options, in order of preference:
  1. Use a **text-free version** of the banner if the designer can export one. Ask the user for it; the file name would be something like `hero-banner-clean-16x9.webp`.
  2. Otherwise, at full screen, add a soft dark overlay (`rgba(10,10,16,.45)`) so the baked-in text recedes behind the new layer.

### 2.2 COMING SOON layer (its own element, reacts to the mouse)
- A separate DOM layer above the picture: real text in HTML, **not** part of the image. Kanit 700, uppercase, large (`clamp(3rem, 1rem + 9vw, 9.5rem)`), white, with a subtle text-shadow for legibility.
- It is hidden until the dive is done (`p ≥ 0.68`). It enters with `opacity` plus `translateY`, and nothing else.
- **Mouse reaction:**
  - the layer moves opposite to the background picture (about ±20px), giving a depth effect;
  - it gets a slight 3D tilt (`rotateX` / `rotateY`, max 6°);
  - all of this goes through **one** `transform` on the layer, eased with a lerp of about 0.1 per frame.
- Optional small line under it: `Hackathon · 6–7 March 2027 (tentative)`. Take the date from `EVENT_DATE` in `js/home.js`; don't hard-code a second copy.

### 2.3 Black cut-out layer ("SPIP HACK 2027" holes)
- Full-screen black with the letters cut out, so the picture shows through.
- Plus a thin outline (`rgba(255,255,255,.25)`, about 1px) around the letters for a crisp edge.
- How it zooms is the main performance decision; see section 4.2.

### 2.4 Copy and hint
- Eyebrow, scroll hint and bottom fade-out, positioned absolutely inside the pinned stage.

---

## 3. Structure

New files only, plus minimal edits to existing ones:

- `css/intro.css`: all intro styles. Link it after `css/style.css`.
- `js/intro.js`: all intro behaviour. Load it after `js/home.js`.
- `index.html`: insert `<section class="intro">…</section>` right before the `<!-- 1. Hero + countdown -->` comment.
- `js/home.js` → `initParallax()`: measure scroll **relative to the hero**:
  ```js
  const y = Math.max(0, window.scrollY - hero.offsetTop);
  ```
  Without this, the existing banner fade breaks once the intro sits above it.
- `css/style.css`: when `.intro` precedes `.hero`, reduce `.hero`'s top padding (the nav is no longer covering it).

Skeleton:
```html
<section class="intro" aria-label="SPIP Hack 2027 — coming soon">
  <div class="intro__stage">                <!-- position: sticky; top: 0; height: 100svh; overflow: hidden -->
    <picture class="intro__bg">…</picture>  <!-- 2.1 -->
    <div class="intro__soon" aria-hidden="true">Coming soon</div>   <!-- 2.2 -->
    <div class="intro__cutout">…</div>      <!-- 2.3 -->
    <p class="intro__eyebrow">…</p>
    <p class="intro__hint">…</p>
  </div>
</section>
```
- The section is about `400svh` tall, which gives about 300svh of pinned scroll.
- The existing `<h1>` in the hero stays the page's only `h1`. Mark the intro's visual text `aria-hidden` and give the section an `aria-label`.

---

## 4. Performance (hard requirements)

### 4.1 Why v1 lagged; do NOT repeat these
1. **Full-screen CSS gradients changed every frame.** Five `radial-gradient`s driven by CSS custom properties, plus `filter: saturate()`, on a layer 120% of the viewport. That forces a full repaint on every frame.
2. **An SVG `<mask>` re-rendered every frame.** The zoom changed the SVG `viewBox` on each scroll frame, so the browser re-rasterised the mask and the glyphs at 60–120 Hz. The mask region was also huge (40,000 units), which glitched badly at deep zoom.
3. **The glass navbar on top of moving content.** The header uses `backdrop-filter` with an SVG displacement filter (`html.lg-refract`, `url(#lg-refract)`). Every repaint underneath forces that filter to recompute. This is the single most expensive thing on the page.
4. **`filter: blur()` animated on headline words.**
5. **A `requestAnimationFrame` loop that never stopped.** It kept rendering even when the mouse and scroll were idle.

### 4.2 Rules for v2
- **Only animate `transform` and `opacity`.** No animated `filter`, `clip-path`, `mask` geometry, gradients, `viewBox`, `width`/`height` or custom properties that feed paint.
- **Cut-out zoom:** draw the black layer with its letter holes **once**, then zoom it with `transform: scale()` on a wrapper that has `will-change: transform`. Options:
  - an inline SVG (`<rect>` masked by `<text>`) that is never re-laid-out during scroll, only transformed; or
  - a `<canvas>` sized to the viewport × `devicePixelRatio`, redrawn **only on resize or font load**.

  Set `transform-origin` to the measured centre of the "I" stem. Cap the scale at whatever just covers the screen (usually 30–60×). Fade the layer's `opacity` to 0 over the last part of the dive, so soft edges at high zoom are never seen.
- **Navbar during the intro:** while the intro stage is on screen, give the header a solid fill (for example `background: rgba(10,10,16,.85)`) and `backdrop-filter: none`. Toggle a class like `body.intro-active`. Restore the glass after the intro.
- **One rAF loop that sleeps:**
  - it runs only while the intro is intersecting (IntersectionObserver);
  - it stops when scroll progress and the eased mouse position have both settled (difference below 0.001);
  - scroll and pointer events just store values and wake the loop.
- **No layout reads inside the loop.** Measure sizes and glyph positions on load, `resize` (debounced) and `document.fonts.ready`. Read scroll as `window.scrollY` minus the cached section top.
- **Turn off smooth scrolling while pinned.** If `html { scroll-behavior: smooth }` is set, make sure it doesn't fight wheel input. Use `scroll-behavior: auto` on `html` while the intro is active.
- **Mouse effects only on fine pointers** (`(pointer: fine)`). On touch, skip the parallax entirely rather than animating a drift.
- **Image:** keep `fetchpriority="high"` on the intro background. Remove or adjust the existing hero-banner `preload`, so the same file isn't fetched with two different priorities.

### 4.3 How to verify
- Chrome DevTools → Performance → record 5 s of scrolling through the intro on a 4× CPU throttle. There should be no long tasks, the frame rate should stay near 60 fps, and the "Paint" bars should be close to zero during scroll.
- DevTools → Rendering → **Paint flashing**: nothing in the intro should flash green while scrolling. Only the initial paint and resizes should.
- Test on an M1 MacBook (8 GB) in Safari and Chrome, plus a mid-range phone.

---

## 5. Accessibility and fallbacks
- `prefers-reduced-motion: reduce`:
  - no pinning: the section is just `100svh`;
  - show the picture full-screen with COMING SOON on top;
  - no zoom, no parallax, no tilt.
- No JS: the same static version (style the section without the `.is-live` class).
- All intro text is decorative (`aria-hidden`). Keyboard users can Tab straight to the nav, and the skip link still works.
- Deep links like `index.html#event` must still land on the right section. The intro must not hijack the scroll position.

---

## 6. Done when
- [ ] The first screen shows black with "SPIP HACK 2027" letters revealing the poster through them.
- [ ] Scrolling holds, then dives through the "I" in SPIP to the full-screen poster, holds again, then COMING SOON appears.
- [ ] The poster fills the screen (cover) and parallaxes slightly with the mouse.
- [ ] COMING SOON is its own layer and tilts and moves with the mouse, opposite to the background.
- [ ] Smooth on an M1 MacBook Air or Pro in Safari and Chrome; paint flashing is clean.
- [ ] Reduced-motion and mobile versions look right.
- [ ] The existing hero, countdown, carousel and glass nav all still work below the intro.
- [ ] Only `css/intro.css` and `js/intro.js` are new, plus the small edits listed in section 3.

## 7. Open question for the user
- Is there a **text-free export** of the hero banner? If yes, use it for 2.1. If not, use the dark-overlay fallback.
