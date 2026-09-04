import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, "registry", name), "utf8"));
const journeys = read("journeys.json");
const features = read("features.json");
const edges = read("edge-cases.json");
const progress = read("progress.json");

const canonical = JSON.stringify({journeys, features, edges, progress});
const fingerprint = crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 16);
const byId = new Map(journeys.map(j => [j.id, j]));
const inbound = new Map(journeys.map(j => [j.id, []]));
for (const journey of journeys) {
  for (const nextId of journey.next) {
    if (inbound.has(nextId)) inbound.get(nextId).push(journey.id);
  }
}

const esc = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const statusLabel = {
  golden: "Golden",
  current: "Current",
  "not-started": "Not started",
  "cross-cutting": "Cross-cutting"
};
const statusClass = {
  golden: "golden",
  current: "current",
  "not-started": "todo",
  "cross-cutting": "cross"
};

const phases = ["Core loop", "Support", "Expansion", "Cross-cutting"];
const golden = journeys.filter(j => j.status === "golden").length;
const remaining = journeys.length - golden;
const edgeCovered = edges.filter(e => e.status === "covered").length;
const edgePartial = edges.filter(e => ["partial","current"].includes(e.status)).length;
const featureMapped = features.filter(f => f.journeys?.length).length;

const coreOrder = ["01","02","03","04","08","05","06","07","10","11","12"];
const core = coreOrder.map(id => {
  const j = byId.get(id);
  return `<a class="node ${statusClass[j.status]}" href="#j${id}"><span>${id}</span>${esc(j.name)}</a>`;
}).join('<span class="arrow">→</span>');

const cards = journeys.map(j => {
  const incoming = inbound.get(j.id) ?? [];
  const next = j.next.map(id => `<a href="#j${id}">${id}</a>`).join(", ") || "Terminal";
  const incomingText = incoming.map(id => `<a href="#j${id}">${id}</a>`).join(", ") ||
    (j.entry_mode ? `Entry: ${esc(j.entry_mode)}` : '<span class="bad">No inbound path</span>');
  const artifact = j.prototype_path
    ? `<a class="artifact" href="${esc(j.prototype_path)}">Open artifact</a>`
    : '<span class="muted">No artifact yet</span>';
  const version = j.version ? ` · ${esc(j.version)}` : "";
  return `<article class="journey" id="j${j.id}" data-status="${j.status}">
    <div class="jhead">
      <div class="jtitle"><span class="jid">${j.id}</span><div><h3>${esc(j.name)}</h3><small>${esc(j.phase)} · ${esc(j.priority)}</small></div></div>
      <span class="pill ${statusClass[j.status]}">${statusLabel[j.status]}${version}</span>
    </div>
    <p>${esc(j.goal)}</p>
    <dl>
      <div><dt>Entry</dt><dd>${esc(j.entry)}</dd></div>
      <div><dt>Exit</dt><dd>${esc(j.exit)}</dd></div>
      <div><dt>Inbound</dt><dd>${incomingText}</dd></div>
      <div><dt>Next</dt><dd>${next}</dd></div>
    </dl>
    <div class="jfoot">${artifact}<span>${esc(j.approval)}</span></div>
  </article>`;
}).join("\n");

const phaseSections = phases.map(phase => {
  const phaseCards = journeys.filter(j => j.phase === phase).map(j => `<a href="#j${j.id}" class="mini ${statusClass[j.status]}"><b>${j.id}</b><span>${esc(j.name)}</span></a>`).join("");
  return `<section class="phase"><div class="section-title"><h2>${phase}</h2><span>${journeys.filter(j => j.phase === phase).length} journeys</span></div><div class="mini-grid">${phaseCards}</div></section>`;
}).join("");

