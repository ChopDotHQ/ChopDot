import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "registry", "materialized-prototypes.json"), "utf8"),
);

for (const artifact of manifest.artifacts) {
  const sourcePaths = artifact.sources ?? [artifact.source];
  if (!sourcePaths.length || sourcePaths.some((source) => !source)) {
    throw new Error(`Missing source declaration for ${artifact.target}`);
  }
  const encoded = sourcePaths
    .map((source) => fs.readFileSync(path.join(root, source), "utf8").trim())
    .join("");
  const html = zlib.gunzipSync(Buffer.from(encoded, "base64"));
  const digest = crypto.createHash("sha256").update(html).digest("hex");
  if (digest !== artifact.sha256) {
    throw new Error(
      `Checksum mismatch for ${artifact.target}: expected ${artifact.sha256}, got ${digest}`,
    );
  }
  const target = path.join(root, artifact.target);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  console.log(`Materialized ${artifact.target} (${html.length} bytes).`);
}
