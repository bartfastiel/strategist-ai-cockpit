/* uCORE Marktradar — frontend. Reads config/profile.json and the data/news.json datastore
   (produced hourly by the GitHub Actions scan), renders KPIs, a chance–risk spectrum and the
   evaluated-events feed. No API key in the browser; the dashboard is purely a reader. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let DATA = { items: [] }, FILTER = "all", SORT = "recent";

  const isOpp = (f) => f >= 0.2, isRisk = (f) => f <= -0.2, isNeutral = (f) => f > -0.2 && f < 0.2;

  // factor -1..+1 → CSS color
  function factorColor(f) {
    if (f >= 0.2) { const t = Math.min(1, (f - 0.2) / 0.8); return `hsl(${140}, ${45 + t * 25}%, ${42 - t * 6}%)`; }
    if (f <= -0.2) { const t = Math.min(1, (-f - 0.2) / 0.8); return `hsl(${6}, ${50 + t * 25}%, ${52 - t * 8}%)`; }
    return "hsl(215, 12%, 52%)";
  }
  const catLabel = (c) => ({ risk: "Risiko", neutral: "Neutral", opportunity: "Chance" }[c] || "Neutral");
  function fmtFactor(f) { return (f > 0 ? "+" : "") + f.toFixed(2); }

  function relTime(iso) {
    if (!iso) return "";
    const d = new Date(iso), s = (Date.now() - d) / 1000;
    if (s < 90) return "gerade eben";
    if (s < 3600) return Math.round(s / 60) + " Min.";
    if (s < 86400) return Math.round(s / 3600) + " Std.";
    if (s < 7 * 86400) return Math.round(s / 86400) + " Tg.";
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  }

  async function load() {
    const bust = "?t=" + Date.now();
    try {
      const [profile, data] = await Promise.all([
        fetch("config/profile.json" + bust).then((r) => r.json()).catch(() => null),
        fetch("data/news.json" + bust).then((r) => r.json()).catch(() => null)
      ]);
      if (profile) {
        $("#company").textContent = profile.company || "Marktradar";
        $("#subtitle").textContent = profile.subtitle || profile.tagline || "";
        document.title = (profile.company || "Marktradar") + " · " + (profile.tagline || "Marktradar");
      }
      DATA = data && Array.isArray(data.items) ? data : { items: [] };
    } catch (e) { DATA = { items: [] }; }
    render();
  }

  function render() {
    renderUpdated();
    renderKpis();
    renderSpectrum();
    renderFilters();
    renderFeed();
    const n = DATA.items.length;
    $("#ft-count").textContent = n ? n + " bewertete Ereignisse im Radar" : "";
  }

  function renderUpdated() {
    const u = DATA.updatedAt;
    $("#updated").textContent = u ? "aktualisiert " + relTime(u) : "noch keine Daten";
  }

  function avgFactor() {
    if (!DATA.items.length) return 0;
    // recency- & confidence-weighted mean
    let sw = 0, s = 0;
    DATA.items.forEach((it) => {
      const ageD = it.scannedAt ? (Date.now() - new Date(it.scannedAt)) / 864e5 : 30;
      const w = (it.confidence || 0.5) * Math.exp(-ageD / 21);
      s += (it.factor || 0) * w; sw += w;
    });
    return sw ? s / sw : 0;
  }

  function renderKpis() {
    const items = DATA.items;
    const opp = items.filter((i) => isOpp(i.factor)).length;
    const risk = items.filter((i) => isRisk(i.factor)).length;
    const avg = avgFactor();
    const tendLabel = avg > 0.12 ? "Tendenz: eher Chancen" : avg < -0.12 ? "Tendenz: eher Risiken" : "Tendenz: ausgewogen";
    const pct = ((avg + 1) / 2) * 100;
    $("#kpis").innerHTML = `
      <div class="kpi kpi-tend">
        <div class="kpi-label">${esc(tendLabel)}</div>
        <div class="needle-track"><div class="needle" style="left:${pct}%"></div></div>
        <div class="needle-scale"><span>Risiko</span><span>${fmtFactor(avg)}</span><span>Chance</span></div>
      </div>
      <div class="kpi"><div class="kpi-num opp">${opp}</div><div class="kpi-label">Chancen</div></div>
      <div class="kpi"><div class="kpi-num risk">${risk}</div><div class="kpi-label">Risiken</div></div>
      <div class="kpi"><div class="kpi-num">${items.length}</div><div class="kpi-label">beobachtet</div></div>`;
  }

  function renderSpectrum() {
    const host = $("#spectrum");
    if (!DATA.items.length) { host.innerHTML = `<p class="empty">Noch keine Ereignisse — der stündliche Scan füllt das Radar.</p>`; return; }
    const dots = DATA.items.map((it) => {
      const pct = ((it.factor + 1) / 2) * 100;
      const sz = 9 + (it.confidence || 0.5) * 7;
      return `<button class="dot-btn" style="left:${pct}%;width:${sz}px;height:${sz}px;background:${factorColor(it.factor)}"
        title="${esc(fmtFactor(it.factor) + " · " + it.title)}" data-id="${esc(it.id)}"></button>`;
    }).join("");
    host.innerHTML = `<div class="axis"><span>Risiko −1</span><span>0</span><span>+1 Chance</span></div>
      <div class="track">${dots}</div>`;
    host.querySelectorAll(".dot-btn").forEach((b) => b.onclick = () => {
      const card = document.querySelector(`.card[data-id="${b.dataset.id}"]`);
      if (card) { card.scrollIntoView({ behavior: "smooth", block: "center" }); card.classList.add("flash"); setTimeout(() => card.classList.remove("flash"), 1400); }
    });
  }

  function renderFilters() {
    const items = DATA.items;
    const defs = [
      ["all", "Alle", items.length],
      ["opportunity", "Chancen", items.filter((i) => isOpp(i.factor)).length],
      ["neutral", "Neutral", items.filter((i) => isNeutral(i.factor)).length],
      ["risk", "Risiken", items.filter((i) => isRisk(i.factor)).length]
    ];
    $("#filters").innerHTML = defs.map(([k, l, n]) =>
      `<button class="chip ${k === FILTER ? "on" : ""}" data-f="${k}">${l} <span>${n}</span></button>`).join("");
    $("#filters").querySelectorAll(".chip").forEach((c) => c.onclick = () => { FILTER = c.dataset.f; render(); });
    const sel = $("#sort"); sel.value = SORT; sel.onchange = () => { SORT = sel.value; renderFeed(); };
  }

  function filtered() {
    let arr = DATA.items.slice();
    if (FILTER === "opportunity") arr = arr.filter((i) => isOpp(i.factor));
    else if (FILTER === "risk") arr = arr.filter((i) => isRisk(i.factor));
    else if (FILTER === "neutral") arr = arr.filter((i) => isNeutral(i.factor));
    const t = (x) => new Date(x.scannedAt || x.publishedAt || 0).getTime();
    if (SORT === "recent") arr.sort((a, b) => t(b) - t(a));
    else if (SORT === "impact") arr.sort((a, b) => Math.abs(b.factor) - Math.abs(a.factor));
    else if (SORT === "opp") arr.sort((a, b) => b.factor - a.factor);
    else if (SORT === "risk") arr.sort((a, b) => a.factor - b.factor);
    return arr;
  }

  function card(it) {
    const col = factorColor(it.factor);
    const pct = ((it.factor + 1) / 2) * 100;
    const conf = it.confidence != null ? `<span class="conf" title="Konfidenz der Einschätzung">◑ ${Math.round(it.confidence * 100)}%</span>` : "";
    const seed = it.seed ? `<span class="seed" title="Startwert – wird durch den Live-Scan ergänzt">Startwert</span>` : "";
    const when = it.publishedAt ? relTime(it.publishedAt) : relTime(it.scannedAt);
    return `<article class="card" data-id="${esc(it.id)}" style="--col:${col}">
      <div class="card-stripe"></div>
      <div class="card-main">
        <div class="card-top">
          <span class="factor-pill" style="background:${col}">${fmtFactor(it.factor)}</span>
          <span class="cat">${catLabel(it.category)}</span>
          ${seed}
          <span class="grow"></span>
          <span class="src">${esc(it.source || "")} · ${esc(when)}</span>
        </div>
        <h3 class="card-title"><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a></h3>
        <div class="factor-bar"><div class="fb-zero"></div><div class="fb-fill" style="left:${Math.min(50, pct)}%;width:${Math.abs(pct - 50)}%;background:${col}"></div></div>
        <p class="reason">${esc(it.reasoning || "")}</p>
        <div class="card-foot">${conf}<a class="read" href="${esc(it.url)}" target="_blank" rel="noopener">Zur Quelle ↗</a></div>
      </div>
    </article>`;
  }

  function renderFeed() {
    const arr = filtered();
    const feed = $("#feed");
    if (!arr.length) { feed.innerHTML = `<p class="empty">Keine Ereignisse in dieser Ansicht.</p>`; return; }
    feed.innerHTML = arr.map(card).join("");
  }

  if (document.readyState !== "loading") load();
  else document.addEventListener("DOMContentLoaded", load);
})();
