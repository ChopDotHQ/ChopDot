#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const GITHUB_API_VERSION = "2022-11-28";
const PARITY_ORG = "paritytech";
const DOTLI_ORIGIN = "https://dotmetrics.dev-dot.li";
const DEVNET_DIRECTORY_GATEWAY =
  "https://devnet-ipfs.api.polkadotcommunity.foundation/ipfs";

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const directoryCid = arg("directory-cid");
const observedAt = arg("observed-at", new Date().toISOString());
const outputRoot = path.resolve(arg("output-root", "docs/research"));

if (!directoryCid || !/^bafy[a-z0-9]+$/.test(directoryCid)) {
  throw new Error(
    "--directory-cid is required and must be the CID shown by dotmetrics' live directory record",
  );
}

const dateSlug = observedAt.replaceAll(":", "-").replaceAll(".", "-");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function selectedHeaders(headers) {
  const names = [
    "content-type",
    "content-length",
    "etag",
    "last-modified",
    "x-github-api-version-selected",
    "x-github-request-id",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
    "x-ipfs-path",
    "x-ipfs-roots",
  ];
  return Object.fromEntries(
    names
      .map((name) => [name, headers.get(name)])
      .filter(([, value]) => value !== null),
  );
}

async function getJson(url, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json, application/json",
      "User-Agent": "ChopDot-research-catalog",
      ...extraHeaders,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return {
    url,
    text,
    value: JSON.parse(text),
    headers: selectedHeaders(response.headers),
    sha256: sha256(text),
  };
}

async function getText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "ChopDot-research-catalog" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return {
    url,
    text,
    headers: selectedHeaders(response.headers),
    sha256: sha256(text),
  };
}

const platformTerms = [
  "product-sdk",
  "polkadot-apps",
  "truapi",
  "triangle",
  "dotli",
  "polkadot-web",
  "polkadot-desktop",
  "polkadot-mobile",
  "polkadot-android",
  "polkadot-ios",
  "dotns",
  "playground",
  "bulletin",
  "statement-store",
  "individuality",
  "contract-dependency",
  "host-api",
  "polkadot-app-deploy",
  "cloud-storage",
  "attestation",
  "browse",
  "dot-cli",
];

const productTerms = [
  "payment",
  "pay-",
  "escrow",
  "market",
  "survey",
  "feedback",
  "credit",
  "expense",
  "receipt",
  "document",
  "storage",
  "drive",
  "chat",
  "mail",
  "identity",
  "personhood",
  "wallet",
  "fund",
  "community",
  "festival",
];

const coreTerms = [
  "polkadot-sdk",
  "substrate",
  "cumulus",
  "smoldot",
  "grandpa",
  "parachain",
  "bridge",
  "ink",
  "polkavm",
  "revive",
  "zombienet",
];

function includesAny(haystack, terms) {
  return terms.some((term) => haystack.includes(term));
}