const html = `<!doctype html>
<html lang="en" data-registry-fingerprint="${fingerprint}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ChopDot Experience Map</title>
<style>
:root{--bg:#f7f7f8;--surface:#fff;--ink:#111113;--secondary:#66666d;--muted:#929299;--border:#e6e6e9;--pink:#e6007a;--green:#0b7549;--blue:#315aa8;--orange:#835800;--shadow:0 10px 30px rgba(0,0,0,.05)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif}
a{color:inherit;text-decoration:none}.wrap{max-width:1240px;margin:auto;padding:32px 22px 90px}
header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.title h1{font-size:34px;letter-spacing:-.045em;margin:0}.title p{max-width:700px;color:var(--secondary);font-size:12px;line-height:1.55}
.meta{font-size:10px;color:var(--secondary);text-align:right}.meta code{display:block;margin-top:6px;font-size:9px}
.stats{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin:22px 0}.stat{background:var(--surface);border:1px solid var(--border);border-radius:15px;padding:13px}.stat b{display:block;font-size:23px}.stat span{font-size:9px;color:var(--secondary)}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:19px;padding:17px;margin:13px 0;box-shadow:var(--shadow)}.panel h2{font-size:17px;margin:0 0 5px}.panel p{font-size:10px;color:var(--secondary);margin:0}
.core{display:flex;align-items:center;gap:6px;overflow:auto;padding:13px 0 4px}.node{min-width:118px;padding:10px;border:1px solid var(--border);border-radius:12px;background:#fafafa;font-size:10px;font-weight:720}.node span{display:block;font-size:8px;color:var(--muted);margin-bottom:3px}.arrow{color:var(--muted)}
.golden{background:#e5f7ee!important;color:var(--green)!important;border-color:#b8e1ce!important}.current{background:#fde8f3!important;color:#a00055!important;border-color:#edbfd7!important}.cross{background:#e9edf9!important;color:#304c91!important;border-color:#c9d3ee!important}.todo{background:#efeff1!important;color:#666!important}
.section-title{display:flex;align-items:end;justify-content:space-between;margin:30px 0 10px}.section-title h2{font-size:21px;margin:0}.section-title span{font-size:10px;color:var(--secondary)}
.mini-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.mini{display:flex;gap:8px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:9px}.mini b{font-size:9px}.mini span{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.catalog{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-top:12px}.journey{background:var(--surface);border:1px solid var(--border);border-radius:17px;padding:14px;scroll-margin-top:15px}.jhead{display:flex;justify-content:space-between;gap:8px}.jtitle{display:flex;gap:8px;align-items:center}.jid{width:25px;height:25px;border-radius:8px;background:#f0f0f2;display:grid;place-items:center;font-size:9px;font-weight:800}.jtitle h3{font-size:12px;margin:0}.jtitle small{font-size:8px;color:var(--secondary)}
.pill{font-size:8px;font-weight:780;border-radius:999px;padding:4px 7px;height:max-content;white-space:nowrap}.journey>p{font-size:10px;color:var(--secondary);line-height:1.45;min-height:42px}
dl{margin:0}dl div{display:grid;grid-template-columns:48px 1fr;gap:6px;margin-top:6px;font-size:9px;line-height:1.4}dt{color:var(--muted);font-weight:700}dd{margin:0;color:var(--secondary)}dd a{color:var(--pink);font-weight:700}.bad{color:#a73338;font-weight:700}
.jfoot{display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--border);margin-top:10px;padding-top:9px;font-size:8px;color:var(--secondary)}.artifact{color:var(--pink);font-weight:750}.muted{color:var(--muted)}
.gate{display:flex;gap:8px;align-items:center;font-size:10px;color:var(--secondary);margin-top:10px}.gate b{color:var(--green)}
@media(max-width:980px){.stats{grid-template-columns:repeat(3,1fr)}.catalog{grid-template-columns:repeat(2,1fr)}.mini-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:640px){.wrap{padding:22px 13px 70px}header{display:block}.meta{text-align:left;margin-top:12px}.stats{grid-template-columns:repeat(2,1fr)}.catalog{grid-template-columns:1fr}.mini-grid{grid-template-columns:repeat(2,1fr)}.title h1{font-size:28px}}
</style>
</head>
<body><main class="wrap">
<header><div class="title"><h1>ChopDot Experience Map</h1><p>All 28 journeys, their entry and exit contracts, connections, current status, artifacts, and recovery ownership. This page is generated from the canonical registry and must not be edited by hand.</p></div><div class="meta">Generated ${esc(progress.updated_on)}<code>${fingerprint}</code></div></header>
<section class="stats">
<div class="stat"><b>${journeys.length}</b><span>registered journeys</span></div>
<div class="stat"><b>${golden}</b><span>Golden / approved</span></div>
<div class="stat"><b>${remaining}</b><span>remaining overall</span></div>
<div class="stat"><b>${featureMapped}/${features.length}</b><span>features mapped</span></div>
<div class="stat"><b>${edgeCovered}</b><span>edge cases covered</span></div>
<div class="stat"><b>${edgePartial}</b><span>partial or current</span></div>
</section>
<section class="panel"><h2>Core product loop</h2><p>Simple user path over the full system.</p><div class="core">${core}</div><div class="gate"><b>Registry gate active.</b><span>Run <code>npm run gate</code> before freezing any journey.</span></div></section>
${phaseSections}
<div class="section-title"><h2>Journey registry</h2><span>Every journey shown individually</span></div>
<section class="catalog">${cards}</section>
</main></body></html>`;

