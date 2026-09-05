import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const sourceDir = path.join(root, "journeys/12-complete-settlement/v1-golden-candidate.html.gz.b64.parts");
const target = path.join(root, "journeys/12-complete-settlement/v1-golden-candidate.html");
const expectedSha = "b6cc690e6993f3d8e611a0b793d0bf8fd17953af176f3bebdeca668235272dec";
const parts = fs.readdirSync(sourceDir).filter(name => name.endsWith(".part")).sort();
if (!parts.length) throw new Error("Journey 12 prototype source parts are missing.");
const encoded = parts.map(name => fs.readFileSync(path.join(sourceDir, name), "utf8").trim()).join("");
const html = zlib.gunzipSync(Buffer.from(encoded, "base64"));
const sha = createHash("sha256").update(html).digest("hex");
if (sha !== expectedSha) throw new Error(`Journey 12 checksum mismatch: expected ${expectedSha}, got ${sha}`);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, html);
console.log(`Materialized Journey 12 V1 (${html.length} bytes, ${sha}).`);
