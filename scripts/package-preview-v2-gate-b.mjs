import {
  cpSync,
  mkdirSync,
  readFileSync,
  mkdtempSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = resolve(new URL("..", import.meta.url).pathname);
const out = process.argv[2]
  ? resolve(process.argv[2])
  : mkdtempSync(join(tmpdir(), "chopdot-gate-b-preview-"));
if (process.argv[2] && existsSync(out))
  throw Error(`Output already exists; choose a new path: ${out}`);
mkdirSync(out, { recursive: true });
for (const path of [
  "prototypes/integrated-product-preview-v2",
  ...[
    "01-enter-chopdot",
    "02-home-orientation",
    "03-create-group",
    "05-add-expense",
  ].map((j) => `prototypes/experience-workbench/journeys/${j}`),
])
  cpSync(join(root, path), join(out, path), {
    recursive: true,
    filter: (source) =>
      !source.includes("/artifacts/") && !source.includes("/gate-b/evidence/"),
  });
const j01 = join(
  out,
  "prototypes/experience-workbench/journeys/01-enter-chopdot",
);
execFileSync(process.execPath, [`${j01}/source/build.mjs`], {
  cwd: out,
  stdio: "inherit",
});
const hash = createHash("sha256")
  .update(readFileSync(`${j01}/v1-candidate.html`))
  .digest("hex");
if (hash !== "97f3da489c78cb842c354390b2e354397a6a6c3843228ec9928efebaf21089e8")
  throw Error("Accepted Gate A J01 successor changed.");
const manifest = JSON.parse(
  readFileSync(
    join(
      root,
      "prototypes/integrated-product-preview-v2/gate-b/source-manifest.json",
    ),
  ),
);
console.log(
  JSON.stringify(
    {
      preview: out,
      entry: "/prototypes/integrated-product-preview-v2/index.html",
      j01SHA256: hash,
      manifest,
    },
    null,
    2,
  ),
);
