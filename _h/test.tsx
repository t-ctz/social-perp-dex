import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { pretendToBeVisual: true, url: "http://localhost/" });
const g: any = globalThis;
g.window = dom.window; g.document = dom.window.document; g.HTMLElement = dom.window.HTMLElement;
g.Node = dom.window.Node; g.MouseEvent = dom.window.MouseEvent; g.SVGElement = dom.window.SVGElement;
Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true });
g.IS_REACT_ACT_ENVIRONMENT = true;
g.ResizeObserver = class { cb: any; constructor(cb: any) { this.cb = cb; } observe() { this.cb([{ contentRect: { width: 1000, height: 500 } }]); } disconnect() {} };
const errs: string[] = [];
const oe = console.error; console.error = (...a: any[]) => { errs.push(a.map(String).join(" ").slice(0, 300)); };

async function main() {
  const React = (await import("react")).default;
  const { createRoot } = await import("react-dom/client");
  const { act } = await import("react-dom/test-utils");
  const { Chart } = await import("../components/Chart");
  const { Feed } = await import("../components/Feed");
  const { Positioning } = await import("../components/Positioning");
  const { snapshotPayload } = await import("../lib/snapshot");
  const data = snapshotPayload("BTC");
  const end = Date.parse("2026-11-14T12:00:00Z");
  const candles = Array.from({ length: 200 }, (_, i) => { const t = end - (200 - i) * 3600e3; const b = 67000 + Math.sin(i / 5) * 800; return { t, o: b, h: b + 200, l: b - 200, c: b + 50, v: 100 }; });

  function App() {
    const [sel, setSel] = React.useState<any>(null);
    return React.createElement("div", null,
      React.createElement("div", { id: "chart", style: { width: 1000, height: 500 } },
        React.createElement(Chart, { candles, intervalMs: 3600e3, events: data.events, positions: data.positions, traders: data.traders, lastPrice: 67200, showTrades: true, showLevels: true, selectedId: sel?.id, onSelect: setSel })),
      React.createElement("div", { id: "feed" }, React.createElement(Feed, { feed: data.feed, traders: data.traders, selectedId: sel?.id, symbol: "BTC", onSelect: setSel })),
      React.createElement("div", { id: "pos" }, React.createElement(Positioning, { symbol: "BTC", stats: data.stats, positions: data.positions, traders: data.traders, lastPrice: 67200 })));
  }
  const root = createRoot(document.getElementById("root")!);
  await act(async () => { root.render(React.createElement(App)); });
  const count = () => ({ markers: document.querySelectorAll("#chart svg g[style*='pointer']").length, feedItems: document.querySelectorAll("#feed .cursor-pointer").length, posRows: document.querySelectorAll("#pos tbody tr").length });
  console.log("before", JSON.stringify(count()));
  const m = document.querySelectorAll("#chart svg g[style*='pointer']");
  const el = m[0] as any;
  const fire = (t: string) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true }));
  await act(async () => { fire("mouseover"); });
  console.log("after hover", JSON.stringify(count()));
  await act(async () => { fire("mousedown"); fire("mouseup"); fire("click"); });
  console.log("after click", JSON.stringify(count()));
  console.log("errors:", errs.length, errs.slice(0, 3));
}
main().catch((e) => { console.log("THROWN:", e && e.stack ? e.stack.slice(0, 900) : e); });
