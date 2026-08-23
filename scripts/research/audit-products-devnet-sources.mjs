#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const observedAt = arg("observed-at", new Date().toISOString());
const outputPath = path.resolve(
  arg("output", "docs/research/evidence/source-deep-audit.json"),
);

const candidates = [
  ["product-sdk", "current_product_sdk_family"],
  ["polkadot-apps", "successor_sdk_and_examples"],
  ["triangle-js-sdks", "predecessor_sdk_family"],
  ["host-api-test-sdk", "host_simulation_boundary"],
  ["host-rust-core", "truapi_host_protocol"],
  ["dotli-community", "web_host_and_dot_resolution"],
  ["polkadot-desktop-community", "desktop_host"],
  ["polkadot-ios-community", "ios_host"],
  ["polkadot-android-community", "android_host"],
  ["dotns", "name_contracts_and_records"],
  ["dotns-sdk", "name_sdk"],
  ["polkadot-bulletin-chain", "durable_content_storage"],
  ["statement-store-tools", "statement_store_operations"],
  ["polkadot-sdk", "statement_store_protocol_source"],
  ["contract-dependency-manager", "contract_build_and_deploy"],
  ["attestation-protocol", "attestation_semantics"],
  ["browse", "application_discovery"],
  ["playground-cli", "current_deploy_cli"],
  ["polkadot-app-deploy", "deployment_library"],
  ["decentralize", "bulletin_dot_deployment"],
  ["playground-app-community", "registry_and_reference_host_app"],
  ["playground-app-template", "minimum_product_template"],
  ["create-polkadot-dapp", "scaffolding"],
  ["individuality-community", "identity_and_personhood_runtime"],
  ["identity-backend-community", "identity_bff_pattern"],
  ["simple-survey", "content_plus_index_contract_donor"],
  ["feedback-board", "shared_board_donor"],
  ["festival", "host_signing_and_contract_donor"],
  ["localdot-community", "market_and_negotiation_donor"],
  ["mercado-community", "escrow_dispute_donor"],
  ["polkadot-pay-server-community", "payment_server_boundary"],
  ["web3-storage", "storage_predecessor"],
  ["device-uniqueness-backend-community", "device_identity_donor"],
  ["dotlake-community", "data_index_donor"],
  ["firefly-community", "application_donor"],
  ["vocabulario-community", "application_donor"],
];

const evidencePathRules = [
  /(^|\/)README(?:\.[^/]+)?$/i,
  /(^|\/)(LICENSE|COPYING|NOTICE|SECURITY)(?:\.[^/]+)?$/i,
  /(^|\/)package\.json$/i,
  /(^|\/)Cargo\.toml$/i,
  /(^|\/)(pnpm-workspace|polkadot-api)\.ya?ml$/i,
  /(statement|bulletin|storage|checkpoint|recover|signer|account|allowance|host|dotns|resolver|publisher|contract|identity|payment|escrow)/i,
];

