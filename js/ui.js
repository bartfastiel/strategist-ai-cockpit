/* UI helpers: DOM shortcuts, a minimal safe markdown renderer, shared components
   (trust badge, confidence chip, cost line, source list), and toasts. */
(function () {
  const el = (sel, root) => (root || document).querySelector(sel);
  const els = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") node.className = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k.startsWith("on") && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    }
    (Array.isArray(children) ? children : children != null ? [children] : []).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Minimal, safe markdown → HTML. Escapes first, then applies inline + block formatting.
  function md(src) {
    if (!src) return "";
    const lines = String(src).replace(/\r\n/g, "\n").split("\n");
    let html = "", listType = null;
    const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
    const inline = (t) => escapeHtml(t)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

    for (let raw of lines) {
      const line = raw.trimEnd();
      let m;
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { closeList(); html += `<h${m[1].length + 2}>${inline(m[2])}</h${m[1].length + 2}>`; }
      else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) { if (listType !== "ul") { closeList(); html += "<ul>"; listType = "ul"; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { if (listType !== "ol") { closeList(); html += "<ol>"; listType = "ol"; } html += `<li>${inline(m[1])}</li>`; }
      else if (line.trim() === "") { closeList(); }
      else { closeList(); html += `<p>${inline(line)}</p>`; }
    }
    closeList();
    return html;
  }

  // Confidence chip: value 0..1 (or "hoch"/"mittel"/"niedrig").
  function confidence(level) {
    let v = level, label;
    if (typeof level === "string") {
      const s = level.toLowerCase();
      v = s.includes("hoch") || s.includes("high") ? 0.85 : s.includes("niedrig") || s.includes("low") ? 0.3 : 0.55;
      label = level;
    } else { label = v >= 0.7 ? "hohe Konfidenz" : v >= 0.45 ? "mittlere Konfidenz" : "geringe Konfidenz"; }
    const cls = v >= 0.7 ? "ok" : v >= 0.45 ? "warn" : "low";
    return `<span class="chip chip-${cls}" title="KI-Selbsteinschätzung — stets kritisch prüfen">◑ ${escapeHtml(label)}</span>`;
  }

  function costLine(res) {
    if (!res) return "";
    if (res.fromCache) return `<span class="meta">aus Cache · keine API-Kosten</span>`;
    const c = res.cost || {};
    const parts = [];
    parts.push(`${(c.inTok || 0).toLocaleString("de")} → ${(c.outTok || 0).toLocaleString("de")} Tokens`);
    if (c.searches) parts.push(`${c.searches}× Websuche`);
    parts.push(`≈ ${(c.eur || 0).toFixed(c.eur < 0.1 ? 4 : 3)} €`);
    return `<span class="meta">${escapeHtml(res.model || "")} · ${parts.join(" · ")}</span>`;
  }

  function sourceList(sources) {
    if (!sources || !sources.length) return "";
    const items = sources.map((s) => `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a></li>`).join("");
    return `<details class="sources"><summary>Quellen (${sources.length})</summary><ul>${items}</ul></details>`;
  }

  let toastTimer;
  function toast(msg, kind) {
    let t = el("#toast");
    if (!t) { t = h("div", { id: "toast" }); document.body.appendChild(t); }
    t.className = "show " + (kind || "");
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = ""), 4200);
  }

  function spinner(label) {
    return `<div class="loading"><span class="spin"></span> ${escapeHtml(label || "Claude denkt nach…")}</div>`;
  }

  // Friendly error text from an api error.
  function errMsg(e) {
    if (!e) return "Unbekannter Fehler.";
    if (e.code === "NO_KEY") return "Kein API-Key hinterlegt. Bitte oben rechts unter ⚙︎ einen Anthropic-API-Key eintragen — oder den Demo-Modus aktivieren.";
    if (e.name === "AbortError") return "Abgebrochen.";
    if (e.status === 401) return "API-Key ungültig (401). Bitte Key prüfen.";
    if (e.status === 429) return "Rate-Limit erreicht (429). Kurz warten und erneut versuchen.";
    if (e.status === 400) return "Anfrage abgelehnt (400): " + (e.message || "");
    if (String(e.message || "").includes("Failed to fetch")) return "Netzwerk/CORS-Fehler. Bei lokalem Öffnen kann der Browser die Anfrage blockieren — über die GitHub-Pages-URL funktioniert es zuverlässig.";
    return e.message || "Fehler.";
  }

  COCKPIT.ui = { el, els, h, escapeHtml, md, confidence, costLine, sourceList, toast, spinner, errMsg };
})();
