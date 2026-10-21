/* =================================================================
   Notify-me forms (index.html hero and footer). Checks the form, then
   sends the email to the Events Team's Google Sheet through their
   Google Apps Script web app. That script checks everything again, so
   the checks here are only for quick feedback; it lives in the team's
   Google account, not in this repo.
   Cloudflare Turnstile (loaded in <head>) puts a single-use bot-check
   token into each form as the "cf-turnstile-response" field.
   Needs js/common.js loaded first.
   ================================================================= */
(function () {
  "use strict";

  // ▼▼▼ ★ APPS SCRIPT WEB APP URL (ends in /exec) ▼▼▼
  // When the script changes, edit the SAME deployment (Deploy → Manage deployments → new
  // version) so this URL stays the same. A brand-new deployment gets a new URL.
  const NOTIFY_URL = "https://script.google.com/a/macros/student.spip.in.th/s/AKfycbzzpJZNPT6zZNr38LtuezhzIwDfhdkTV0DBg8bGV57cqLLazMVryd0L2AlSWoFF1F4T/exec";

  const SEND_TIMEOUT_MS = 20000; // the script can wait up to 5 s for its lock, plus a cold start
  const TOKEN_WAIT_MS = 6000;    // how long to wait for Turnstile to finish its check in the background

  // The same email rule the Apps Script uses
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const BAD_START = /^[=+\-@]/; // would run as a spreadsheet formula

  const MSG = {
    sending:       "Sending…",
    ok:            "You're on the list — we'll email you when registration opens.",
    empty:         "Please enter your email address.",
    invalid_email: "That email looks wrong. Please check it.",
    consent:       "Please tick the box to agree to email updates.",
    no_turnstile:  "The spam check didn't load. Please refresh the page and try again.",
    error:         "Something went wrong. Please try again."
  };
  // What the Apps Script can answer with { ok: false, error: "…" }
  const SERVER_ERRORS = {
    invalid_email: MSG.invalid_email,
    bot_check:     "Please complete the check above and try again.",
    busy:          "Lots of sign-ups right now — please try again in a minute.",
    closed:        "Sign-ups are paused right now. Please check back soon."
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // The token Turnstile has put into this form, or "" while it's still checking
  const tokenOf = (form) => {
    const field = $('[name="cf-turnstile-response"]', form);
    return field ? field.value : "";
  };

  // Turnstile normally finishes long before anyone presses the button; on a slow
  // connection give it (and the script itself) a few more seconds
  async function waitForToken(form) {
    const until = Date.now() + TOKEN_WAIT_MS;
    while (!tokenOf(form) && Date.now() < until) await sleep(250);
    return tokenOf(form);
  }

  // Each token works once, so drop the used one and get a fresh one after every
  // send. Reset only this form's widget: with no argument Turnstile resets just one.
  function resetTurnstile(form) {
    const field = $('[name="cf-turnstile-response"]', form);
    if (field) field.value = "";
    const widget = $(".cf-turnstile", form);
    if (!window.turnstile || !widget) return;
    try { window.turnstile.reset(widget); } catch (err) { /* widget not rendered yet */ }
  }

  async function post(data) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SEND_TIMEOUT_MS);
    try {
      // A form-encoded body is a "simple" request, so there's no CORS preflight. Google
      // answers with a redirect to a one-time script.googleusercontent.com URL; fetch follows it.
      const res = await fetch(NOTIFY_URL, { method: "POST", body: new URLSearchParams(data), signal: ctrl.signal });
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function initNotifyForm(form) {
    const email = $('[name="email"]', form);
    const consent = $('[name="consent"]', form);
    const button = $('button[type="submit"]', form);
    const msg = $(".notify-msg", form);
    let sending = false;

    function say(text, state) {
      msg.textContent = text;
      msg.dataset.state = state;
    }
    function flag(field, text) {
      field.setAttribute("aria-invalid", "true");
      field.focus();
      say(text, "error");
    }

    email.addEventListener("input", () => email.removeAttribute("aria-invalid"));
    consent.addEventListener("change", () => consent.removeAttribute("aria-invalid"));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sending) return;

      const address = email.value.trim();
      if (!address) return flag(email, MSG.empty);
      if (!EMAIL_RE.test(address) || BAD_START.test(address) || address.length > 254) return flag(email, MSG.invalid_email);
      if (!consent.checked) return flag(consent, MSG.consent);

      sending = true;
      button.disabled = true;
      form.setAttribute("aria-busy", "true");
      say(MSG.sending, "pending");
      try {
        if (!(await waitForToken(form))) {
          // No script at all (blocked or offline), or a check the visitor still has to tick
          say(window.turnstile ? SERVER_ERRORS.bot_check : MSG.no_turnstile, "error");
          return;
        }
        const data = new FormData(form);
        data.set("email", address);
        // Credit where sign-ups come from (Instagram, poster QR, school email…) via ?utm_source=
        const utm = new URLSearchParams(location.search).get("utm_source");
        data.set("source", (utm && utm.trim()) || form.dataset.source);

        let out = null;
        try {
          out = await post(data);
        } finally {
          resetTurnstile(form);
        }
        const code = out && out.error;
        if (out && out.ok) { // a repeat sign-up also comes back ok (with duplicate: true)
          form.reset();
          say(MSG.ok, "success");
        } else if (code === "invalid_email") {
          flag(email, MSG.invalid_email);
        } else {
          say(Object.prototype.hasOwnProperty.call(SERVER_ERRORS, code) ? SERVER_ERRORS[code] : MSG.error, "error");
        }
      } catch (err) { // network down, timed out, or a reply that isn't JSON
        say(MSG.error, "error");
      } finally {
        sending = false;
        button.disabled = false;
        form.removeAttribute("aria-busy");
      }
    });
  }

  $$(".notify-form").forEach(initNotifyForm);
})();
