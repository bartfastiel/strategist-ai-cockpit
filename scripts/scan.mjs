/* Hourly scan pipeline (runs in GitHub Actions).
   1. Collect fresh headlines from Google News RSS (profile-driven queries).
   2. Dedupe against the datastore.
   3. Haiku triage — cheap relevance filter.
   4. Opus analysis — for the relevant few: impact factor (-1 risk … +1 chance) + reasoning.
   5. Append to data/news.json and let the workflow commit it.

   The Anthropic API key comes from the ANTHROPIC_API_KEY env (GitHub Actions secret);
   it is never shipped to the browser. */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectHeadlines, keyOf } from "./sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE = JSON.parse(await fs.readFile(path.join(ROOT, "config/profile.json"), "utf8"));
const DB_PATH = path.join(ROOT, "data/news.json");

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("ANTHROPIC_API_KEY is not set."); process.exit(1); }

async function anthropic(body, attempt = 0) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body)
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 4) { await sleep(1500 * (attempt + 1)); return anthropic(body, attempt + 1); }
  }
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${data?.error?.message || "API error"}`);
  return data;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const textOf = (d) => (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");

function extractJSON(t) {
  if (!t) return null;
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const src = fence ? fence[1] : t;
  const start = src.search(/[[{]/); if (start < 0) return null;
  const open = src[start], close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; }
    else if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) { try { return JSON.parse(src.slice(start, i + 1)); } catch { return null; } }
  }
  return null;
}

/* ---- Haiku: fast relevance triage over many headlines, one cheap call. ---- */
async function triage(cands) {
  const list = cands.map((c, i) => `${i}. ${c.title}${c.snippet ? " — " + c.snippet : ""}`).join("\n");
  const data = await anthropic({
    model: PROFILE.models.triage,
    max_tokens: 1024,
    system:
      "Du bist ein schneller Vorfilter für ein strategisches Marktradar. UNTERNEHMEN:\n" +
      PROFILE.businessModel +
      "\n\nAUFGABE: Wähle aus der Liste NUR die Schlagzeilen, die plausibel die Chancen oder Risiken dieses " +
      "Unternehmens berühren (Markt, Regulierung, Technologie, Lieferkette, Wettbewerb, Förderung, Nachfrage). " +
      "Sei selektiv — im Zweifel weglassen. Antworte ausschließlich als JSON: {\"relevant\":[indizes]}.",
    messages: [{ role: "user", content: "Schlagzeilen:\n" + list }]
  });
  const j = extractJSON(textOf(data)) || {};
  const idx = Array.isArray(j.relevant) ? j.relevant : [];
  return idx.filter((i) => Number.isInteger(i) && i >= 0 && i < cands.length).map((i) => cands[i]);
}

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    factor: { type: "number", description: "-1 (reines Risiko) bis +1 (reine Chance), 0 = neutral/ambivalent" },
    category: { type: "string", enum: ["risk", "neutral", "opportunity"] },
    reasoning: { type: "string", description: "1-3 Sätze: inwiefern betrifft das konkret das Geschäftsmodell?" },
    confidence: { type: "number", description: "0..1 Belastbarkeit der Einschätzung" }
  },
  required: ["factor", "category", "reasoning", "confidence"]
};

/* ---- Opus: precise per-item impact analysis (structured output). ---- */
async function analyze(item) {
  const data = await anthropic({
    model: PROFILE.models.analysis,
    max_tokens: 1200,
    output_config: { effort: "medium", format: { type: "json_schema", schema: ANALYSIS_SCHEMA } },
    system:
      "Du bewertest ein einzelnes Nachrichtenereignis für das strategische Marktradar eines Unternehmens. " +
      "UNTERNEHMEN:\n" + PROFILE.businessModel +
      "\n\nGib einen Einfluss-Faktor von -1 (Risiko) bis +1 (Chance) und eine kurze, konkrete Begründung, " +
      "inwiefern das Ereignis das Geschäftsmodell betrifft. Vermeide trügerische Sicherheit: wenn die " +
      "Relevanz nur mittelbar ist, wähle einen Faktor nahe 0 und benenne die Unsicherheit. Antworte als JSON.",
    messages: [{ role: "user", content:
      `Titel: ${item.title}\nQuelle: ${item.source}\nDatum: ${item.publishedAt || "?"}\n` +
      (item.snippet ? `Auszug: ${item.snippet}\n` : "") + `Link: ${item.url}` }]
  });
  const j = extractJSON(textOf(data));
  if (!j) return null;
  let factor = Math.max(-1, Math.min(1, Number(j.factor)));
  if (!Number.isFinite(factor)) factor = 0;
  const category = ["risk", "neutral", "opportunity"].includes(j.category)
    ? j.category : factor > 0.2 ? "opportunity" : factor < -0.2 ? "risk" : "neutral";
  return {
    factor: Math.round(factor * 100) / 100,
    category,
    reasoning: String(j.reasoning || "").trim(),
    confidence: Math.max(0, Math.min(1, Number(j.confidence) || 0.5))
  };
}

async function main() {
  const db = JSON.parse(await fs.readFile(DB_PATH, "utf8").catch(() => '{"items":[]}'));
  db.items = Array.isArray(db.items) ? db.items : [];
  const seen = new Set(db.items.map((it) => it.key));

  console.log(`[scan] collecting headlines for ${PROFILE.queries.length} queries…`);
  const headlines = await collectHeadlines(PROFILE.queries);

  // Dedupe by title key (within batch + against datastore).
  const fresh = [];
  const batch = new Set();
  for (const h of headlines) {
    const k = keyOf(h.title);
    if (!k || seen.has(k) || batch.has(k)) continue;
    batch.add(k);
    fresh.push({ ...h, key: k });
  }
  console.log(`[scan] ${headlines.length} headlines, ${fresh.length} new after dedupe.`);
  if (!fresh.length) { console.log("[scan] nothing new."); return; }

  const cands = fresh.slice(0, PROFILE.limits.maxTriage);
  const relevant = await triage(cands);
  console.log(`[scan] Haiku flagged ${relevant.length} relevant.`);
  if (!relevant.length) { console.log("[scan] none relevant."); return; }

  const toAnalyze = relevant.slice(0, PROFILE.limits.maxAnalyze);
  const nowIso = new Date().toISOString();
  let added = 0;
  for (const item of toAnalyze) {
    try {
      const a = await analyze(item);
      if (!a) continue;
      db.items.unshift({
        id: item.key + "-" + Date.now().toString(36),
        key: item.key,
        title: item.title,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt,
        scannedAt: nowIso,
        factor: a.factor,
        category: a.category,
        reasoning: a.reasoning,
        confidence: a.confidence,
        model: PROFILE.models.analysis
      });
      added++;
      console.log(`  + [${a.factor >= 0 ? "+" : ""}${a.factor}] ${item.title}`);
    } catch (e) { console.warn(`  ! analysis failed: ${item.title} — ${e.message}`); }
  }

  if (!added) { console.log("[scan] nothing added."); return; }
  db.items.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
  if (db.items.length > PROFILE.limits.keep) db.items = db.items.slice(0, PROFILE.limits.keep);
  db.updatedAt = nowIso;
  db.company = PROFILE.company;
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2) + "\n");
  console.log(`[scan] wrote ${added} new item(s); ${db.items.length} total.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
