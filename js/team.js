/* =================================================================
   About Us page (about.html): team members and the lead/team panel.
   Needs js/common.js loaded first.
   ================================================================= */
(function () {
  "use strict";

  /* ================================================================
     ★★★ EDIT TEAM MEMBERS & PHOTOS HERE ★★★
     1. Put square headshots (min 600×600, JPG/WebP) in  assets/team/
     2. Set photo: "assets/team/firstname.jpg". Leave "" to keep the placeholder avatar.
     ================================================================ */
  const TEAM = {
    leads: [
      // short: label used on phones, where space is tight
      { id: "ops", name: "Guts Tangjitpeanphong", role: "Head of Operations", short: "Head of Ops", photo: "assets/team/Guts.jpg" },
      { id: "lead", name: "Moshi Jearanaiphaisan", role: "Team Lead", short: "Team Lead", photo: "assets/team/Moshi.jpg" },
      { id: "pr", name: "Ja Pachsong", role: "Head of PR", short: "Head of PR", photo: "assets/team/Ja.jpg" },
    ],
    secretaries: [
      { name: "Phoom Pornlertphitiyakul", role: "Secretary", photo: "assets/team/Phoom.png" },
      { name: "Pan Chemnasiri", role: "Secretary", photo: "assets/team/Pan.jpg" },
    ],
    groups: {
      ops: [
        {
          title: "Logistics", members: [
            { name: "Kenta Takizawa", role: "Logistics", photo: "assets/team/KentaY10.jpg" },
            { name: "Pam Direkwattanachai", role: "Logistics", photo: "assets/team/Pam.jpg" },
            { name: "Cookie Kraikabkaew", role: "Logistics", photo: "assets/team/cookie.png" },
          ]
        },
        {
          title: "Finance", members: [
            { name: "Get Limbupasiriporn", role: "Finance", photo: "assets/team/GetY10.jpg" },
            { name: "Lee Srichaikul", role: "Finance", photo: "assets/team/Lee.jpg" },
          ]
        },
      ],
      lead: [
        {
          title: "Curriculum Planning", members: [
            { name: "Aimer Sookprasert", role: "Curriculum Planning", photo: "assets/team/Aimer.jpg" },
            { name: "Nemo Jentaweepornkul", role: "Curriculum Planning", photo: "assets/team/Nemo.png" },
          ]
        },
        {
          title: "Resources", members: [
            { name: "Putter Siripraiwan", role: "Resources", photo: "assets/team/Putter.JPG" },
            { name: "Korn Chanyasan", role: "Resources", photo: "assets/team/Korn.png" },
          ]
        },
      ],
      pr: [
        {
          title: "Marketing", members: [
            { name: "Love Chitsophon", role: "Marketing", photo: "assets/team/Love.JPG" },
            { name: "Win Sukapiriya", role: "Marketing", photo: "assets/team/Win.jpg" },
            { name: "Peter Kriengkomol", role: "Marketing", photo: "assets/team/Peter.png" },
          ]
        },
        {
          title: "Communications", members: [
            { name: "Marco Thanadsarng", role: "Communications", photo: "assets/team/Marco.jpg" },
            { name: "BamBam Techathanachuen", role: "Communications", photo: "assets/team/Bambam.jpg" },
            { name: "Nott Chookul", role: "Communications", photo: "assets/team/Nott.jpg" },
          ]
        },
      ],
    },
  };

  /* ---------- Team (About view) ---------- */
  let avatarCount = 0;
  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  }
  function avatarSVG(name) {
    const id = "av" + (++avatarCount);
    return `<svg class="avatar" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#4B3F78"/><stop offset=".5" stop-color="#C4449A"/><stop offset="1" stop-color="#F2622A"/>
        </linearGradient>
        <clipPath id="${id}c"><rect width="120" height="120" rx="8"/></clipPath>
      </defs>
      <g clip-path="url(#${id}c)">
        <rect width="120" height="120" fill="#1E1A2B"/>
        <rect width="120" height="120" fill="url(#${id}g)" opacity=".38"/>
        <circle cx="60" cy="50" r="23" fill="#fff" opacity=".09"/>
        <path d="M12 124c3-30 24-48 48-48s45 18 48 48z" fill="#fff" opacity=".09"/>
      </g>
      <text x="60" y="68" text-anchor="middle" font-family="Kanit, 'IBM Plex Sans Thai', sans-serif" font-weight="600" font-size="24" letter-spacing="1" fill="#F5F3F7">${escapeHTML(initials(name))}</text>
    </svg>`;
  }
  function photoHTML(person, cls) {
    if (person.photo) {
      return `<img class="avatar ${cls}" src="${escapeHTML(person.photo)}" alt="" width="600" height="600" loading="lazy" decoding="async" data-fallback="${escapeHTML(person.name)}">`;
    }
    return `<div class="${cls}">${avatarSVG(person.name)}</div>`;
  }
  function memberHTML(p) {
    return `<li class="member card">
      ${photoHTML(p, "member__photo")}
      <p class="member__name">${escapeHTML(p.name)}</p>
      <p class="member__role">${escapeHTML(p.role)}</p>
    </li>`;
  }

  function initTeam() {
    const leadsEl = $("[data-team-leads]");
    const panel = $("[data-team-panel]");
    const inner = $("[data-team-panel-inner]");
    const help = $("[data-team-help]");
    let selected = null;

    leadsEl.innerHTML = TEAM.leads.map((l) => `
      <button class="lead${l.id === "lead" ? " lead--center" : ""}" type="button" data-lead="${escapeHTML(l.id)}"
              aria-expanded="false" aria-controls="team-panel">
        ${photoHTML(l, "lead__photo")}
        <span class="lead__role"><span class="lead__role-full">${escapeHTML(l.role)}</span><span class="lead__role-short" aria-hidden="true">${escapeHTML(l.short || l.role)}</span></span>
        <span class="lead__name">${escapeHTML(l.name)}</span>
        <span class="lead__hint">View team
          <svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
        </span>
      </button>`).join("");

    function renderPanel() {
      if (!selected) {
        return `<div class="team-group">
          <h3 class="team-group__title">Secretaries</h3>
          <ul class="members">${TEAM.secretaries.map(memberHTML).join("")}</ul>
        </div>`;
      }
      const groups = TEAM.groups[selected] || [];
      const cls = groups.length > 1 ? "team-group team-group--multi" : "team-group";
      return groups.map((g) => `
        <div class="${cls}">
          <h3 class="team-group__title">${escapeHTML(g.title)}</h3>
          <ul class="members">${g.members.map(memberHTML).join("")}</ul>
        </div>`).join("");
    }

    function update(animate) {
      $$(".lead", leadsEl).forEach((b) => b.setAttribute("aria-expanded", String(b.dataset.lead === selected)));
      panel.dataset.team = selected || ""; // lets the CSS zoom the team out from this head
      const lead = TEAM.leads.find((l) => l.id === selected);
      help.textContent = lead
        ? `Showing the ${lead.role}'s team — tap again to return to the secretaries.`
        : "Showing the secretaries — tap a lead to see their team.";

      if (!animate || isReduced()) {
        inner.innerHTML = renderPanel();
        bindFallbacks(inner);
        return;
      }
      const from = panel.offsetHeight;
      panel.style.height = from + "px";
      inner.innerHTML = renderPanel();
      bindFallbacks(inner);
      inner.classList.remove("is-entering");
      void inner.offsetWidth;
      inner.classList.add("is-entering");
      const to = inner.offsetHeight;
      requestAnimationFrame(() => { panel.style.height = to + "px"; });
      const done = (e) => {
        if (e.target !== panel) return;
        panel.style.height = "";
        panel.removeEventListener("transitionend", done);
      };
      panel.addEventListener("transitionend", done);
      if (from === to) panel.style.height = "";
    }

    leadsEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-lead]");
      if (!btn) return;
      selected = selected === btn.dataset.lead ? null : btn.dataset.lead;
      update(true);
    });

    bindFallbacks(leadsEl);
    update(false);
  }

  // Swap a broken headshot for the generated placeholder avatar
  function bindFallbacks(ctx) {
    $$("img[data-fallback]", ctx).forEach((img) => {
      img.addEventListener("error", () => {
        const wrap = document.createElement("div");
        wrap.className = img.className.replace("avatar", "").trim();
        wrap.innerHTML = avatarSVG(img.dataset.fallback);
        img.replaceWith(wrap);
      }, { once: true });
    });
  }

  /* ---------- Boot ---------- */
  initNav();
  initLiquidGlass();
  setActiveNav("about");
  initTeam();
  initReveal();
  initScrollProgress();
})();