const excerptTerms = [
  "statement",
  "bulletin",
  "storage",
  "checkpoint",
  "recover",
  "signer",
  "product account",
  "allowance",
  "host",
  "dotns",
  "resolver",
  "publisher",
  "contract",
  "identity",
  "postgres",
  "payment",
  "escrow",
  "license",
  "security",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function excerpt(content) {
  const lines = content.split(/\r?\n/);
  const selected = [];
  for (let index = 0; index < lines.length; index += 1) {
    const lower = lines[index].toLowerCase();
    if (excerptTerms.some((term) => lower.includes(term))) {
      selected.push({ line: index + 1, text: lines[index].slice(0, 500) });
    }
    if (selected.length >= 24) break;
  }
  return selected;
}

function rankPath(filePath) {
  let rank = 0;
  if (/^README/i.test(filePath)) rank += 100;
  if (/^(LICENSE|COPYING|SECURITY|NOTICE)/i.test(filePath)) rank += 95;
  if (/^package\.json$|^Cargo\.toml$/i.test(filePath)) rank += 90;
  if (/docs?\//i.test(filePath)) rank += 25;
  for (const term of excerptTerms) {
    if (filePath.toLowerCase().includes(term.replace(" ", "-"))) rank += 8;
  }
  rank -= filePath.split("/").length;
  return rank;
}

function selectPaths(paths) {
  const matches = paths
    .filter((filePath) => evidencePathRules.some((rule) => rule.test(filePath)))
    .sort((left, right) => rankPath(right) - rankPath(left) || left.localeCompare(right));
  const roots = matches.filter((filePath) => !filePath.includes("/")).slice(0, 12);
  const nested = matches.filter((filePath) => filePath.includes("/")).slice(0, 28);
  return [...new Set([...roots, ...nested])].slice(0, 40);
}

async function git(args, cwd, maxBuffer = 20 * 1024 * 1024) {
  const result = await exec("git", args, { cwd, maxBuffer });
  return result.stdout.trim();
}

async function auditOne([name, purpose], tempRoot) {
  const clonePath = path.join(tempRoot, name);
  const repositoryUrl = `https://github.com/paritytech/${name}.git`;
  try {
    await git(
      ["clone", "--depth", "1", "--filter=blob:none", "--no-checkout", repositoryUrl, clonePath],
      tempRoot,
      40 * 1024 * 1024,
    );
    let commit;
    try {
      commit = await git(["rev-parse", "HEAD"], clonePath);
    } catch (error) {
      const remoteHeads = await git(["ls-remote", "--heads", "origin"], clonePath);
      if (!remoteHeads) {
        return {
          id: `github:paritytech/${name}`,
          name,
          purpose,
          repository_url: repositoryUrl.replace(/\.git$/, ""),
          branch: null,
          commit: null,
          tree_path_count: 0,
          selected_path_count: 0,
          files: [],
          verification_status: "verified_empty_repository",
          limitations: ["The official repository has no branch or commit to inspect."],
        };
      }
      throw error;
    }
    const branch = (await git(["branch", "--show-current"], clonePath)) || "detached";
    const tree = await git(["ls-tree", "-r", "--name-only", "HEAD"], clonePath, 80 * 1024 * 1024);
    const paths = tree.split("\n").filter(Boolean);
    const selectedPaths = selectPaths(paths);
    const files = [];
    for (const filePath of selectedPaths) {
      try {
        const content = await git(["show", `HEAD:${filePath}`], clonePath, 8 * 1024 * 1024);
        if (Buffer.byteLength(content) > 2_000_000) continue;
        files.push({
          path: filePath,
          raw_url: `https://raw.githubusercontent.com/paritytech/${name}/${commit}/${filePath}`,
          sha256: sha256(content),
          byte_length: Buffer.byteLength(content),
          excerpts: excerpt(content),
        });
      } catch (error) {
        files.push({
          path: filePath,
          verification_status: "unreadable",
          error: error.message.slice(0, 300),
        });
      }
    }
    return {
      id: `github:paritytech/${name}`,
      name,
      purpose,
      repository_url: repositoryUrl.replace(/\.git$/, ""),
      branch,
      commit,
      tree_path_count: paths.length,
      selected_path_count: selectedPaths.length,
      files,
      verification_status: "commit_pinned_source_inspected",
      limitations: [
        "Selected source paths were inspected by deterministic relevance rules; this is not a full security audit.",
        "Excerpts are discovery evidence and must be interpreted with their commit-pinned source file.",
      ],
    };
  } catch (error) {
    return {
      id: `github:paritytech/${name}`,
      name,
      purpose,
      repository_url: repositoryUrl.replace(/\.git$/, ""),
      verification_status: "blocked",
      error: error.message.slice(0, 1000),
    };
  }
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "chopdot-devnet-audit-"));
try {
  const records = await mapPool(candidates, 4, (candidate) =>
    auditOne(candidate, tempRoot),
  );
  const payload = {
    schema_version: "1.0",
    kind: "products_devnet_commit_pinned_source_deep_audit",
    observed_at: observedAt,
    selection_method:
      "Manual relevance adjudication over the exhaustive Parity organization census; includes platform dependencies, ChopDot donor apps, and previously omitted current candidates.",
    candidate_count: candidates.length,
    verified_count: records.filter((record) =>
      ["commit_pinned_source_inspected", "verified_empty_repository"].includes(
        record.verification_status,
      ),
    ).length,
    blocked_count: records.filter((record) => record.verification_status === "blocked")
      .length,
    records,
  };
  payload.snapshot_sha256 = sha256(JSON.stringify(payload));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        status: payload.blocked_count === 0 ? "ok" : "partial",
        output: outputPath,
        candidate_count: payload.candidate_count,
        verified_count: payload.verified_count,
        blocked_count: payload.blocked_count,
        snapshot_sha256: payload.snapshot_sha256,
        blocked: records
          .filter((record) => record.verification_status === "blocked")
          .map((record) => ({ name: record.name, error: record.error })),
      },
      null,
      2,
    ),
  );
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
