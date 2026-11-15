# The Monitor

A Hyperliquid perp trading interface with social trader data overlaid on the chart, feed, and positioning panels.

**Live (latest):** https://social-perp-dex.vercel.app

## What it does

- **Markets:** all Hyperliquid perps, native and HIP-3 (stocks, commodities, FX, indices, pre-IPO). Chart, order book, and order form work on all of them.
- **Trading:** market and limit orders through the OpenFinance API. Every order shows a confirmation dialog first. Nothing is sent without confirmation.
- **Trader overlay:** each tracked trader's entries and exits appear as avatar markers on the chart. A feed shows their posts. The positioning panel shows the long/short split and each open position.
- **Trader filter:** choose which traders appear. Three are excluded by default (hummusXBT, Nihilus, UNKNOWN TRADER).
- **Trade buttons:** a feed post or chart marker can pre-fill the order form with that trader's action. It sets the side, a limit at the trader's entry price, and reduce-only for closes or trims. A warning appears if the price has moved more than 2%. It never sends an order on its own.
- **Agent:** a read-only chat panel. It answers questions by calling Centaur and Hyperliquid data. It cannot place or cancel orders.

## Keys

Keys are entered in the browser under **Keys** (top right). They are stored in the browser's localStorage and sent only to this app's own API routes. No keys are in the code.

| Key | Used for | Needed for |
|---|---|---|
| OpenFinance (`open_…`) | Account, balance, positions, orders | Trading |
| Centaur | Live social data | Social overlays on every market |
| LLM (OpenRouter by default) | Agent chat | Agent only |

The **Check key** button in the Keys dialog calls `GET /agent/wallets` to confirm the key is accepted and shows the connected EVM wallet.

Without a Centaur key, social data comes from a captured snapshot that covers BTC, ETH, SOL and HYPE only.

## Architecture

- **Framework:** Next.js (pages router), Tailwind, shadcn/ui primitives.
- **Market data:** Hyperliquid `/info` (public), proxied at `/api/hl` and `/api/markets`.
- **Account and orders:** OpenFinance `/agent/trading/*`, proxied at `/api/account` and `/api/order`. `/api/order` builds the Hyperliquid payload, and `dryRun` returns it without sending.
- **Social data:** Centaur REST API v2 (`https://api.centaur.io/v2`, `x-api-key`), proxied at `/api/centaur`. Each Hyperliquid market is mapped to a Centaur asset ID (for example NVDA to 822). Each endpoint fails independently, and failures are reported in the status banner.
- **Agent:** OpenAI-compatible tool-calling loop at `/api/agent`. Tools: Centaur queries, Hyperliquid markets, Hyperliquid order book.

## Known limits

- **Trading is not yet verified end to end.** Order building is tested. Live order submission with a funded account has not been run.
- **Centaur live mode** has been tested with a real key for NVDA and works. Other markets depend on a Centaur asset match. Unmatched symbols show a banner.
- **`xyz:NVDA` and `io:NVDA`** map to the same Centaur asset, so they show the same social data.
- **Copy-trade prices** are the trader's entry price, which can be hours old. Check the warning before sending.
- **Snapshot data** is static and only covers BTC, ETH, SOL and HYPE.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and add keys under **Keys**.

## Deploying

Deployed on Vercel. `vercel.json` sets the framework to Next.js.
