import type { NextApiRequest, NextApiResponse } from "next";

// Checks an OpenFinance API key and reports which wallets it is tied to.
// Read-only. Returns a plain-language status the Keys dialog can show.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = String(req.headers["x-openfinance-key"] || "");
  if (!key) return res.status(400).json({ ok: false, message: "No OpenFinance key entered." });
  try {
    const r = await fetch("https://api.openfinance.tech/agent/wallets", { headers: { "x-api-key": key } });
    const text = await r.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch {}
    if (r.status === 401) return res.json({ ok: false, message: "Key rejected (401). Check the key starts with open_ and was copied in full." });
    if (r.status === 412) return res.json({ ok: false, message: "Account not set up (412). Finish setup at openfinance.tech." });
    if (!r.ok) return res.json({ ok: false, message: `OpenFinance returned HTTP ${r.status}.` });
    const d = body?.data ?? body ?? {};
    const eth = d.ethereum ?? null;
    const sol = d.solana ?? null;
    return res.json({
      ok: true,
      message: eth ? "Key works. Ethereum wallet connected." : "Key works, but no Ethereum wallet is provisioned on this account.",
      ethereum: eth,
      solana: sol,
    });
  } catch (e: any) {
    return res.json({ ok: false, message: "Could not reach OpenFinance: " + (e?.message || "network error") });
  }
}
