// End-to-end check of the Campaign Services Rate Calculator.
//
//   node test/e2e.js [path/to/index.html]
//
// Needs jsdom. Looks in this repo's node_modules first, then falls back to the
// copy under Campaign-Services-claude.
"use strict";

const fs = require("fs");
const pathMod = require("path");

function loadJsdom() {
  const candidates = [
    "jsdom",
    pathMod.join(__dirname, "..", "node_modules", "jsdom"),
    "/Users/sagaragarwal/Documents/GitHub/Campaign-Services-claude/projects/cs-billability/test/node_modules/jsdom"
  ];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* try the next one */ }
  }
  console.error("jsdom not found. Run `npm i -D jsdom`, or fix the fallback path in this file.");
  process.exit(2);
}
const { JSDOM } = loadJsdom();

const SRC = process.argv[2] || pathMod.join(__dirname, "..", "index.html");
const HTML = fs.readFileSync(SRC, "utf8");
const BASE = "https://sammy-bluecore.github.io/cs-rate-calculator/";

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra ? "  -> " + extra : "")); }
};

// A fresh page at a given URL, with a scriptable localStorage.
function open(search, store) {
  store = store || {};
  const dom = new JSDOM(HTML, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: BASE + (search || ""),
    // Installed before the page's own script runs, so a seeded unlock is visible
    // to init().
    beforeParse(window) {
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: k => (k in store ? store[k] : null),
          setItem: (k, v) => { store[k] = String(v); },
          removeItem: k => { delete store[k]; }
        },
        configurable: true
      });
    }
  });
  dom.window.addEventListener("error", e =>
    console.log("  PAGE ERROR:", (e.error && e.error.stack) || e.message));
  return {
    dom, win: dom.window, doc: dom.window.document, store,
    $: id => dom.window.document.getElementById(id)
  };
}

const click = (win, node, opts) =>
  node.dispatchEvent(new win.MouseEvent("click", Object.assign({ bubbles: true, cancelable: true }, opts)));
const setInput = (win, node, v) => {
  node.value = String(v);
  node.dispatchEvent(new win.Event("input", { bubbles: true }));
};
const setSelect = (win, node, v) => {
  node.value = String(v);
  node.dispatchEvent(new win.Event("change", { bubbles: true }));
};
const setCheck = (win, node, on) => {
  node.checked = on;
  node.dispatchEvent(new win.Event("change", { bubbles: true }));
};
const num = s => Number(String(s).replace(/[^0-9.-]/g, ""));
const visibleText = doc =>
  [...doc.body.childNodes].filter(n => n.nodeName !== "SCRIPT").map(n => n.textContent).join(" ");

