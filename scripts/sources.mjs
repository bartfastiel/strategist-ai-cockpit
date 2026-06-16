/* News sources — Google News RSS (aggregates dpa, Reuters, Handelsblatt, Heise, …).
   Zero dependencies: a minimal RSS item parser over the global fetch API (Node 20+). */

const UA = "Mozilla/5.0 (compatible; ucore-radar/1.0; +https://github.com/bartfastiel)";

export function googleNewsUrl(query) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=de&gl=DE&ceid=DE:de`;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml" } });
  if (!res.ok) throw new Error(`fetch ${res.status} for ${url}`);
  return res.text();
}

function decode(s) {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}

// Parse a Google-News RSS feed into normalised items.
function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
  for (const b of blocks) {
    const rawTitle = decode(tag(b, "title"));
    const link = decode(tag(b, "link"));
    const source = decode(tag(b, "source"));
    const pub = decode(tag(b, "pubDate"));
    let snippet = decode(tag(b, "description"));
    if (!rawTitle || !link) continue;
    // Google appends " - Publisher" to titles.
    let title = rawTitle;
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
    // Description often repeats links/headlines; keep it short.
    if (snippet.length > 320) snippet = snippet.slice(0, 317) + "…";
    items.push({
      title: title.trim(),
      url: link.trim(),
      source: source || "Google News",
      publishedAt: pub ? new Date(pub).toISOString() : null,
      snippet
    });
  }
  return items;
}

// Fetch all queries, flatten, drop entries older than `maxAgeDays`.
export async function collectHeadlines(queries, maxAgeDays = 14) {
  const cutoff = Date.now() - maxAgeDays * 864e5;
  const all = [];
  for (const q of queries) {
    try {
      const xml = await fetchText(googleNewsUrl(q));
      for (const it of parseFeed(xml)) {
        if (it.publishedAt && new Date(it.publishedAt).getTime() < cutoff) continue;
        all.push({ ...it, query: q });
      }
    } catch (e) {
      console.warn(`[sources] query failed: ${q} — ${e.message}`);
    }
  }
  return all;
}

// Stable dedupe key from the normalised title.
export function keyOf(title) {
  return title.toLowerCase().replace(/[^a-z0-9äöüß]+/g, " ").trim().slice(0, 80);
}
