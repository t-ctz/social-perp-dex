import type { NextApiRequest, NextApiResponse } from "next";
import { getMarkets } from "@/lib/hlmarkets";
import { dexOf } from "@/lib/social";

// Order builder + submitter for ANY Hyperliquid perp (native or HIP-3). Uses the caller's OpenFinance
// key (x-openfinance-key). dryRun:true returns the exact payload for confirmation and sends nothing.

const OF = "https://api.openfinance.tech/agent/trading";

function fmtPx(px: number, szDecimals: number) {
  const maxDec = Math.max(0, 6 - szDecimals);
  return String(Number(Number(px.toPrecision(5)).toFixed(maxDec)));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = String(req.headers["x-openfinance-key"] || "");
  const { symbol, isBuy, size, price, type, reduceOnly, tif, dryRun } = req.body || {};
  if (!symbol || typeof isBuy !== "boolean" || !(Number(size) > 0)) return res.status(400).json({ error: "symbol, isBuy and size are required" });

  try {
    const markets = await getMarkets(dexOf(symbol));
    const m = markets.find((x) => x.name === symbol);
    if (!m) return res.status(400).json({ error: `Unknown perp market ${symbol}` });
    const mid = m.midPx ?? m.markPx;
    const szDec = m.szDecimals;
    const sz = (Math.floor(Number(size) * 10 ** szDec) / 10 ** szDec).toFixed(szDec);
    if (!(Number(sz) > 0)) return res.status(400).json({ error: `Size rounds to 0 (szDecimals=${szDec})` });

    let px: number;
    let t: any;
    let typeLabel: string;
    if (type === "market") {
      px = isBuy ? mid * 1.03 : mid * 0.97; // 3% slippage cap
      const mt = m.dex ? "FrontendMarket" : "Ioc"; // HIP-3 markets use FrontendMarket
      t = { limit: { tif: mt } };
      typeLabel = `Market (${mt}, 3% cap)`;
    } else {
      px = Number(price);
      if (!(px > 0)) return res.status(400).json({ error: "limit price required" });
      t = { limit: { tif: tif || "Gtc" } };
      typeLabel = `Limit (${t.limit.tif})`;
    }
    const order = { a: m.assetId, b: isBuy, p: fmtPx(px, szDec), s: sz, r: !!reduceOnly, t };
    const payload = { orders: [order], grouping: "na" };
    const summary = {
      symbol, side: isBuy ? "BUY" : "SELL", size: sz, limitPx: order.p, notionalUsd: +(Number(sz) * px).toFixed(2),
      type: typeLabel, reduceOnly: !!reduceOnly, mid, dex: m.dex, collateral: m.collateral, assetId: m.assetId, maxLeverage: m.maxLeverage,
    };

    if (dryRun) return res.json({ summary, payload });
    if (!key) return res.status(401).json({ error: "Add your OpenFinance API key (Connect, top right) to trade." });

    const r = await fetch(`${OF}/orders`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": key }, body: JSON.stringify(payload) });
    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    res.status(r.status).json({ summary, result: data });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "order failed" });
  }
}
