import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const partsDir = path.join(root, "registry", "contract-update-bundle.json.gz.b64.parts");
const encoded = fs.readdirSync(partsDir)
  .filter((name) => name.endsWith(".part"))
  .sort()
  .map((name) => fs.readFileSync(path.join(partsDir, name), "utf8").trim())
  .join("");
const bundle = JSON.parse(zlib.gunzipSync(Buffer.from(encoded, "base64")).toString("utf8"));

for (const file of bundle.files) {
  const content = Buffer.from(file.content_base64, "base64");
  const digest = crypto.createHash("sha256").update(content).digest("hex");
  if (digest !== file.sha256) {
    throw new Error(`Bundle checksum mismatch for ${file.path}`);
  }
  const target = path.join(root, file.path);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
console.log(`Applied contract bundle ${bundle.version}: ${bundle.files.length} files.`);
