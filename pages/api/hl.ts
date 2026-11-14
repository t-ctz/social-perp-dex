import type { NextApiRequest, NextApiResponse } from "next";

// Public Hyperliquid /info proxy (market data only — no keys, no signing).
const ALLOWED = new Set(["metaAndAssetCtxs", "l2Book", "candleSnapshot", "recentTrades", "allMids", "meta"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const body = req.body || {};
  if (!ALLOWED.has(body.type)) return res.status(400).json({ error: "type not allowed" });
  try {
    const r = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    res.status(r.status).setHeader("content-type", "application/json").send(text);
  } catch (e: any) {
    res.status(502).json({ error: e?.message || "upstream error" });
  }
}
