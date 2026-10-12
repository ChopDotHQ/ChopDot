import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const manifest = JSON.parse(
  readFileSync(new URL("./source-manifest.json", import.meta.url)),
);
for (const [path, expected] of Object.entries(manifest.files))
  assert.equal(
    createHash("sha256")
      .update(readFileSync(new URL(path, import.meta.url)))
      .digest("hex"),
    expected,
    path,
  );
assert.equal(manifest.schema_sha, "5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013");
assert.equal(
  manifest.authority_sha,
  "4ba456e6595330e4ca8e21366e0d827f17e10881",
);
console.log(
  `Verified ${Object.keys(manifest.files).length} immutable reference copies.`,
);