const sharedCss = `
:root{--bg:#f7f7f8;--surface:#fff;--ink:#111113;--secondary:#66666d;--muted:#929299;--border:#e6e6e9;--pink:#e6007a;--green:#0b7549;--blue:#315aa8;--orange:#835800}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif}.wrap{max-width:1180px;margin:auto;padding:30px 20px 80px}a{color:inherit;text-decoration:none}
header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:20px}h1{font-size:31px;letter-spacing:-.04em;margin:0 0 6px}header p{font-size:11px;color:var(--secondary);line-height:1.5;margin:0;max-width:690px}.nav{display:flex;gap:7px;flex-wrap:wrap}.nav a{background:#111;color:white;padding:8px 10px;border-radius:10px;font-size:9px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:16px 0}.stat{background:white;border:1px solid var(--border);border-radius:14px;padding:13px}.stat b{display:block;font-size:22px}.stat span{font-size:9px;color:var(--secondary)}
.table{background:white;border:1px solid var(--border);border-radius:16px;overflow:hidden}.row{display:grid;gap:10px;align-items:center;padding:11px 13px;border-top:1px solid var(--border);font-size:10px}.row:first-child{border-top:0}.head{background:#f0f0f2;color:var(--secondary);font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.name{font-weight:720}.sub{font-size:9px;color:var(--secondary);line-height:1.4}.pill{display:inline-block;padding:4px 7px;border-radius:999px;font-size:8px;font-weight:750}.golden{background:#e5f7ee;color:#0b7549}.current{background:#fde8f3;color:#a00055}.partial{background:#fff2d2;color:#835800}.uncovered,.not-started{background:#ededf0;color:#666}.covered{background:#e5f7ee;color:#0b7549}.cross-cutting{background:#e9edf9;color:#304c91}
@media(max-width:720px){header{display:block}.nav{margin-top:12px}.stats{grid-template-columns:1fr 1fr}.row{font-size:9px}}
`;

const featureRows = features.map(feature => {
  const links = feature.journeys.map(id => `<a href="journey-map.html#j${id}">${id} ${esc(byId.get(id)?.name ?? "")}</a>`).join("<br>");
  return `<div class="row" style="grid-template-columns:55px 1.2fr 1.8fr 110px">
    <div>${feature.id}</div><div class="name">${esc(feature.name)}</div>
    <div class="sub">${links}</div><div><span class="pill ${feature.status}">${esc(feature.status)}</span></div>
  </div>`;
}).join("");
const featureHtml = `<!doctype html><html lang="en" data-registry-fingerprint="${fingerprint}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChopDot Feature Coverage</title><style>${sharedCss}.row a{color:var(--pink);font-weight:700}</style></head><body><main class="wrap">
<header><div><h1>Feature Coverage</h1><p>Every capability is mapped to a registered journey. This page is generated from the same registry as the Experience Map.</p></div><nav class="nav"><a href="journey-map.html">Journeys</a><a href="edge-case-ledger.html">Edge cases</a></nav></header>
<section class="stats"><div class="stat"><b>${features.length}</b><span>tracked features</span></div><div class="stat"><b>${featureMapped}</b><span>mapped to journeys</span></div><div class="stat"><b>${features.filter(f=>f.status==="golden").length}</b><span>Golden</span></div><div class="stat"><b>${features.filter(f=>["partial","in-progress"].includes(f.status)).length}</b><span>partial/current</span></div></section>
<section class="table"><div class="row head" style="grid-template-columns:55px 1.2fr 1.8fr 110px"><div>ID</div><div>Feature</div><div>Journey owners</div><div>Status</div></div>${featureRows}</section>
</main></body></html>`;

const edgeRows = edges.map(edge => {
  const links = edge.journeys.map(id => `<a href="journey-map.html#j${id}">${id} ${esc(byId.get(id)?.name ?? "")}</a>`).join("<br>");
  return `<div class="row" style="grid-template-columns:55px 90px 1.4fr 1.7fr 110px">
    <div>${edge.id}</div><div class="sub">${esc(edge.area)}</div><div class="name">${esc(edge.case)}</div>
    <div class="sub">${links}</div><div><span class="pill ${edge.status}">${esc(edge.status)}</span></div>
  </div>`;
}).join("");
const edgeHtml = `<!doctype html><html lang="en" data-registry-fingerprint="${fingerprint}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChopDot Edge Case Ledger</title><style>${sharedCss}.row a{color:var(--pink);font-weight:700}</style></head><body><main class="wrap">
<header><div><h1>Edge & Failure Coverage</h1><p>Offline, failure, permission, conflict, stale-link, and recovery states mapped to their owning journeys. Generated from the canonical registry.</p></div><nav class="nav"><a href="journey-map.html">Journeys</a><a href="feature-coverage.html">Features</a></nav></header>
<section class="stats"><div class="stat"><b>${edges.length}</b><span>tracked cases</span></div><div class="stat"><b>${edgeCovered}</b><span>covered</span></div><div class="stat"><b>${edgePartial}</b><span>partial/current</span></div><div class="stat"><b>${edges.filter(e=>e.status==="uncovered").length}</b><span>uncovered</span></div></section>
<section class="table"><div class="row head" style="grid-template-columns:55px 90px 1.4fr 1.7fr 110px"><div>ID</div><div>Area</div><div>Case</div><div>Journey owners</div><div>Status</div></div>${edgeRows}</section>
</main></body></html>`;

fs.writeFileSync(path.join(root, "journey-map.html"), html);
fs.writeFileSync(path.join(root, "feature-coverage.html"), featureHtml);
fs.writeFileSync(path.join(root, "edge-case-ledger.html"), edgeHtml);
fs.writeFileSync(path.join(root, "registry", "map-fingerprint.json"), JSON.stringify({
  generated_on: progress.updated_on,
  fingerprint,
  journey_count: journeys.length,
  golden_count: golden,
  current_journey: progress.current_journey
}, null, 2));
console.log(`Generated journey-map.html from ${journeys.length} journeys (${fingerprint}).`);
