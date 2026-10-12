import { serve } from "./test-server.mjs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
const host = await serve(process.env.PREVIEW_ROOT);
const evidence = resolve(process.env.EVIDENCE_DIR || "gate-b-evidence/gate-a");
mkdirSync(evidence, { recursive: true });
const results = [];
try {
  for (const file of [
    "browser-qa.mjs",
    "exact-money-browser-qa.mjs",
    "money-boundary-browser-qa.mjs",
  ]) {
    const script = new URL(`../${file}`, import.meta.url).pathname;
    let output = "";
    const args = [
      "--import",
      new URL("./browser-launch.mjs", import.meta.url).pathname,
      script,
    ];
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, {
        env: {
          ...process.env,
          PREVIEW_V2_BASE_URL:
            host.base + "/prototypes/integrated-product-preview-v2/index.html",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.on("data", (b) => (output += b));
      child.stderr.on("data", (b) => (output += b));
      child.on("error", reject);
      child.on("exit", resolve);
    });
    writeFileSync(resolve(evidence, `${file}.log`), output);
    results.push({ file, command: [process.execPath, ...args], exitCode });
    console.log(file, exitCode);
    if (exitCode) console.log(output.slice(-4000));
  }
} finally {
  writeFileSync(
    resolve(evidence, "results.json"),
    JSON.stringify(results, null, 2),
  );
  await host.close();
}
if (results.some((r) => r.exitCode !== 0)) process.exitCode = 1;
