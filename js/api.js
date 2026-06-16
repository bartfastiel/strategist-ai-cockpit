/* Anthropic Messages API client — called directly from the browser.
   Handles: the web_search server-tool agentic loop (pause_turn continuation),
   per-model temperature/effort rules, response-cache, and a live cost readout. */
(function () {
  const util = {
    // Pull a JSON value out of model text: prefer a ```json fence, else first balanced {…}/[…].
    extractJSON(text) {
      if (!text) return null;
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const candidates = [];
      if (fence) candidates.push(fence[1]);
      candidates.push(text);
      for (const c of candidates) {
        const start = c.search(/[\[{]/);
        if (start === -1) continue;
        const open = c[start], close = open === "{" ? "}" : "]";
        let depth = 0, inStr = false, esc = false;
        for (let i = start; i < c.length; i++) {
          const ch = c[i];
          if (inStr) {
            if (esc) esc = false;
            else if (ch === "\\") esc = true;
            else if (ch === '"') inStr = false;
          } else if (ch === '"') inStr = true;
          else if (ch === open) depth++;
          else if (ch === close) { depth--; if (depth === 0) {
            try { return JSON.parse(c.slice(start, i + 1)); } catch (e) { break; }
          } }
        }
      }
      return null;
    }
  };
  COCKPIT.util = Object.assign(COCKPIT.util || {}, util);

  function settings() { return COCKPIT.store.getSettings(); }

  // Build the request body, respecting per-model capability rules.
  function buildBody(opts) {
    const s = settings();
    const m = modelById(opts.model || s.model);
    const body = {
      model: m.id,
      max_tokens: opts.maxTokens || 4096,
      messages: opts.messages
    };
    if (opts.system) body.system = opts.system;

    // Effort (GA on all current models here) — controls depth & token spend.
    if (m.effort) body.output_config = { effort: opts.effort || s.effort || "medium" };

    // Temperature only where the model accepts it (NOT Opus 4.8 — would 400).
    if (m.temperature && typeof opts.temperature === "number") {
      body.temperature = Math.max(0, Math.min(1, opts.temperature));
    }

    // Server-side web search with dynamic filtering (automatic on Opus 4.8 / Sonnet 4.6).
    if (opts.webSearch && m.websearch) {
      body.tools = [{ type: "web_search_20260209", name: "web_search", max_uses: opts.maxSearches || 6 }];
    }
    return { body, model: m };
  }

  function cost(model, usage, searches) {
    const p = COCKPIT.config.pricing[model] || { in: 5, out: 25 };
    const inTok = (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
    const usd = (inTok / 1e6) * p.in + ((usage.output_tokens || 0) / 1e6) * p.out
      + (searches || 0) * COCKPIT.config.webSearchCostUsd;
    return { usd, eur: usd * COCKPIT.config.usdToEur, inTok, outTok: usage.output_tokens || 0, searches: searches || 0 };
  }

  async function call(body, signal) {
    const key = COCKPIT.store.getKey();
    if (!key) { const e = new Error("NO_KEY"); e.code = "NO_KEY"; throw e; }
    const res = await fetch(COCKPIT.config.apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": COCKPIT.config.apiVersion,
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify(body),
      signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data && data.error && data.error.message) || ("HTTP " + res.status);
      const e = new Error(msg); e.status = res.status; e.payload = data; throw e;
    }
    return data;
  }

  /* Main entry. opts:
     { messages, system, model, maxTokens, effort, temperature, webSearch, maxSearches,
       tab, cachePayload, signal, useCache(bool, default true) }
     Returns: { text, json, sources[], usage, cost, fromCache } */
  async function run(opts) {
    const useCache = opts.useCache !== false && opts.tab && opts.cachePayload;
    if (useCache) {
      const hit = COCKPIT.store.cacheGet(opts.tab, opts.cachePayload);
      if (hit) return Object.assign({ fromCache: true }, hit);
    }

    const { body, model } = buildBody(opts);
    let messages = opts.messages.slice();
    let text = "";
    const sources = [];
    let searches = 0;
    const usageTotal = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
    const maxRounds = opts.webSearch ? 6 : 1;

    for (let round = 0; round < maxRounds; round++) {
      body.messages = messages;
      const data = await call(body, opts.signal);
      if (data.usage) for (const k in usageTotal) usageTotal[k] += data.usage[k] || 0;

      for (const block of data.content || []) {
        if (block.type === "text") text += block.text;
        else if (block.type === "server_tool_use" && block.name === "web_search") searches++;
        else if (block.type === "web_search_tool_result") {
          const items = Array.isArray(block.content) ? block.content : [];
          for (const it of items) {
            if (it.type === "web_search_result" && it.url) {
              sources.push({ title: it.title || it.url, url: it.url });
            }
          }
        }
      }

      if (data.stop_reason === "pause_turn") {
        messages = messages.concat([{ role: "assistant", content: data.content }]);
        continue; // server tool needs another round
      }
      break;
    }

    const result = {
      text: text.trim(),
      json: COCKPIT.util.extractJSON(text),
      sources: dedupeSources(sources),
      usage: usageTotal,
      cost: cost(model.id, usageTotal, searches),
      model: model.id,
      fromCache: false
    };
    if (useCache) COCKPIT.store.cacheSet(opts.tab, opts.cachePayload, result);
    return result;
  }

  function dedupeSources(arr) {
    const seen = new Set(), out = [];
    for (const s of arr) { if (!seen.has(s.url)) { seen.add(s.url); out.push(s); } }
    return out.slice(0, 12);
  }

  COCKPIT.api = { run, hasKey: () => !!COCKPIT.store.getKey() };
})();
