import type { NextApiRequest, NextApiResponse } from "next";

// Account snapshot (balance + perp positions) via OpenFinance, using the caller's key.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = String(req.headers["x-openfinance-key"] || "");
  if (!key) return res.status(401).json({ error: "No OpenFinance API key" });
  try {
    const r = await fetch("https://api.openfinance.tech/agent/trading/account", { headers: { "x-api-key": key } });
    const text = await r.text();
    res.status(r.status).setHeader("content-type", "application/json").send(text);
  } catch (e: any) {
    res.status(502).json({ error: e?.message || "upstream error" });
  }
}