function classifyRepository(repo) {
  const haystack = [
    repo.name,
    repo.description ?? "",
    ...(repo.topics ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (repo.archived) {
    return {
      primary: "archived",
      relevance: "review_if_historically_referenced",
      reason: "GitHub marks the repository archived",
      method: "official_metadata",
    };
  }
  if (
    repo.name.startsWith("e2e-") ||
    repo.name.includes("test-fixture") ||
    repo.name.includes("test_fixture") ||
    repo.name.includes("generated-fixture")
  ) {
    return {
      primary: "generated_or_test",
      relevance: "exclude_from_architecture_donor_review",
      reason: "repository name identifies an E2E/generated fixture",
      method: "deterministic_name_rule",
    };
  }
  if (includesAny(haystack, platformTerms)) {
    return {
      primary: "relevant_platform",
      relevance: "deep_review_candidate",
      reason: "name, description, or topics match the Products Devnet platform taxonomy",
      method: "deterministic_taxonomy_rule",
    };
  }
  if (includesAny(haystack, productTerms)) {
    return {
      primary: "relevant_product_or_reference",
      relevance: "donor_review_candidate",
      reason: "name, description, or topics match a ChopDot capability/donor taxonomy",
      method: "deterministic_taxonomy_rule",
    };
  }
  if (includesAny(haystack, coreTerms)) {
    return {
      primary: "core_or_infrastructure",
      relevance: "inspect_only_when_a_platform_dependency_requires_it",
      reason: "name, description, or topics match core protocol/infrastructure taxonomy",
      method: "deterministic_taxonomy_rule",
    };
  }
  return {
    primary: "adjacent_or_excluded",
    relevance: "not_selected_for_deep_review",
    reason: "no Products Devnet or ChopDot donor taxonomy match; record retained",
    method: "deterministic_taxonomy_rule",
  };
}

function normalizeRepository(repo) {
  return {
    id: `github:${repo.full_name}`,
    name: repo.name,
    full_name: repo.full_name,
    html_url: repo.html_url,
    description: repo.description,
    default_branch: repo.default_branch,
    immutable_revision: null,
    immutable_revision_status: "not_fetched_in_organization_census",
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
    archived: repo.archived,
    disabled: repo.disabled,
    fork: repo.fork,
    is_template: repo.is_template,
    language: repo.language,
    license_spdx: repo.license?.spdx_id ?? null,
    topics: [...(repo.topics ?? [])].sort(),
    visibility: repo.visibility,
    open_issues_count: repo.open_issues_count,
    forks_count: repo.forks_count,
    stargazers_count: repo.stargazers_count,
    size_kb: repo.size,
    classification: classifyRepository(repo),
    verification: {
      status: "verified_metadata",
      method: "official_github_organization_api",
      limitation:
        "Metadata classification is exhaustive; source-level claims require a separate commit-pinned deep review",
    },
  };
}

function tierStatus(record) {
  if (record.tier === 0) return "published";
  if (record.tier === 1) return "deployed";
  if (record.tier === 2) return "name_only";
  return "unknown";
}

function normalizeRegistryRecord(label, record) {
  return {
    id: `dotns:devnet:${label}`,
    label,
    domain: record.domain ?? `${label}.dot`,
    url: record.url ?? `https://${label}.dev-dot.li`,
    status: tierStatus(record),
    tier: record.tier,
    owner: record.owner ?? null,
    first_seen_block: record.firstSeenBlock ?? null,
    first_seen_at_unix: record.firstSeenAt ?? null,
    contenthash: record.contenthash ?? null,
    executable_contenthash: record.executableContenthash ?? null,
    has_executable: record.hasExecutable ?? false,
    alive: record.alive ?? null,
    last_seen_alive_at_unix: record.lastSeenAliveAt ?? null,
    liveness_checked_at_unix: record.livenessCheckedAt ?? null,
    update_count: record.updateCount ?? 0,
    manifest: record.manifest ?? null,
    declared_contract: record.contract ?? null,
    source_record: record,
    verification: {
      status: "verified_directory_record",
      method: "content_addressed_dotmetrics_directory",
      limitation:
        "A directory record proves what DotMetrics indexed, not that application source or runtime claims are correct",
    },
  };
}

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = selector(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function collectRepositories() {
  const org = await getJson(`https://api.github.com/orgs/${PARITY_ORG}`, {
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  });
  const pages = [];
  const rawRepositories = [];
  for (let page = 1; ; page += 1) {
    const response = await getJson(
      `https://api.github.com/orgs/${PARITY_ORG}/repos?type=public&sort=full_name&direction=asc&per_page=100&page=${page}`,
      { "X-GitHub-Api-Version": GITHUB_API_VERSION },
    );
    pages.push({
      page,
      count: response.value.length,
      url: response.url,
      response_sha256: response.sha256,
      headers: response.headers,
    });
    rawRepositories.push(...response.value);
    if (response.value.length < 100) break;
  }

  const repositories = rawRepositories
    .map(normalizeRepository)
    .sort((left, right) => left.full_name.localeCompare(right.full_name));
  const uniqueNames = new Set(repositories.map((repo) => repo.full_name));
  requireEqual(uniqueNames.size, repositories.length, "unique repository count");
  requireEqual(
    repositories.length,
    org.value.public_repos,
    "organization public repository reconciliation",
  );

  const payload = {
    schema_version: "1.0",
    kind: "parity_public_repository_census",
    observed_at: observedAt,
    source: {
      organization_url: org.url,
      organization_html_url: org.value.html_url,
      api_version: GITHUB_API_VERSION,
      organization_response_sha256: org.sha256,
      organization_headers: org.headers,
      pages,
    },
    reconciliation: {
      organization_public_repos: org.value.public_repos,
      fetched_records: repositories.length,
      unique_records: uniqueNames.size,
      page_record_sum: pages.reduce((sum, page) => sum + page.count, 0),
      exact_match: true,
    },
    classification_counts: countBy(
      repositories,
      (repo) => repo.classification.primary,
    ),
    records: repositories,
  };
  payload.snapshot_sha256 = sha256(canonicalJson(payload));
  return payload;
}

async function collectRegistry() {
  const sourceUrl = `${DEVNET_DIRECTORY_GATEWAY}/${directoryCid}`;
  const directory = await getJson(sourceUrl);
  const directoryEntries = Object.entries(directory.value);
  const appEntries = directoryEntries.filter(
    ([, record]) =>
      record &&
      typeof record === "object" &&
      !Array.isArray(record) &&
      Number.isInteger(record.tier),
  );
  const directoryMetadata = Object.fromEntries(
    directoryEntries.filter(([key]) => !appEntries.some(([label]) => label === key)),
  );
  const records = appEntries
    .map(([label, record]) => normalizeRegistryRecord(label, record))
    .sort((left, right) => left.label.localeCompare(right.label));
  const uniqueLabels = new Set(records.map((record) => record.label));
  requireEqual(uniqueLabels.size, records.length, "unique Devnet registry labels");

  const statusCounts = countBy(records, (record) => record.status);
  requireEqual(
    Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
    records.length,
    "registry tier reconciliation",
  );

  const hostHtml = await getText(`${DOTLI_ORIGIN}/?chainBackend=rpc-gateway`);
  const networkAssetPath = hostHtml.text.match(
    /href="(\/assets\/network-[^"]+\.js)"/,
  )?.[1];
  if (!networkAssetPath) {
    throw new Error("Could not locate the live dot.li network configuration asset");
  }
  const networkAsset = await getText(`${DOTLI_ORIGIN}${networkAssetPath}`);
  const expectedNetwork = {
    id: "devnet",
    label: "Polkadot Products Devnet",
    relay_genesis:
      "0x374057be67b355151f271ff70c3db98308c62c8adc48dc6724b6a009a1a014fd",
    asset_hub_genesis:
      "0xd6eec26135305a8ad257a20d003357284c8aa03d0bdb2b357ab0a22371e11ef2",
    bulletin_genesis:
      "0xe101f0fa4627d29a257645e02be86d80378fea1a2bf8fa6a918d150ebc760a59",
    people_genesis:
      "0xe6c30d6e148f250b887105237bcaa5cb9f16dd203bf7b5b9d4f1da7387cb86ec",
    dotns_registry: "0x527b08a640b527a3dae0C4BE04D7344E430B6E50",
    dotns_content_resolver: "0x326bdE29315199c814B1c58b431D84D16EA5cE41",
  };
  for (const value of Object.values(expectedNetwork).filter((value) =>
    String(value).startsWith("0x"),
  )) {
    if (!networkAsset.text.includes(value)) {
      throw new Error(`Live network asset no longer contains expected value ${value}`);
    }
  }

  const payload = {
    schema_version: "1.0",
    kind: "products_devnet_dotmetrics_directory_snapshot",
    observed_at: observedAt,
    network: expectedNetwork,
    source: {
      dotmetrics_url: `${DOTLI_ORIGIN}/?chainBackend=rpc-gateway`,
      directory_cid: directoryCid,
      directory_url: sourceUrl,
      directory_response_sha256: directory.sha256,
      directory_headers: directory.headers,
      dotli_host_html_sha256: hostHtml.sha256,
      dotli_host_headers: hostHtml.headers,
      network_asset_url: networkAsset.url,
      network_asset_sha256: networkAsset.sha256,
      network_asset_headers: networkAsset.headers,
      read_path: "rpc-gateway",
    },
    reconciliation: {
      directory_top_level_keys: directoryEntries.length,
      directory_metadata_keys: Object.keys(directoryMetadata).sort(),
      fetched_records: records.length,
      unique_records: uniqueLabels.size,
      status_counts: statusCounts,
      exact_match: uniqueLabels.size === records.length,
    },
    directory_metadata: directoryMetadata,
    records,
  };
  payload.snapshot_sha256 = sha256(canonicalJson(payload));
  return payload;
}

async function main() {
  const [repositories, registry] = await Promise.all([
    collectRepositories(),
    collectRegistry(),
  ]);
  const repoDir = path.join(outputRoot, "parity-repository-snapshots");
  const registryDir = path.join(outputRoot, "devnet-registry-snapshots");
  const evidenceDir = path.join(outputRoot, "evidence");
  await Promise.all([
    mkdir(repoDir, { recursive: true }),
    mkdir(registryDir, { recursive: true }),
    mkdir(evidenceDir, { recursive: true }),
  ]);

  const repoPath = path.join(repoDir, `${dateSlug}.json`);
  const registryPath = path.join(registryDir, `${dateSlug}.json`);
  const ledgerPath = path.join(evidenceDir, "primary-source-ledger.json");
  const ledger = {
    schema_version: "1.0",
    observed_at: observedAt,
    sources: [
      {
        id: "paritytech_github_org_api",
        authority: "source_owner_metadata",
        url: repositories.source.organization_url,
        digest: repositories.source.organization_response_sha256,
        record_count: repositories.reconciliation.fetched_records,
        verification_status: "verified",
      },
      {
        id: "dotmetrics_content_addressed_directory",
        authority: "application_owned_discovery_index",
        url: registry.source.directory_url,
        digest: registry.source.directory_response_sha256,
        cid: registry.source.directory_cid,
        record_count: registry.reconciliation.fetched_records,
        verification_status: "verified_discovery_only",
      },
      {
        id: "dotli_live_network_configuration",
        authority: "deployed_host_configuration",
        url: registry.source.network_asset_url,
        digest: registry.source.network_asset_sha256,
        record_count: 1,
        verification_status: "verified_as_deployed",
      },
    ],
    outputs: {
      repository_snapshot: path.relative(process.cwd(), repoPath),
      repository_snapshot_sha256: repositories.snapshot_sha256,
      registry_snapshot: path.relative(process.cwd(), registryPath),
      registry_snapshot_sha256: registry.snapshot_sha256,
    },
    limitations: [
      "GitHub metadata is exhaustive for the observed public organization universe but is not source-level verification.",
      "DotMetrics records are a content-addressed discovery index; app descriptions are not implementation proof.",
      "Default-branch commit pinning and source-level donor audits are recorded separately.",
    ],
  };

  await Promise.all([
    writeFile(repoPath, `${JSON.stringify(repositories, null, 2)}\n`),
    writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`),
    writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`),
  ]);

  console.log(
    JSON.stringify(
      {
        status: "ok",
        observed_at: observedAt,
        repositories: repositories.reconciliation,
        repository_classifications: repositories.classification_counts,
        registry: registry.reconciliation,
        network: registry.network,
        outputs: ledger.outputs,
      },
      null,
      2,
    ),
  );
}

await main();
