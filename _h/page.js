const { JSDOM, VirtualConsole } = require("jsdom");

const BASE = "http://localhost:3000";
const vc = new VirtualConsole();
const logs = [];
vc.on("jsdomError", (e) => logs.push("jsdomError: " + String(e.message || e).slice(0, 300)));
vc.on("error", (...a) => logs.push("console.error: " + a.map(String).join(" ").slice(0, 400)));
vc.on("warn", (...a) => logs.push("warn: " + a.map(String).join(" ").slice(0, 200)));

(async () => {
  const dom = await JSDOM.fromURL(BASE + "/", {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe() { this.cb([{ contentRect: { width: 1000, height: 500 } }]); } disconnect() {} };
      w.fetch = (u, o) => fetch(new URL(u, BASE).href, o);
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      w.scrollTo = () => {};
      Object.defineProperty(w.HTMLElement.prototype, "scrollIntoView", { value() {}, configurable: true });
    },
  });
  const d = dom.window.document;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const snap = () => ({
    markers: d.querySelectorAll("svg g[style*='pointer']").length,
    feedItems: [...d.querySelectorAll(".cursor-pointer")].filter((e) => e.className.includes("p-2.5")).length,
    posRows: d.querySelectorAll("tbody tr").length,
    panels: d.querySelectorAll(".fixed.flex.flex-col").length,
    bodyLen: d.body.textContent.length,
  });
  for (let i = 0; i < 20; i++) { await sleep(1500); if (d.querySelectorAll("svg g[style*='pointer']").length) break; }
  console.log("loaded", JSON.stringify(snap()));
  const el = d.querySelector("svg g[style*='pointer']");
  if (!el) { console.log("no markers; body:", d.body.textContent.slice(0, 300)); console.log(logs.slice(0, 5)); process.exit(0); }
  const ev = (t) => el.dispatchEvent(new dom.window.MouseEvent(t, { bubbles: true }));
  ev("mouseover"); await sleep(300);
  console.log("hover", JSON.stringify(snap()));
  ev("mousedown"); ev("mouseup"); ev("click");
  for (const ms of [200, 1500, 4000]) { await sleep(ms); console.log("after click +" + ms, JSON.stringify(snap())); }
  console.log("logs:", logs.slice(0, 6));
  process.exit(0);
})().catch((e) => { console.log("THROWN", e.stack || e); process.exit(1); });
