/* The six working areas (tabs), each mapped to Perkhofer's framework:
   Lagebild=Scanning, Interpretation, Sparringspartner, Ideengeber=Ideator,
   Automator, Methodik=trust/uncertainty + fit-misfit theory. */
(function () {
  const { h, md, escapeHtml, confidence, costLine, sourceList, spinner, toast, errMsg } = COCKPIT.ui;
  const S = COCKPIT.store;
  COCKPIT.state = { lastScan: null, interpretations: [], sparring: [], lastIdeas: null, lastBriefing: null };

  const isDemo = () => S.getDemoMode() || !COCKPIT.api.hasKey();
  function demoBadge() {
    return isDemo() ? `<span class="demo-pill" title="Es werden vorab berechnete Beispieldaten gezeigt — keine API-Kosten.">DEMO-Daten</span>` : "";
  }
  // tiny delay so the spinner is visible in demo mode
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function trustFooter() {
    return `<p class="trust-note">⚠︎ KI ist hier <strong>Sensegiver</strong>, nicht Orakel. Jede Ausgabe ist eine Hypothese —
      kritisch prüfen, gegen eigene Erfahrung spiegeln. Wahrgenommene Sicherheit ≠ tatsächliche Sicherheit (Perkhofer 2026).</p>`;
  }

  /* ---------------------------------------------------------------- Lagebild / Scanning */
  const scanning = {
    title: "Lagebild",
    icon: "🛰️",
    sub: "Scanning",
    render(root) {
      root.innerHTML = `
        <div class="tab-head">
          <div>
            <h2>Strategisches Umfeld-Scanning ${demoBadge()}</h2>
            <p class="lead">Schwache Signale aufspüren und in drei Spalten einordnen — inkl. der bewusst gewollten
            Mitte „vermeintlich irrelevant“, wo sonst trügerische Sicherheit entsteht.</p>
          </div>
          <button class="btn primary" id="scan-run">Umfeld scannen ${isDemo() ? "" : "🔎"}</button>
        </div>
        <div id="scan-meta" class="meta-row"></div>
        <div id="scan-out"></div>`;
      const out = root.querySelector("#scan-out");
      if (COCKPIT.state.lastScan) renderScan(out, root, COCKPIT.state.lastScan);
      else out.innerHTML = `<div class="placeholder">Noch kein Lagebild. Klick auf <em>Umfeld scannen</em> — bei aktivem API-Key sucht Claude live im Web (${escapeHtml(S.getProfile().name)}).</div>`;

      root.querySelector("#scan-run").onclick = () => doScan(root, out);
    }
  };
  async function doScan(root, out) {
    const meta = root.querySelector("#scan-meta");
    out.innerHTML = spinner("Suche & sortiere aktuelle Entwicklungen…");
    meta.innerHTML = "";
    try {
      let res;
      if (isDemo()) { await wait(650); res = COCKPIT.DEMO.scanning; }
      else {
        const p = COCKPIT.prompts.scanning(S.getSettings().creativity);
        res = await COCKPIT.api.run({
          tab: "scanning", cachePayload: { v: 2 },
          system: p.system, messages: [{ role: "user", content: p.user }],
          webSearch: true, maxSearches: 6, maxTokens: 6000, effort: "medium",
          temperature: S.getSettings().creativity
        });
        if (!res.json || !res.json.items) throw new Error("Antwort ohne verwertbares JSON. Bitte erneut versuchen.");
      }
      COCKPIT.state.lastScan = res;
      renderScan(out, root, res);
      meta.innerHTML = costLine(res);
    } catch (e) { out.innerHTML = `<div class="error">${escapeHtml(errMsg(e))}</div>`; }
  }
  function renderScan(out, root, res) {
    const items = (res.json && res.json.items) || [];
    const cols = { risk: [], neutral: [], opportunity: [] };
    items.forEach((it) => (cols[it.category] || cols.neutral).push(it));
    const colDef = [
      { k: "risk", t: "Neue Risiken", c: "col-risk", hint: "Bedrohungen & erhöhte Risiken" },
      { k: "neutral", t: "Vermeintlich irrelevant", c: "col-neutral", hint: "Wirkt belanglos — genau hier lauert trügerische Sicherheit" },
      { k: "opportunity", t: "Chancen", c: "col-opp", hint: "Hebel & Anschlussmöglichkeiten" }
    ];
    out.innerHTML = `<div class="cols">` + colDef.map((c) => `
      <section class="col ${c.c}">
        <header><h3>${c.t}</h3><span class="col-count">${cols[c.k].length}</span><p class="col-hint">${c.hint}</p></header>
        <div class="cards">${cols[c.k].map(cardHtml).join("") || '<div class="empty">—</div>'}</div>
      </section>`).join("") + `</div>` + sourceList(res.sources) + trustFooter();

    out.querySelectorAll("[data-interpret]").forEach((btn) => {
      btn.onclick = () => {
        const it = items[+btn.getAttribute("data-interpret")];
        COCKPIT.state.pendingIssue = `${it.title} — ${it.summary} ${it.implication ? "(" + it.implication + ")" : ""}`;
        COCKPIT.app.goTab("interpretation");
      };
    });
  }
  function cardHtml(it, i) {
    const idx = COCKPIT.state.lastScan && COCKPIT.state.lastScan.json.items.indexOf(it);
    const src = it.source_url ? `<a class="card-src" href="${escapeHtml(it.source_url)}" target="_blank" rel="noopener">Quelle ↗</a>` : "";
    const hz = it.horizon ? `<span class="tag">${escapeHtml(it.horizon)}fristig</span>` : "";
    return `<article class="card">
      <h4>${escapeHtml(it.title)}</h4>
      <p>${escapeHtml(it.summary)}</p>
      ${it.implication ? `<p class="impl">→ ${escapeHtml(it.implication)}</p>` : ""}
      <div class="card-foot">${confidence(it.confidence != null ? it.confidence : 0.5)} ${hz} ${src}
        <button class="btn tiny" data-interpret="${idx}">Interpretieren →</button></div>
    </article>`;
  }

  /* ----------------------------------------------------------------- Interpretation */
  const interpretation = {
    title: "Interpretation", icon: "🧭", sub: "Sensemaking",
    render(root) {
      const pending = COCKPIT.state.pendingIssue || "";
      COCKPIT.state.pendingIssue = null;
      root.innerHTML = `
        <div class="tab-head"><div>
          <h2>Interpretation ${demoBadge()}</h2>
          <p class="lead">Vom Signal zur Deutung — Implikationen, Effekte zweiter Ordnung und das, was wir noch
          <em>nicht</em> wissen. Interpretation ist selten schwarz-weiß.</p>
        </div></div>
        <textarea id="interp-in" class="ta" rows="3" placeholder="Signal, News oder Thema einfügen…">${escapeHtml(pending)}</textarea>
        <div class="row"><button class="btn primary" id="interp-run">Interpretieren</button>
          <span class="meta" id="interp-meta"></span></div>
        <div id="interp-out"></div>`;
      const out = root.querySelector("#interp-out");
      root.querySelector("#interp-run").onclick = () => doInterpret(root, out);
      if (pending) doInterpret(root, out);
    }
  };
  async function doInterpret(root, out) {
    const text = root.querySelector("#interp-in").value.trim();
    if (!text) { toast("Bitte ein Signal oder Thema eingeben."); return; }
    out.innerHTML = spinner("Deute Implikationen…");
    root.querySelector("#interp-meta").innerHTML = "";
    try {
      let res;
      if (isDemo()) { await wait(600); res = COCKPIT.DEMO.interpretation; }
      else {
        const p = COCKPIT.prompts.interpretation(text, S.getSettings().creativity);
        res = await COCKPIT.api.run({ tab: "interpretation", cachePayload: { t: text },
          system: p.system, messages: [{ role: "user", content: p.user }],
          maxTokens: 3000, effort: "high", temperature: S.getSettings().creativity });
      }
      const conf = (res.text.match(/KONFIDENZ:\s*(\w+)/i) || [])[1];
      const bodyText = res.text.replace(/^KONFIDENZ:.*$/im, "").trim();
      COCKPIT.state.interpretations.push({ q: text, a: res.text });
      out.innerHTML = `<div class="result">${conf ? `<div class="conf-banner">${confidence(conf)}</div>` : ""}
        ${md(bodyText)}</div>${sourceList(res.sources)}${trustFooter()}`;
      root.querySelector("#interp-meta").innerHTML = costLine(res);
    } catch (e) { out.innerHTML = `<div class="error">${escapeHtml(errMsg(e))}</div>`; }
  }

  /* ----------------------------------------------------------------- Sparringspartner */
  const sparring = {
    title: "Sparringspartner", icon: "⚔️", sub: "Bias-Check",
    render(root) {
      root.innerHTML = `
        <div class="tab-head"><div>
          <h2>Sparringspartner ${demoBadge()}</h2>
          <p class="lead">Ein unparteiischer Gegenüber, der Annahmen und Denkfehler herausfordert — gegen
          Confirmation-Bias und Gruppendenken.</p>
        </div></div>
        <div id="spar-log" class="chat-log"></div>
        <div class="row">
          <textarea id="spar-in" class="ta" rows="2" placeholder="Strategische Annahme oder Plan, an dem gerüttelt werden soll…"></textarea>
          <button class="btn primary" id="spar-send">Herausfordern</button>
        </div><span class="meta" id="spar-meta"></span>`;
      const log = root.querySelector("#spar-log");
      renderLog(log);
      root.querySelector("#spar-send").onclick = () => doSpar(root, log);
      root.querySelector("#spar-in").addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) doSpar(root, log);
      });
    }
  };
  function renderLog(log) {
    if (!COCKPIT.state.sparring.length) {
      log.innerHTML = `<div class="placeholder">Formuliere eine Annahme — z. B. „Unsere Datensouveränität ist der entscheidende Wettbewerbsvorteil.“</div>`;
      return;
    }
    log.innerHTML = COCKPIT.state.sparring.map((m) =>
      `<div class="bubble ${m.role}">${m.role === "user" ? escapeHtml(m.content) : md(m.content)}</div>`).join("");
    log.scrollTop = log.scrollHeight;
  }
  async function doSpar(root, log) {
    const inp = root.querySelector("#spar-in");
    const text = inp.value.trim();
    if (!text) return;
    COCKPIT.state.sparring.push({ role: "user", content: text });
    inp.value = "";
    renderLog(log);
    log.insertAdjacentHTML("beforeend", spinner("Suche Gegenargumente…"));
    try {
      let reply;
      if (isDemo()) { await wait(600); reply = COCKPIT.DEMO.sparring.text; }
      else {
        const hist = COCKPIT.state.sparring.map((m) => ({ role: m.role, content: m.content }));
        const p = COCKPIT.prompts.sparring(hist, S.getSettings().creativity);
        const res = await COCKPIT.api.run({ system: p.system, messages: p.messages,
          maxTokens: 1400, effort: "medium", temperature: S.getSettings().creativity, useCache: false });
        reply = res.text;
        root.querySelector("#spar-meta").innerHTML = costLine(res);
      }
      COCKPIT.state.sparring.push({ role: "assistant", content: reply });
      renderLog(log);
    } catch (e) {
      COCKPIT.state.sparring.pop();
      renderLog(log);
      toast(errMsg(e), "err");
    }
  }

  /* ----------------------------------------------------------------- Ideengeber / Ideator */
  const ideator = {
    title: "Ideengeber", icon: "💡", sub: "Ideator",
    render(root) {
      const s = S.getSettings();
      root.innerHTML = `
        <div class="tab-head"><div>
          <h2>Ideengeber ${demoBadge()}</h2>
          <p class="lead">Kreative, laterale Wechselwirkungen zwischen einem Trend und dem Geschäftsmodell —
          den strategischen Horizont erweitern.</p>
        </div></div>
        <div class="creativity">
          <label for="crea">Kreativität / „Temperatur“: <strong id="crea-val">${s.creativity.toFixed(2)}</strong></label>
          <input type="range" id="crea" min="0" max="1" step="0.05" value="${s.creativity}">
          <span class="meta" id="crea-hint"></span>
        </div>
        <textarea id="idea-in" class="ta" rows="2" placeholder="Trend / Thema / Impuls — z. B. „KI-Agenten in der Pflegedokumentation“…"></textarea>
        <div class="row"><button class="btn primary" id="idea-run">Ideen erzeugen</button>
          <span class="meta" id="idea-meta"></span></div>
        <div id="idea-out"></div>`;
      const crea = root.querySelector("#crea"), val = root.querySelector("#crea-val"), hint = root.querySelector("#crea-hint");
      const updHint = () => {
        const v = +crea.value;
        const m = modelById(S.getSettings().model);
        hint.textContent = m.temperature
          ? `steuert Prompt-Stil + Temperatur-Parameter (${m.id})`
          : `steuert den Prompt-Stil (${m.id} akzeptiert keinen Temperatur-Parameter)`;
      };
      crea.oninput = () => { val.textContent = (+crea.value).toFixed(2); const set = S.getSettings(); set.creativity = +crea.value; S.setSettings(set); updHint(); };
      updHint();
      const out = root.querySelector("#idea-out");
      if (COCKPIT.state.lastIdeas) out.innerHTML = COCKPIT.state.lastIdeas;
      root.querySelector("#idea-run").onclick = () => doIdeas(root, out);
    }
  };
  async function doIdeas(root, out) {
    const text = root.querySelector("#idea-in").value.trim();
    if (!text) { toast("Bitte einen Trend oder Impuls eingeben."); return; }
    out.innerHTML = spinner("Spinne Wechselwirkungen…");
    root.querySelector("#idea-meta").innerHTML = "";
    try {
      let res;
      if (isDemo()) { await wait(650); res = COCKPIT.DEMO.ideator; }
      else {
        const p = COCKPIT.prompts.ideator(text, S.getSettings().creativity);
        res = await COCKPIT.api.run({ tab: "ideator", cachePayload: { t: text, c: S.getSettings().creativity },
          system: p.system, messages: [{ role: "user", content: p.user }],
          maxTokens: 2600, effort: "medium", temperature: S.getSettings().creativity });
      }
      COCKPIT.state.lastIdeas = `<div class="result">${md(res.text)}</div>${trustFooter()}`;
      out.innerHTML = COCKPIT.state.lastIdeas;
      root.querySelector("#idea-meta").innerHTML = costLine(res);
    } catch (e) { out.innerHTML = `<div class="error">${escapeHtml(errMsg(e))}</div>`; }
  }

  /* ----------------------------------------------------------------- Automator */
  const automator = {
    title: "Automator", icon: "⚙️", sub: "Briefing",
    render(root) {
      root.innerHTML = `
        <div class="tab-head"><div>
          <h2>Automator ${demoBadge()}</h2>
          <p class="lead">Verdichtet Lagebild und Interpretationen zu einer vorstandstauglichen
          Management-Vorlage — repetitive Aufbereitung übernimmt die KI.</p>
        </div></div>
        <div class="row">
          <button class="btn primary" id="auto-run">Management-Briefing erstellen</button>
          <button class="btn" id="auto-copy" disabled>Markdown kopieren</button>
          <span class="meta" id="auto-meta"></span>
        </div>
        <div id="auto-status" class="meta"></div>
        <div id="auto-out"></div>`;
      const out = root.querySelector("#auto-out");
      const status = root.querySelector("#auto-status");
      const n = (COCKPIT.state.lastScan ? (COCKPIT.state.lastScan.json.items || []).length : 0);
      status.textContent = isDemo() ? "Demo: nutzt das Beispiel-Lagebild." :
        `Material: ${n} Lagebild-Einträge · ${COCKPIT.state.interpretations.length} Interpretation(en).`;
      if (COCKPIT.state.lastBriefing) out.innerHTML = COCKPIT.state.lastBriefing;
      root.querySelector("#auto-run").onclick = () => doAuto(root, out);
      root.querySelector("#auto-copy").onclick = () => {
        navigator.clipboard.writeText(COCKPIT.state._briefingMd || "").then(() => toast("Markdown kopiert.")); };
    }
  };
  function gatherMaterial() {
    let m = "";
    const scan = COCKPIT.state.lastScan;
    if (scan && scan.json && scan.json.items) {
      m += "LAGEBILD:\n" + scan.json.items.map((it) =>
        `[${it.category}] ${it.title}: ${it.summary} → ${it.implication || ""}`).join("\n") + "\n\n";
    }
    if (COCKPIT.state.interpretations.length) {
      m += "INTERPRETATIONEN:\n" + COCKPIT.state.interpretations.map((x) => `Q: ${x.q}\n${x.a}`).join("\n---\n");
    }
    return m.trim();
  }
  async function doAuto(root, out) {
    out.innerHTML = spinner("Verdichte zum Briefing…");
    root.querySelector("#auto-meta").innerHTML = "";
    try {
      let res;
      if (isDemo()) { await wait(650); res = COCKPIT.DEMO.automator; }
      else {
        const material = gatherMaterial();
        if (!material) { out.innerHTML = `<div class="placeholder">Noch kein Material. Erst im <em>Lagebild</em> scannen (und ggf. interpretieren), dann hier verdichten.</div>`; return; }
        const p = COCKPIT.prompts.automator(material);
        res = await COCKPIT.api.run({ tab: "automator", cachePayload: { m: material.slice(0, 400), n: material.length },
          system: p.system, messages: [{ role: "user", content: p.user }], maxTokens: 2600, effort: "high" });
      }
      COCKPIT.state._briefingMd = res.text;
      COCKPIT.state.lastBriefing = `<div class="result briefing">${md(res.text)}</div>${trustFooter()}`;
      out.innerHTML = COCKPIT.state.lastBriefing;
      root.querySelector("#auto-meta").innerHTML = costLine(res);
      const copy = root.querySelector("#auto-copy"); if (copy) copy.disabled = false;
    } catch (e) { out.innerHTML = `<div class="error">${escapeHtml(errMsg(e))}</div>`; }
  }

  /* ----------------------------------------------------------------- Methodik / About */
  const about = {
    title: "Methodik", icon: "📖", sub: "Vertrauen",
    render(root) {
      const t = COCKPIT.thesis;
      root.innerHTML = `
        <div class="tab-head"><div>
          <h2>Methodik & Vertrauen</h2>
          <p class="lead">Dieses Cockpit operationalisiert die Dissertation von ${escapeHtml(t.author)}.</p>
        </div></div>
        <div class="about-grid">
          <section class="panel">
            <h3>${escapeHtml(t.title)}</h3>
            <p class="muted">${escapeHtml(t.subtitle)}</p>
            <p class="muted small">${escapeHtml(t.institution)}</p>
            <p>${escapeHtml(t.abstract)}</p>
          </section>
          <section class="panel">
            <h3>Die vier Rollen der KI als „Sensegiver“</h3>
            <div class="roles">${t.roles.map((r) => `<div class="role"><span class="role-ic">${r.icon}</span>
              <strong>${escapeHtml(r.name)}</strong><p>${escapeHtml(r.desc)}</p></div>`).join("")}</div>
          </section>
          <section class="panel wide">
            <h3>Drei Studien</h3>
            <div class="studies">${t.studies.map((s) => `<div class="study"><span class="study-n">${escapeHtml(s.n)}</span>
              <strong>${escapeHtml(s.title)}</strong><p>${escapeHtml(s.body)}</p></div>`).join("")}</div>
          </section>
          <section class="panel wide accent">
            <h3>Das Kern-Dilemma — und wie dieses Tool damit umgeht</h3>
            <p><strong>Wahrgenommene Sicherheit ≠ tatsächliche Sicherheit.</strong> Hohes Vertrauen in KI senkt die
            wahrgenommene Unsicherheit — und kann zu <em>Overreliance</em> führen (Risiken werden übersehen).
            Zu geringes Vertrauen verschenkt die Rechenvorteile (<em>Underreliance</em>).</p>
            <ul>
              <li><strong>Mittlere Spalte „vermeintlich irrelevant“:</strong> erzwingt den Blick auf schwache Signale, statt nur Gut/Schlecht zu zeigen.</li>
              <li><strong>Konfidenz-Angaben & „Was wir noch nicht wissen“:</strong> machen Unsicherheit sichtbar statt sie zu kaschieren.</li>
              <li><strong>Sparringspartner:</strong> wirkt aktiv dem Confirmation-Bias entgegen.</li>
              <li><strong>Trust-Hinweis überall:</strong> KI als Sensegiver, nicht als Orakel — Output bleibt Hypothese.</li>
            </ul>
            <p class="muted small">Mapping: Scanning &amp; Interpretation = die zwei sensemaking-Kernaktivitäten · Fit-Misfit-Paradox =
            Stärke (Tempo/Breite) vs. Grenze (Kontext) · tugendhafte vs. teuflische Zyklen je nach aktivem Management.</p>
          </section>
        </div>`;
    }
  };

  COCKPIT.tabs = { scanning, interpretation, sparring, ideator, automator, about };
})();
