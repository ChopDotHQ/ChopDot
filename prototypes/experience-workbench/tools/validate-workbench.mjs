import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const load = file => JSON.parse(fs.readFileSync(path.join(root, "registry", file), "utf8"));
const journeys = load("journeys.json");
const features = load("features.json");
const edges = load("edge-cases.json");
const progress = load("progress.json");
const fingerprintRecord = load("map-fingerprint.json");
const html = fs.readFileSync(path.join(root, "journey-map.html"), "utf8");
const featureHtml = fs.readFileSync(path.join(root, "feature-coverage.html"), "utf8");
const edgeHtml = fs.readFileSync(path.join(root, "edge-case-ledger.html"), "utf8");
const errors = [];
const ids = journeys.map(j => j.id);
const unique = new Set(ids);

if (journeys.length !== 28) errors.push(`Expected 28 journeys; found ${journeys.length}.`);
if (unique.size !== journeys.length) errors.push("Duplicate journey IDs.");
if (progress.registered_journeys !== journeys.length) errors.push("Progress journey count is stale.");

const golden = journeys.filter(j => j.status === "golden");
if (progress.golden_count !== golden.length) errors.push("Golden count is stale.");
if (progress.remaining_overall !== journeys.length - golden.length) errors.push("Remaining count is stale.");

const current = journeys.filter(j => j.status === "current");
if (progress.paused_after_freeze === true) {
  if (progress.current_journey !== null) errors.push("Paused freeze must not name a current journey.");
  if (current.length !== 0) errors.push("Paused freeze must not begin another journey.");
} else {
  if (!unique.has(progress.current_journey)) errors.push("Current journey does not exist.");
  if (current.length !== 1) errors.push("Exactly one journey must be current.");
  if (current[0]?.id !== progress.current_journey) errors.push("Current journey status and progress disagree.");
}

for (const j of journeys) {
  if (!j.name || !j.goal || !j.entry || !j.exit) errors.push(`Journey ${j.id} lacks an entry/exit contract.`);
  for (const next of j.next ?? []) if (!unique.has(next)) errors.push(`Journey ${j.id} points to missing ${next}.`);
  if (!(j.next?.length) && !j.terminal) errors.push(`Journey ${j.id} is an unapproved dead end.`);
  if (j.status === "golden") {
    for (const key of ["version","approved_on","prototype_path","spec_path","qa_path"]) {
      if (!j[key]) {
        errors.push(`Golden journey ${j.id} lacks ${key}.`);
      } else if (["prototype_path","spec_path","qa_path"].includes(key) && !fs.existsSync(path.join(root, j[key]))) {
        errors.push(`Golden journey ${j.id} points to missing ${key}: ${j[key]}.`);
      }
    }
  }
}

for (const feature of features) {
  if (!feature.journeys?.length) errors.push(`Feature ${feature.id} is orphaned.`);
  for (const id of feature.journeys ?? []) if (!unique.has(id)) errors.push(`Feature ${feature.id} points to missing journey ${id}.`);
}
for (const edge of edges) {
  if (!edge.journeys?.length) errors.push(`Edge case ${edge.id} is orphaned.`);
  for (const id of edge.journeys ?? []) if (!unique.has(id)) errors.push(`Edge case ${edge.id} points to missing journey ${id}.`);
}

const canonical = JSON.stringify({journeys, features, edges, progress});
const fingerprint = crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 16);
if (fingerprintRecord.fingerprint !== fingerprint) errors.push("Map fingerprint record is stale.");
if (!html.includes(`data-registry-fingerprint="${fingerprint}"`)) errors.push("Journey map was not generated from the current registry.");
if (!featureHtml.includes(`data-registry-fingerprint="${fingerprint}"`)) errors.push("Feature coverage page is stale.");
if (!edgeHtml.includes(`data-registry-fingerprint="${fingerprint}"`)) errors.push("Edge-case ledger is stale.");
for (const id of ids) if (!html.includes(`id="j${id}"`)) errors.push(`Journey ${id} is absent from the map.`);
if ((html.match(/class="journey"/g) ?? []).length !== journeys.length) errors.push("Map card count does not match registry.");

const inbound = new Map(ids.map(id => [id, 0]));
for (const j of journeys) for (const next of j.next ?? []) inbound.set(next, (inbound.get(next) ?? 0) + 1);
for (const j of journeys) {
  if ((inbound.get(j.id) ?? 0) === 0 && !j.entry_mode) errors.push(`Journey ${j.id} has no inbound path and no entry mode.`);
}

if (errors.length) {
  console.error("WORKBENCH GATE FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`WORKBENCH GATE PASSED: ${journeys.length} journeys, ${golden.length} Golden, map ${fingerprint}.`);
