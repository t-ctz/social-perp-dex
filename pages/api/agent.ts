import type { NextApiRequest, NextApiResponse } from "next";
import { getMarkets } from "@/lib/hlmarkets";

// Read-only research agent. OpenAI-compatible tool-calling loop (OpenRouter by default).
// Tools: Centaur REST (same data the Centaur MCP exposes) + Hyperliquid market data.
// It has NO tool that places, cancels or modifies orders.

const CENTAUR_PATHS = new Set([
  "events", "messages", "feed", "positions", "positions/open", "assets", "assets/stats", "assets/positioning",
  "traders", "traders/stats", "traders/rankings", "traders/activity",
  "signals/trending", "signals/specialist-ideas", "signals/early-opportunities", "signals/crowd-fade", "signals/smart-money", "signals/leaders-book",
]);

const TOOLS = [
  {
    type: "function",
    function: {
      name: "centaur_query",
      description:
        "Query Centaur social-trading data. endpoint must be a bare name from this list (no '?' and no query string): " + Array.from(CENTAUR_PATHS).join(", ") +
        ". Put all query values in params. Examples: find a trader by name -> endpoint 'traders', params {search:'Jason Calacanis'}; a trader's performance in a market -> endpoint 'traders/stats', params {traderIds:'2436', assetRefs:'NVDA'}; a market's positions -> endpoint 'positions/open', params {assetRefs:'NVDA', limit:20}; market positioning -> endpoint 'assets/stats', params {assetRefs:'NVDA'}; assets by name -> endpoint 'assets', params {search:'NVDA'}; signals -> endpoint 'signals/trending', params {windowDays:7, limit:10}.",
      parameters: { type: "object", properties: { endpoint: { type: "string" }, params: { type: "object", additionalProperties: true } }, required: ["endpoint"] },
    },
  },
  {
    type: "function",
    function: {
      name: "hl_markets",
      description: "List/search Hyperliquid perp markets (native + HIP-3 stocks, commodities, FX, indices) with price, 24h change, volume, open interest, funding, max leverage.",
      parameters: { type: "object", properties: { search: { type: "string" }, category: { type: "string", description: "crypto, stocks, commodities, indices, fx, preipo, other" }, sortBy: { type: "string", enum: ["volume", "change", "openInterest", "funding"] }, limit: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "hl_l2book",
      description: "Top of the Hyperliquid order book for one market (coin name as in hl_markets, e.g. BTC or xyz:NVDA).",
      parameters: { type: "object", properties: { coin: { type: "string" } }, required: ["coin"] },
    },
  },
];

const slim = (v: any): any => {
  const s = JSON.stringify(v);
  return s.length > 9000 ? s.slice(0, 9000) + "…[truncated]" : v;
};

async function runTool(name: string, args: any, ctx: { cKey: string; cBase: string }) {
  if (name === "centaur_query") {
    let ep = String(args.endpoint || "").trim().replace(/^\/+/, "");
    // Models sometimes put the query string inside the endpoint name; split it out.
    const extra: Record<string, string> = {};
    const qi = ep.indexOf("?");
    if (qi >= 0) {
      new URLSearchParams(ep.slice(qi + 1)).forEach((v, k) => (extra[k] = v));
      ep = ep.slice(0, qi);
    }
    if (!CENTAUR_PATHS.has(ep)) return { error: `unknown endpoint "${ep}". Use one of: ${Array.from(CENTAUR_PATHS).join(", ")}` };
    if (!ctx.cKey) return { error: "No Centaur API key configured in the app (Keys → Centaur API key)." };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...extra, ...(args.params || {}) })) {
      if (v === undefined || v === null || v === "") continue;
      qs.set(k, Array.isArray(v) ? (v as any[]).join(",") : String(v));
    }
    const r = await fetch(`${ctx.cBase}/${ep}${qs.toString() ? "?" + qs : ""}`, { headers: { "x-api-key": ctx.cKey } });
    const t = await r.text();
    if (!r.ok) return { error: `Centaur HTTP ${r.status} on ${ep}`, body: t.slice(0, 300) };
    try { return slim(JSON.parse(t)); } catch { return t.slice(0, 3000); }
  }
  if (name === "hl_markets") {
    let m = await getMarkets();
    if (args.category) m = m.filter((x) => x.category === args.category);
    if (args.search) m = m.filter((x) => x.name.toLowerCase().includes(String(args.search).toLowerCase()));
    const chg = (x: any) => (x.markPx - x.prevDayPx) / x.prevDayPx;
    const key = args.sortBy === "change" ? (x: any) => Math.abs(chg(x)) : args.sortBy === "openInterest" ? (x: any) => x.openInterest * x.markPx : args.sortBy === "funding" ? (x: any) => Math.abs(x.funding) : (x: any) => x.dayNtlVlm;
    return m.sort((a, b) => key(b) - key(a)).slice(0, Math.min(Number(args.limit) || 15, 40)).map((x) => ({
      coin: x.name, category: x.category, price: x.markPx, change24hPct: +(chg(x) * 100).toFixed(2), volume24hUsd: Math.round(x.dayNtlVlm),
      openInterestUsd: Math.round(x.openInterest * x.markPx), fundingPerHourPct: +(x.funding * 100).toFixed(5), maxLeverage: x.maxLeverage, collateral: x.collateral,
    }));
  }
  if (name === "hl_l2book") {
    const r = await fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "l2Book", coin: args.coin }) });
    const b = await r.json();
    return { coin: args.coin, bids: b.levels?.[0]?.slice(0, 8), asks: b.levels?.[1]?.slice(0, 8) };
  }
  return { error: "unknown tool " + name };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const llmKey = String(req.headers["x-llm-key"] || "");
  const llmBase = String(req.headers["x-llm-base"] || "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const model = String(req.headers["x-llm-model"] || "openai/gpt-4o-mini");
  const cKey = String(req.headers["x-centaur-key"] || "");
  const cBase = String(req.headers["x-centaur-base"] || "https://api.centaur.io/v2").replace(/\/$/, "");
  if (!llmKey) return res.status(401).json({ error: "Add an LLM API key (Keys → LLM API key) to use the assistant." });

  const { messages = [], context = {} } = req.body || {};
  const system = `You are the research assistant inside The Monitor, a perp DEX that shows Hyperliquid markets with Centaur social-trading data. Answer questions about traders (by name) and markets by calling tools. Never invent prices, positions or trader activity. If a tool errors, quote the error to the user instead of giving up silently. To look up a trader, first call centaur_query with endpoint "traders" and params {search: name}, then use the returned id for "traders/stats" with assetRefs for the market. The user is viewing ${context.symbol || "BTC"} (last price ${context.price ?? "unknown"}). Be concise, cite numbers from tool results, and note data is trader-reported sentiment, not advice. You are READ-ONLY: you cannot place or cancel orders; tell the user to use the order form.`;

  const convo: any[] = [{ role: "system", content: system }, ...messages.slice(-16)];
  const used: string[] = [];
  try {
    for (let i = 0; i < 6; i++) {
      const r = await fetch(`${llmBase}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${llmKey}` },
        body: JSON.stringify({ model, messages: convo, tools: TOOLS, tool_choice: "auto" }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: d?.error?.message || JSON.stringify(d).slice(0, 300) });
      const msg = d.choices?.[0]?.message;
      if (!msg) return res.status(502).json({ error: "Empty model response" });
      if (!msg.tool_calls?.length) return res.json({ reply: msg.content || "", tools: used });
      convo.push(msg);
      for (const tc of msg.tool_calls) {
        let out: any;
        try {
          const args = JSON.parse(tc.function.arguments || "{}");
          used.push(`${tc.function.name}(${JSON.stringify(args).slice(0, 90)})`);
          out = await runTool(tc.function.name, args, { cKey, cBase });
        } catch (e: any) { out = { error: e?.message || "tool failed" }; }
        convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(out).slice(0, 9000) });
      }
    }
    res.json({ reply: "I hit the tool-call limit before finishing. Try a narrower question.", tools: used });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "agent failed" });
  }
}
