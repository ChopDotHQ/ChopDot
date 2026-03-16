import { spawn } from "node:child_process";
import { request } from "node:http";

const targetUrl = process.env.CYPRESS_BASE_URL || "http://127.0.0.1:4173";
const specArg = process.argv[2];

function waitForUrl(url, timeoutMs = 120_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const ping = () => {
      const req = request(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(ping, 1000);
      });
      req.end();
    };

    ping();
  });
}

const serverEnv = {
  ...process.env,
  VITE_DATA_SOURCE: "local",
  VITE_SUPABASE_STRICT: "false",
  VITE_AUTO_GUEST_AUTH: process.env.VITE_AUTO_GUEST_AUTH || "1",
  VITE_E2E_GUEST_USER_ID: process.env.VITE_E2E_GUEST_USER_ID || "owner",
  VITE_E2E_GUEST_USER_NAME: process.env.VITE_E2E_GUEST_USER_NAME || "You",
  VITE_ENABLE_PVM_CLOSEOUT: process.env.VITE_ENABLE_PVM_CLOSEOUT || "1",
  VITE_SIMULATE_PVM_CLOSEOUT: process.env.VITE_SIMULATE_PVM_CLOSEOUT || "1",
  VITE_SIMULATE_CHAIN: process.env.VITE_SIMULATE_CHAIN || "1",
};

const server = spawn("npm", ["run", "e2e:server"], {
  cwd: process.cwd(),
  env: serverEnv,
  stdio: "inherit",
  shell: false,
});

const shutdown = () => {
  if (!server.killed) {
    server.kill("SIGTERM");
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);

try {
  await waitForUrl(targetUrl);
  const cypressArgs = ["cypress", "run", "--headless", "--browser", "electron"];
  if (specArg) {
    cypressArgs.push("--spec", specArg);
  }

  await new Promise((resolve, reject) => {
    const cypress = spawn("npx", cypressArgs, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CYPRESS_baseUrl: targetUrl,
      },
      stdio: "inherit",
      shell: false,
    });
    cypress.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`Cypress exited with code ${code}`));
    });
    cypress.on("error", reject);
  });
} finally {
  shutdown();
}
