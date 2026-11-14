import type { NextApiRequest, NextApiResponse } from "next";
import { getMarkets } from "@/lib/hlmarkets";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const m = await getMarkets(String(req.query.dex || ""));
    res.setHeader("cache-control", "no-store");
    res.json(m);
  } catch (e: any) {
    res.status(502).json({ error: e?.message || "markets unavailable" });
  }
}
