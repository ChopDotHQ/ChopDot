import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const partsDir = path.join(root, "registry/j12-candidate-bundle.json.gz.b64.parts");
const parts = fs.readdirSync(partsDir).filter(name => name.endsWith(".part")).sort();
if (!parts.length) throw new Error("Journey 12 candidate bundle is missing.");
const encoded = parts.map(name => fs.readFileSync(path.join(partsDir, name), "utf8").trim()).join("");
const bundle = JSON.parse(zlib.gunzipSync(Buffer.from(encoded, "base64")).toString("utf8"));
for (const [relative, content] of Object.entries(bundle.files)) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.endsWith("\n") ? content : `${content}\n`);
}
console.log(`Applied ${bundle.name}: ${Object.keys(bundle.files).length} files.`);
