/* Bootstrap: tab navigation, settings drawer (API key / model / creativity / effort /
   demo mode / cache), and the company-profile editor. */
(function () {
  const { el, escapeHtml, toast } = COCKPIT.ui;
  const S = COCKPIT.store;
  const ORDER = ["scanning", "interpretation", "sparring", "ideator", "automator", "about"];
  let current = null;

  function goTab(name) {
    if (!COCKPIT.tabs[name]) name = "scanning";
    current = name;
    document.querySelectorAll(".nav-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    const root = el("#view");
    root.innerHTML = "";
    COCKPIT.tabs[name].render(root);
    history.replaceState(null, "", "#" + name);
    window.scrollTo(0, 0);
  }

  function buildNav() {
    const nav = el("#nav");
    nav.innerHTML = ORDER.map((k) => {
      const t = COCKPIT.tabs[k];
      return `<button class="nav-tab" data-tab="${k}"><span class="nav-ic">${t.icon}</span>
        <span class="nav-txt"><strong>${t.title}</strong><em>${t.sub}</em></span></button>`;
    }).join("");
    nav.querySelectorAll(".nav-tab").forEach((b) => (b.onclick = () => goTab(b.dataset.tab)));
  }

  function refreshStatus() {
    const hasKey = COCKPIT.api.hasKey();
    const demo = S.getDemoMode();
    const badge = el("#mode-badge");
    if (demo || !hasKey) { badge.className = "mode demo"; badge.textContent = demo ? "Demo-Modus" : "Kein API-Key — Demo"; }
    else { badge.className = "mode live"; badge.textContent = "Live · " + S.getSettings().model; }
  }

  /* ----- Settings drawer ----- */
  function openDrawer(id) { el("#" + id).classList.add("open"); el("#scrim").classList.add("on"); }
  function closeDrawers() { document.querySelectorAll(".drawer").forEach((d) => d.classList.remove("open")); el("#scrim").classList.remove("on"); }

  function buildSettings() {
    const s = S.getSettings();
    const opts = COCKPIT.config.models.map((m) => `<option value="${m.id}" ${m.id === s.model ? "selected" : ""}>${escapeHtml(m.label)}</option>`).join("");
    el("#settings-body").innerHTML = `
      <label class="fld"><span>Anthropic API-Key</span>
        <input type="password" id="set-key" placeholder="sk-ant-…" value="${escapeHtml(S.getKey())}" autocomplete="off">
        <small>Bleibt nur lokal im Browser (localStorage). Wird ausschließlich direkt an api.anthropic.com gesendet.</small>
      </label>
      <label class="fld"><span>Modell</span><select id="set-model">${opts}</select>
        <small id="set-model-note"></small></label>
      <label class="fld"><span>Kreativität / „Temperatur“: <strong id="set-crea-v">${s.creativity.toFixed(2)}</strong></span>
        <input type="range" id="set-crea" min="0" max="1" step="0.05" value="${s.creativity}"></label>
      <label class="fld"><span>Effort (Denktiefe)</span>
        <select id="set-effort">
          ${["low", "medium", "high"].map((e) => `<option ${e === s.effort ? "selected" : ""}>${e}</option>`).join("")}
        </select></label>
      <label class="fld toggle"><input type="checkbox" id="set-demo" ${S.getDemoMode() ? "checked" : ""}>
        <span>Demo-Modus (vorab berechnete Beispieldaten, keine API-Kosten)</span></label>
      <div class="row">
        <button class="btn" id="set-clearcache">Cache leeren</button>
        <button class="btn primary" id="set-save">Speichern</button>
      </div>
      <p class="muted small">Antworten werden ${s.cacheTtlMin / 60} h lokal gecached, um Kosten & Wartezeit zu sparen.</p>`;

    const modelNote = el("#set-model-note");
    const updNote = () => {
      const m = modelById(el("#set-model").value);
      modelNote.textContent = m.temperature
        ? "akzeptiert den Temperatur-Parameter — die Kreativität wirkt direkt."
        : "akzeptiert keinen Temperatur-Parameter (Opus-4.8-Tier) — Kreativität steuert dann den Prompt-Stil.";
    };
    el("#set-model").onchange = updNote; updNote();
    el("#set-crea").oninput = (e) => (el("#set-crea-v").textContent = (+e.target.value).toFixed(2));
    el("#set-clearcache").onclick = () => toast(S.cacheClear() + " Cache-Einträge gelöscht.");
    el("#set-save").onclick = () => {
      S.setKey(el("#set-key").value.trim());
      S.setSettings({ model: el("#set-model").value, creativity: +el("#set-crea").value,
        effort: el("#set-effort").value, cacheTtlMin: s.cacheTtlMin });
      S.setDemoMode(el("#set-demo").checked);
      closeDrawers(); refreshStatus(); toast("Einstellungen gespeichert.");
      goTab(current); // re-render with new mode
    };
  }

  /* ----- Profile editor ----- */
  function buildProfile() {
    const p = S.getProfile();
    const f = (k, label, rows) => `<label class="fld"><span>${label}</span>
      <textarea id="pf-${k}" rows="${rows || 2}">${escapeHtml(p[k] || "")}</textarea></label>`;
    el("#profile-body").innerHTML =
      `<label class="fld"><span>Name</span><input id="pf-name" value="${escapeHtml(p.name)}"></label>` +
      f("oneLiner", "Kurzbeschreibung") + f("products", "Produkte / Leistungen", 3) +
      f("markets", "Märkte / Kund:innen") + f("technologies", "Technologien") +
      f("dependencies", "Abhängigkeiten / Partner") + f("positioning", "Positionierung / Werte") +
      f("context", "Kontext", 3) +
      `<div class="row"><button class="btn" id="pf-reset">Auf uCORE zurücksetzen</button>
        <button class="btn primary" id="pf-save">Profil speichern</button></div>`;
    el("#pf-save").onclick = () => {
      const np = {};
      ["name", "oneLiner", "products", "markets", "technologies", "dependencies", "positioning", "context"]
        .forEach((k) => (np[k] = (el("#pf-" + k).value || "").trim()));
      S.setProfile(np); S.cacheClear(); closeDrawers(); toast("Profil gespeichert (Cache geleert)."); goTab(current);
    };
    el("#pf-reset").onclick = () => { S.resetProfile(); S.cacheClear(); buildProfile(); toast("Profil zurückgesetzt."); };
  }

  function boot() {
    buildNav();
    el("#btn-settings").onclick = () => { buildSettings(); openDrawer("settings"); };
    el("#btn-profile").onclick = () => { buildProfile(); openDrawer("profile"); };
    el("#scrim").onclick = closeDrawers;
    document.querySelectorAll(".drawer-close").forEach((b) => (b.onclick = closeDrawers));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawers(); });

    refreshStatus();
    const start = (location.hash || "").replace("#", "");
    goTab(ORDER.includes(start) ? start : "scanning");

    // First-run hint
    if (!COCKPIT.api.hasKey() && !S.getDemoMode()) {
      setTimeout(() => toast("Tipp: ⚙︎ API-Key eintragen für Live-Analysen — oder direkt im Demo-Modus loslegen.", ""), 600);
    }
  }

  COCKPIT.app = { goTab, refreshStatus };
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