function run() {
  console.log("\n1. Standalone document");
  ok(/^<!doctype html>/i.test(HTML.trim()), "starts with a doctype");
  ok(/<html lang="en">/.test(HTML), "html element with a lang");
  ok(/<meta charset="utf-8">/.test(HTML), "charset");
  ok(/viewport-fit=cover/.test(HTML), "viewport with safe-area support");
  ok(/<meta name="robots" content="noindex, nofollow">/.test(HTML), "noindex meta");
  ok(/<\/body>\s*<\/html>\s*$/.test(HTML), "closes body and html");
  ok(!/SHARE_BASE/.test(HTML), "no hardcoded artifact URL");
  ok(/max-width:1280px/.test(HTML), "canvas is 1280px wide");
  ok(/--body:"Inter"/.test(HTML) && !/Newsreader/.test(HTML), "body font is Inter, Newsreader gone");

  const A = open();
  const { win, doc, $ } = A;

  console.log("\n2. Money path (window.demo)");
  try { ok(win.demo() === true, "demo() assertions"); }
  catch (e) { ok(false, "demo() assertions", e.message); }

  console.log("\n3. Client-safe default view");
  ok(!doc.body.classList.contains("internal"), "body has no .internal class");
  ok($("switches").classList.contains("ghost"), "mode switches hidden");
  ok($("share-internal").classList.contains("ghost"), "internal share button hidden");
  ok($("flagbar").classList.contains("ghost"), "internal pill hidden");
  ok($("disc-panel").hidden, "discount panel hidden");
  ok($("accounts").children.length === 0, "account datalist empty");
  ok(!$("account").hasAttribute("list"), "account input not wired to a list");
  ok(!/\$65|hourly/i.test(visibleText(doc)), "no hourly rate on screen");
  ok(doc.querySelectorAll("#rows .c-hours span").length === 0, "no per-row hours in the DOM");

  console.log("\n4. Default working state");
  ok($("rows").children.length === 1, "one seeded line item");
  ok(num($("v-monthly").textContent) === 2340, "monthly = $2,340", $("v-monthly").textContent);
  ok(num($("v-contract").textContent) === 28080, "12-month = $28,080", $("v-contract").textContent);
  ok($("head-term").textContent === "12-month total", "column header names the term");

  console.log("\n5. Line item add / remove / edit");
  click(win, $("add"));
  ok($("rows").children.length === 2, "add row");
  const qty2 = $("qty-1");
  ok(qty2 && qty2.type === "number" && qty2.min === "0" && qty2.step === "1", "qty is a spinnable number input");
  setInput(win, qty2, 10);
  ok(num($("v-monthly").textContent) === 2340 + 5850, "totals react to qty", $("v-monthly").textContent);
  setSelect(win, $("sku-1"), "rev");
  ok(num($("v-monthly").textContent) === 2340 + 1300, "totals react to SKU change", $("v-monthly").textContent);
  click(win, $("rows").children[1].querySelector(".del"));
  ok($("rows").children.length === 1, "remove row");

  console.log("\n6. Contract term");
  setSelect(win, $("term"), "24");
  ok(num($("v-contract").textContent) === 2340 * 24, "24-month total", $("v-contract").textContent);
  ok($("head-term").textContent === "24-month total", "header relabels");
  setSelect(win, $("term"), "1");
  ok($("l-contract").textContent === "Estimate total", "one-time relabels the hero tile");
  ok(num($("v-contract").textContent) === 2340, "one-time total equals monthly");

  console.log("\n7. Presets reconcile to the definitions doc");
  const docTotals = [7980, 8775, 23400, 2925, 3830];
  doc.querySelectorAll("[data-preset]").forEach((btn, i) => {
    click(win, btn);
    ok(num($("v-contract").textContent) === docTotals[i],
        "preset " + (i + 1) + " = $" + docTotals[i].toLocaleString(), $("v-contract").textContent);
  });

  console.log("\n8. Internal unlock by gesture");
  click(win, $("unlock"));
  ok(!doc.body.classList.contains("internal"), "plain click does nothing");
  click(win, $("unlock"), { altKey: true });
  ok(doc.body.classList.contains("internal"), "alt-click unlocks");
  ok(A.store["cs-rate-internal"] === "1", "gesture persists to localStorage");
  ok(!$("switches").classList.contains("ghost"), "switches appear");
  ok(!$("share-internal").classList.contains("ghost"), "internal share button appears");
  ok(!$("flagbar").classList.contains("ghost"), "internal pill appears");
  ok($("accounts").children.length === 60, "60 account names load", $("accounts").children.length);
  ok($("account").getAttribute("list") === "accounts", "datalist wired");
  ok(/\$65\/hr/.test($("s-hours").textContent), "hourly rate now shown", $("s-hours").textContent);
  ok($("flagbar").children.length === 1, "one lock pill, not duplicated");

  console.log("\n9. Capacity readout");
  click(win, doc.querySelectorAll("[data-preset]")[0]);
  ok(num($("v-hours").textContent) === 120, "hours total = 120h", $("v-hours").textContent);
  ok(/15\.0 working days/.test($("s-hours").textContent), "15.0 working days at 8h", $("s-hours").textContent);

  console.log("\n10. Edit rates");
  setCheck(win, $("sw-edit"), true);
  ok($("price-0") && $("price-0").type === "number", "price becomes an input");
  setInput(win, $("price-0"), 500);
  ok(num($("v-contract").textContent) === 4 * 500 + 12 * 470, "repriced total", $("v-contract").textContent);
  ok($("hours-0") && $("hours-0").type === "number", "hours becomes an input");
  setInput(win, $("hours-0"), 6);
  ok(num($("v-hours").textContent) === 4 * 6 + 12 * 7, "hours override applied", $("v-hours").textContent);

  console.log("\n11. Volume pricing");
  setCheck(win, $("sw-disc"), true);
  ok(!$("disc-panel").hidden, "discount panel appears");
  ok($("ladder").querySelectorAll(".tier").length === 3, "three tiers rendered");
  setInput(win, $("price-0"), 585);
  setInput(win, $("hours-0"), 9);
  setSelect(win, $("term"), "1");
  click(win, $("rows").children[1].querySelector(".del"));
  setInput(win, $("qty-0"), 24);
  ok($("v-monthly-was").hidden, "no strike-through below tier 1");
  ok(/No volume discount yet at 24/.test($("d-line").textContent), "24 builds is below tier 1", $("d-line").textContent);
  ok(/Add 1 more campaign build to unlock 5%/.test($("d-nudge").textContent), "nudge counts exactly", $("d-nudge").textContent);
  setInput(win, $("qty-0"), 25);
  ok(num($("v-contract").textContent) === Math.round(25 * 585 * 0.95), "5% applied at 25", $("v-contract").textContent);
  ok(!$("v-contract-was").hidden && num($("v-contract-was").textContent) === 25 * 585, "list price struck through");
  ok(/5% off/.test($("d-line").textContent), "savings line names the percent");
  ok(/Effective rate/.test($("d-eff").textContent), "effective per-build rate shown");
  setInput(win, $("qty-0"), 100);
  ok(/Top volume tier reached/.test($("d-nudge").textContent), "top tier message");
  setSelect(win, $("sku-0"), "rev");
  setInput(win, $("qty-0"), 300);
  ok($("v-contract-was").hidden, "revisions alone trigger no tier");
  setSelect(win, $("sku-0"), "e2ecc");
  setInput(win, $("qty-0"), 10);
  setSelect(win, $("term"), "12");
  ok(num($("v-contract").textContent) === Math.round(10 * 585 * 12 * 0.85), "tier measured across the term", $("v-contract").textContent);

  console.log("\n12. The URL carries the estimate");
  setInput(win, $("account"), "Alo LLC");
  setInput(win, $("ns"), "alo");
  setInput(win, $("hours-0"), 4);
  const internalQuery = win.eval("buildQuery(true)");
  const clientQuery   = win.eval("buildQuery(false)");
  const beforeContract = $("v-contract").textContent;
  const decode = q => JSON.parse(win.eval(
    'unb64u(new URLSearchParams(' + JSON.stringify(q) + ').get("e").slice(5))'));

  ok(/[?&]?e=CSE1\./.test(internalQuery), "estimate rides in one e= parameter", internalQuery);
  ok(new URLSearchParams(internalQuery).get("e").length < 220, "the code stays short", internalQuery.length + " chars");
  ok(!/[?&]l=|[?&]a=|[?&]t=/.test(internalQuery), "no spelled-out line items in the URL");

  const ib = decode(internalQuery), cb = decode(clientQuery);
  ok(ib.a === "Alo LLC", "account in the code", ib.a);
  ok(JSON.stringify(ib.l) === JSON.stringify([["e2ecc", 10, 585]]), "line item in the code", JSON.stringify(ib.l));
  ok(Array.isArray(ib.h) && ib.h.length === 1, "internal code carries the hours override");
  ok(/internal=1/.test(internalQuery) && /edit=1/.test(internalQuery), "internal URL carries the flags");
  ok(cb.h === undefined, "client code omits hours", JSON.stringify(cb.h));
  ok(!/internal=/.test(clientQuery) && !/edit=/.test(clientQuery), "client URL omits internal and edit");
  ok(cb.c === 1, "client code keeps the discount flag");

  console.log("\n13. Round trip into a fresh page");
  {
    const B = open("?" + clientQuery);
    ok(B.$("account").value === "Alo LLC", "account restored", B.$("account").value);
    ok(B.$("ns").value === "alo", "namespace restored");
    ok(B.$("term").value === "12", "term restored");
    ok(B.$("rows").children.length === 1, "line items restored");
    ok(B.$("v-contract").textContent === beforeContract, "totals match", B.$("v-contract").textContent);
    ok(!B.doc.body.classList.contains("internal"), "a client link opens client-safe");
    ok(!/\$65/.test(visibleText(B.doc)), "no rate on the restored page");
    ok(!B.$("disc-panel").hidden, "discount flag survived");
    ok(/Generated/.test(B.$("stamp").textContent), "date stamp restored");
  }

  console.log("\n14. Price freeze");
  {
    const code = p => "?e=CSE1." + Buffer.from(JSON.stringify(p)).toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const C = open(code({ t: 1, l: [["e2ecc", 10, 585]] }));
    ok(num(C.$("v-contract").textContent) === 5850, "shared price wins over the default", C.$("v-contract").textContent);
    const D = open(code({ t: 1, l: [["e2ecc", 10, 999]] }));
    ok(num(D.$("v-contract").textContent) === 9990, "an older frozen price is honoured", D.$("v-contract").textContent);
    // links made before the code format still resolve
    const L = open("?t=1&l=e2ecc:10:585");
    ok(num(L.$("v-contract").textContent) === 5850, "legacy spelled-out link still works", L.$("v-contract").textContent);
  }

  console.log("\n15. Hidden URL parameters");
  {
    const E = open("?internal=1");
    ok(E.doc.body.classList.contains("internal"), "?internal=1 opens the internal view");
    ok(E.store["cs-rate-internal"] === undefined, "?internal=1 does not persist");
    ok(E.$("accounts").children.length === 60, "account list loads");

    const F = open("?edit=1");
    ok(F.doc.body.classList.contains("internal"), "?edit=1 implies internal");
    ok(F.$("price-0") && F.$("price-0").type === "number", "?edit=1 makes prices editable");

    const G = open("?" + clientQuery);
    ok(!G.$("disc-panel").hidden, "the code turns the ladder back on");
    ok(!G.doc.body.classList.contains("internal"), "a client code stays client-safe");

    const H = open("", { "cs-rate-internal": "1" });
    ok(H.doc.body.classList.contains("internal"), "a stored unlock needs no parameter");

    const I = open("?e=CSE1.not-real-base64!!");
    ok(I.$("rows").children.length === 1, "a junk code still renders", I.$("rows").children.length);
    ok(I.$("term").value === "12", "junk code falls back to a 12 month default");
    const J = open("?e=" + Buffer.from('{"l":[["nope",1,1]]}').toString("base64url"));
    ok(J.$("rows").children.length === 1, "an unknown SKU is dropped, not rendered");
  }

  console.log("\n16. Lock again before screen sharing");
  click(win, $("flagbar").children[0]);
  ok(!doc.body.classList.contains("internal"), "lock pill re-hides internal view");
  ok($("switches").classList.contains("ghost"), "switches hidden again");
  ok(!/\$65/.test(visibleText(doc)), "hourly rate gone from the rendered DOM");
  ok(!/internal=/.test(win.eval("buildQuery(true)")), "locking drops the flag from the URL");

  console.log("\n16b. Header layout");
  const order = [...doc.querySelectorAll(".head-actions > *")]
    .map(n => (n.id || n.className).replace(" ghost", "")).join("|");
  ok(order === "flagbar|switches|share-internal|share",
     "header order: pill, edit, volume, internal link, share", order);
  ok(/Share pricing/.test($("share-label").textContent), "share button renamed", $("share-label").textContent);
  ok(!/🔗/.test($("share").textContent), "only one link glyph on the share button");
  ok($("share-internal").querySelectorAll("svg").length === 1, "internal link button has a link glyph");
  ok($("share").nextElementSibling === null, "share pricing is the last control in the stack");
  // Nothing in the stack ever collapses, so the share button cannot move.
  ok(!/\[hidden\]/.test(doc.querySelector(".head-actions").innerHTML), "no collapsing hidden attributes in the stack");

  console.log("\n17. Cards");
  {
    const cards = doc.querySelectorAll(".card");
    ok(cards.length === 3, "three cards");
    ok(cards[0].querySelectorAll(".face").length === 2, "front and back faces");
    click(win, cards[0].querySelector(".flipctl"));
    ok(cards[0].classList.contains("flipped"), "card flips");
    ok(!/rotateY|backface-visibility|perspective:/.test(HTML), "no 3D rotation, so no mirrored text");
    ok(!/filter:blur/.test(HTML), "the blur is gone");
    ok(/margin-top:20px/.test(HTML.slice(HTML.indexOf(".cards{"), HTML.indexOf(".cards{") + 160)),
       "cards have space above them");
    ok(cards[0].querySelectorAll(".face")[1].textContent.includes("Site campaign is 2 builds"), "rules on the back");
    ok(/Never book a subsequent touch as a Revision/.test(cards[1].querySelectorAll(".face")[1].textContent),
       "SKU misuse warning present");
  }

  console.log("\n18. Footer");
  ok(/not a binding quote/.test(doc.querySelector(".foot").textContent), "disclaimer always visible");
  ok(/Generated/.test($("stamp").textContent), "date stamp present", $("stamp").textContent);

  console.log("\n" + "=".repeat(48));
  console.log("PASS " + pass + "   FAIL " + fail);
  process.exit(fail ? 1 : 0);
}

setTimeout(run, 50);
