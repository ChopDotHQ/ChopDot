#!/usr/bin/env python3
"""Ingest and recall bounded release evidence for the exact launch worktree."""

from __future__ import annotations

import json
import os
import hashlib
import subprocess
import sys
import tempfile
from collections.abc import Mapping
from datetime import datetime, timezone
from pathlib import Path


WORKTREE = Path("/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch").resolve()
DEFAULT_AUTOBOTS_SOURCE = Path("/Users/devinsonpena/Documents/AutoBots")
AUTOBOTS_COMMIT = "15577d8e15ec98e14dc7f20ce1525ceb68d8ed75"
NODE_BIN = Path("/opt/homebrew/bin/node").resolve()
KG_PYTHON = Path("/Users/devinsonpena/Documents/AutoBots/proofmap/.venv/bin/python")
AUTOBOTS_TOOL_HASHES = {
    "agentops/runners/kg_preflight.py": "cda747f0737c372a8121715cff8fb36539b8e411ca9f75cc8aa95e3abf0627ba",
    "agentops/runners/repo_graph_v1.py": "015648c5acd7c6ac210b8b64a9b8ce8711ce9b0dc1ec083aa89663d42edf1275",
}


def resolve_autobots_source(
    environment: Mapping[str, str] = os.environ,
) -> Path:
    configured = environment.get("CHOPDOT_KGV2_AUTOBOTS_SOURCE")
    return Path(configured or DEFAULT_AUTOBOTS_SOURCE).expanduser().resolve()


AUTOBOTS_SOURCE = resolve_autobots_source()
REPO_ID = "chopdot-v1-launch"
DEFAULT_ARTIFACT_ROOT = WORKTREE / "artifacts" / "agentops"
LOCAL_EVIDENCE_ROOT = WORKTREE / "output" / "agent-runs"
PROOF_PATH = WORKTREE / "docs/release/2026-08-24-recovery-head-index-live-proof.md"
CONTEXT_PATH = WORKTREE / "product/context-authority.json"
LIVE_FINDING_PATH = WORKTREE / "docs/release/2026-08-24-live-first-use-findings.md"
RELEASE_STATE_PATH = WORKTREE / "docs/release/current-release-state.json"
GATE9_EVIDENCE_PATH = (
    WORKTREE / "docs/release/2026-08-27-p034-legacy-assessment-quarantine.md"
)
GATE9_PLAN_PATH = (
    WORKTREE
    / "docs/superpowers/plans/2026-08-27-gate9-legacy-assessment-quarantine.md"
)
GATE9_SOURCE_PATHS = [
    WORKTREE / "src/core/legacyMoneyMigration.ts",
    WORKTREE / "src/core/authority/browserAuthority.ts",
    WORKTREE / "src/state/AppStateContext.tsx",
]
GATE9_TEST_PATHS = [
    WORKTREE / "tests/candidate-batch3-money-migration.test.ts",
    WORKTREE / "tests/candidate-batch3-legacy-assessment-indexeddb.spec.ts",
    WORKTREE / "tests/named-mode-multi-account-production-entrypoint.spec.ts",
]
GATE9_PATHS_BY_ROLE = {
    "source": GATE9_SOURCE_PATHS,
    "test": GATE9_TEST_PATHS,
    "evidence": [GATE9_EVIDENCE_PATH],
    "plan": [GATE9_PLAN_PATH],
}
GATE9_PATHS = [
    path for paths in GATE9_PATHS_BY_ROLE.values() for path in paths
]

MANIFEST = {
    "schema_version": "1.0",
    "repo_id": REPO_ID,
    "root": str(WORKTREE),
    "privacy": "private_local",
    "languages": ["javascript", "typescript", "solidity"],
    "paths": {
        "include": [
            "PRODUCT_TRUTH.md",
            "README.md",
            "AGENTS.md",
            "PROJECT_DIRECTIVES.md",
            "package.json",
            "package-lock.json",
            ".knowns/tasks",
            "product/**",
            "docs/CHOPDOT_OPERATING_LOOPS.md",
            "docs/CHOPDOT_LOOP_RUNNER.md",
            ".github/CODEOWNERS",
            ".github/workflows/agent-governance.yml",
            "governance/agent-system/**",
            "docs/adr/**",
            "docs/wiki/**",
            "docs/release/**",
            "docs/release/2026-08-27-p034-legacy-assessment-quarantine.md",
            "docs/superpowers/plans/2026-08-27-chopdot-full-product-public-testnet-execution.md",
            "docs/superpowers/plans/2026-08-27-gate9-legacy-assessment-quarantine.md",
            "docs/superpowers/plans/2026-08-24-context-authority-and-live-first-use-repair.md",
            "docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.md",
            "docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.json",
            "deployment/README.md",
            "deployment/recovery-head-index/**",
            "contracts/recovery-head-index/**",
            "scripts/lib/recovery-head-verification.mjs",
            "scripts/agent-governance/**",
            "scripts/agent-system/**",
            "scripts/research/agentops-release-kgv2.py",
            "scripts/prepare-dot-host-release.mjs",
            "scripts/recovery-head-deployment.mjs",
            "scripts/release-evidence.test.mjs",
            "scripts/verify-dot-host.mjs",
            "src/main.tsx",
            "src/core/legacyMoneyMigration.ts",
            "src/core/authority/browserAuthority.ts",
            "src/state/AppStateContext.tsx",
            "src/recovery/**",
            "tests/candidate-batch3-money-migration.test.ts",
            "tests/candidate-batch3-legacy-assessment-indexeddb.spec.ts",
            "tests/named-mode-multi-account-production-entrypoint.spec.ts",
        ],
        "source": [
            "src/**",
            "scripts/**",
            "contracts/**",
            "src/core/legacyMoneyMigration.ts",
            "src/core/authority/browserAuthority.ts",
            "src/state/AppStateContext.tsx",
        ],
        "tests": [
            "**/*.test.*",
            "**/*.spec.*",
            "contracts/**/test/**",
            "tests/candidate-batch3-money-migration.test.ts",
            "tests/candidate-batch3-legacy-assessment-indexeddb.spec.ts",
            "tests/named-mode-multi-account-production-entrypoint.spec.ts",
        ],
        "specs": [
            "docs/superpowers/plans/**",
            "docs/superpowers/plans/2026-08-27-gate9-legacy-assessment-quarantine.md",
        ],
        "decisions": ["PRODUCT_TRUTH.md", "product/**", "docs/adr/**", "docs/release/**"],
        "tasks": ["product/cards.md", "product/roadmap.md", ".knowns/tasks", "docs/superpowers/plans/**"],
        "evidence": [
            "docs/release/**",
            "docs/release/2026-08-27-p034-legacy-assessment-quarantine.md",
            "deployment/recovery-head-index/**",
        ],
        "generated": ["contracts/recovery-head-index/artifacts/**"],
        "exclude": [
            "**/.local-private/**",
            "**/node_modules/**",
            "**/.venv*/**",
            "**/vendor/**",
            "**/dist/**",
            "**/build/**",
            "**/coverage/**",
            "**/cache/**",
        ],
    },
    "critical_paths": [
        "PRODUCT_TRUTH.md",
        "product/context-authority.json",
        "product/cards.md",
        "product/decisions.md",
        "docs/adr/0004-context-authority-and-cited-recall.md",
        "docs/adr/0005-portable-agent-outcome-system.md",
        "docs/superpowers/plans/2026-08-27-chopdot-full-product-public-testnet-execution.md",
        ".github/workflows/agent-governance.yml",
        "scripts/research/agentops-release-kgv2.py",
        "docs/release/current-release-state.json",
        "docs/release/2026-08-24-live-first-use-findings.md",
        "docs/release/2026-08-24-local-release-assurance.md",
        "docs/release/2026-08-24-recovery-head-index-live-proof.md",
        "docs/release/2026-08-27-p034-legacy-assessment-quarantine.md",
        "docs/superpowers/plans/2026-08-27-gate9-legacy-assessment-quarantine.md",
        "src/core/legacyMoneyMigration.ts",
        "src/core/authority/browserAuthority.ts",
        "src/state/AppStateContext.tsx",
        "tests/candidate-batch3-money-migration.test.ts",
        "tests/candidate-batch3-legacy-assessment-indexeddb.spec.ts",
        "tests/named-mode-multi-account-production-entrypoint.spec.ts",
        "deployment/recovery-head-index/devnet.json",
        "deployment/recovery-head-index/devnet.behavior.json",
        "deployment/recovery-head-index/paseo-next-v2.json",
        "deployment/recovery-head-index/paseo-next-v2.behavior.json",
        "contracts/recovery-head-index/src/RecoveryHeadIndex.sol",
        "contracts/recovery-head-index/artifacts/RecoveryHeadIndex.polkavm",
    ],
}

QUERIES = {
    "devnet": (
        "Products Devnet RecoveryHeadIndex deployed behavior-proven "
        "0x391DBCF8267f6AeCd4BE5DD84039dF588EC337EC"
    ),
    "paseo": (
        "Paseo Next v2 RecoveryHeadIndex deployed behavior-proven "
        "0xaD2DaC1E4d41260677e565Fb8Eb1810e13ca5c69"
    ),
    "identical_code": (
        "both public-testnet deployments identical reviewed source ABI PVM bytecode"
    ),
    "authority_boundary": (
        "recovery contract bounded non-authority index no admin upgrade membership money custody"
    ),
    "context_authority": (
        "product/context-authority.json chopdot.context-authority.v1 exact_root "
        "authority_order default_read_order conditional_routes"
    ),
    "gate9_legacy_assessment": (
        "P-034 Gate 9 legacy assessment quarantine re-digested 10-to-20 CHF "
        "semantic forgery encrypted IndexedDB zero authority creation"
    ),
    "live_first_use": (
        "ChopDot live first use guest group creation blocker overloaded Home candidate ineligible promotion"
    ),
    "full_release_route": (
        "docs/superpowers/plans/2026-08-27-chopdot-full-product-public-testnet-execution.md deployment portable"
    ),
    "governed_ci": (
        ".github/workflows/agent-governance.yml OutcomePacket exact-head"
    ),
}

REQUIRED_QUERY_SOURCE = {
    "devnet": PROOF_PATH,
    "paseo": PROOF_PATH,
    "identical_code": PROOF_PATH,
    "authority_boundary": PROOF_PATH,
    "context_authority": CONTEXT_PATH,
    "gate9_legacy_assessment": GATE9_EVIDENCE_PATH,
    "live_first_use": LIVE_FINDING_PATH,
    "full_release_route": WORKTREE
    / "docs/superpowers/plans/2026-08-27-chopdot-full-product-public-testnet-execution.md",
    "governed_ci": WORKTREE / ".github/workflows/agent-governance.yml",
}


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, default=str) + "\n",
        encoding="utf-8",
    )


def resolve_artifact_root() -> Path:
    configured = os.environ.get("CHOPDOT_AGENTOPS_ARTIFACT_ROOT")
    if not configured:
        return DEFAULT_ARTIFACT_ROOT
    resolved = Path(configured).resolve()
    if resolved != LOCAL_EVIDENCE_ROOT and LOCAL_EVIDENCE_ROOT not in resolved.parents:
        raise RuntimeError(
            "CHOPDOT_AGENTOPS_ARTIFACT_ROOT must stay under the exact worktree's "
            f"ignored evidence root: {LOCAL_EVIDENCE_ROOT}"
        )
    return resolved


def git(*args: str) -> str:
    return subprocess.check_output(
        ["/usr/bin/git", "-C", str(WORKTREE), *args], text=True
    ).strip()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def gate9_source_bindings() -> list[dict[str, str]]:
    bindings = []
    for role, paths in GATE9_PATHS_BY_ROLE.items():
        for source_path in paths:
            resolved = source_path.resolve()
            if resolved == WORKTREE or WORKTREE not in resolved.parents:
                raise RuntimeError(
                    f"Gate 9 {role} source escapes the exact worktree: {resolved}"
                )
            if not resolved.is_file():
                raise RuntimeError(f"Gate 9 {role} source is missing: {resolved}")
            bindings.append(
                {
                    "role": role,
                    "path": str(resolved.relative_to(WORKTREE)),
                    "source_ref": str(resolved),
                    "sha256": sha256_bytes(resolved.read_bytes()),
                }
            )
    return bindings


def query_passed(query_checks: dict[str, dict[str, bool]], name: str) -> bool:
    checks = query_checks.get(name, {})
    return bool(checks) and all(value is True for value in checks.values())


def build_knowledge_status(
    query_checks: dict[str, dict[str, bool]],
) -> dict[str, object]:
    legacy_queries_pass = bool(query_checks) and all(
        query_passed(query_checks, name) for name in QUERIES
    )
    context_authority_pass = query_passed(query_checks, "context_authority")
    gate9_source_pass = query_passed(query_checks, "gate9_legacy_assessment")
    gate9_read_gate_pass = context_authority_pass and gate9_source_pass
    gate9_reasons = [
        "portable_record_outcome_not_executed",
        "portable_verify_recall_not_executed",
        "legacy_context_graph_v2_does_not_expose_exact_outcome_commit_lineage",
    ]
    if not context_authority_pass:
        gate9_reasons.insert(0, "context_authority_required_source_not_recalled")
    if not gate9_source_pass:
        gate9_reasons.insert(0, "gate9_required_source_not_recalled")
    return {
        "legacy_context_graph_v2_read": {
            "scope": "global_release_read_queries",
            "status": "passed" if legacy_queries_pass else "failed",
            "all_queries_pass": legacy_queries_pass,
            "does_not_prove_portable_kg_known": True,
        },
        "portable_knowledge": {
            "global_release": {
                "kg_known": False,
                "status": "not_proven",
                "reasons": [
                    "portable_record_outcome_not_executed",
                    "portable_verify_recall_not_executed",
                    "legacy_context_graph_v2_does_not_expose_exact_outcome_commit_lineage",
                ],
            },
            "gate9_legacy_assessment": {
                "kg_known": False,
                "status": (
                    "read_gate_passed_record_and_recall_required"
                    if gate9_read_gate_pass
                    else "required_source_recall_failed"
                ),
                "legacy_v2_read_gate_pass": gate9_read_gate_pass,
                "required_queries": [
                    "context_authority",
                    "gate9_legacy_assessment",
                ],
                "reasons": gate9_reasons,
            },
        },
    }


def build_port_facts(
    source_bindings: list[dict[str, str]],
) -> list[dict[str, object]]:
    evidence_ref = str(GATE9_EVIDENCE_PATH)
    implementation_refs = [
        item["source_ref"]
        for item in source_bindings
        if item["role"] in {"source", "test"}
    ]
    gate9_refs = [item["source_ref"] for item in source_bindings]
    return [
        {
            "statement": "The Repo Graph packet describes the exact clean ChopDot launch worktree, branch, commit, and tree.",
            "confidence": 1,
            "source_refs": gate9_refs,
        },
        {
            "statement": "The active release route contains 21 separately evidenced gates through identical public-testnet promotion, ownership, real-user proof, rollback, and portable cited recall.",
            "confidence": 1,
            "source_refs": [
                str(
                    WORKTREE
                    / "docs/superpowers/plans/2026-08-27-chopdot-full-product-public-testnet-execution.md"
                )
            ],
        },
        {
            "statement": "Knowledge recall is an operational evidence layer and does not create product, participant, membership, money, recovery, or release authority.",
            "confidence": 1,
            "source_refs": [str(CONTEXT_PATH)],
        },
        {
            "statement": "The accepted Gate 9 legacy-assessment slice deterministically quarantines ambiguous pre-authority projections and creates no shared authority.",
            "confidence": 1,
            "source_refs": [evidence_ref, *implementation_refs],
        },
        {
            "statement": "Gate 9 legacy-assessment evidence reports 21 focused Node tests, 2 real IndexedDB browser tests, 5 named-mode production-entrypoint tests, and a final independent verdict of zero P0 and zero P1 findings.",
            "confidence": 1,
            "source_refs": [evidence_ref],
        },
        {
            "statement": "The Gate 9 legacy-assessment slice is accepted, while P-034 remains building and the whole release is not thereby complete or portable-knowledge-known.",
            "confidence": 1,
            "source_refs": [evidence_ref, str(GATE9_PLAN_PATH)],
        },
    ]


def require_clean_exact_worktree() -> dict[str, object]:
    if Path.cwd().resolve() != WORKTREE:
        raise RuntimeError(f"Run from exact worktree: {WORKTREE}")
    root = Path(git("rev-parse", "--show-toplevel")).resolve()
    branch = git("branch", "--show-current")
    head = git("rev-parse", "HEAD")
    tree = git("rev-parse", "HEAD^{tree}")
    status = git("status", "--porcelain=v1", "--untracked-files=all")
    if root != WORKTREE:
        raise RuntimeError(f"Git root differs from exact worktree: {root}")
    if branch != "codex/chopdot-v1-launch":
        raise RuntimeError(f"Branch differs from release branch: {branch}")
    if status:
        raise RuntimeError(
            "AgentOps refresh refuses staged, modified, or untracked paths before any import or durable write:\n"
            + status
        )
    for required in [
        PROOF_PATH,
        CONTEXT_PATH,
        LIVE_FINDING_PATH,
        RELEASE_STATE_PATH,
        *GATE9_PATHS,
    ]:
        if not required.exists():
            raise RuntimeError(f"Required release/context evidence is missing: {required}")
    return {"root": str(root), "branch": branch, "head": head, "tree": tree, "status": []}


def attest_autobots_source(source: Path = AUTOBOTS_SOURCE) -> None:
    if not source.is_dir():
        raise RuntimeError(f"Pinned AgentOps source checkout is missing: {source}")
    commit_check = subprocess.run(
        ["/usr/bin/git", "-C", str(source), "cat-file", "-e", f"{AUTOBOTS_COMMIT}^{{commit}}"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )
    if commit_check.returncode != 0:
        raise RuntimeError(
            f"Pinned AgentOps commit is unavailable from {source}: {AUTOBOTS_COMMIT}"
        )
    for relative, expected in AUTOBOTS_TOOL_HASHES.items():
        committed = subprocess.run(
            ["/usr/bin/git", "-C", str(source), "show", f"{AUTOBOTS_COMMIT}:{relative}"],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if committed.returncode != 0:
            raise RuntimeError(
                f"Pinned AgentOps tool is unavailable at {AUTOBOTS_COMMIT}: {relative}"
            )
        if sha256_bytes(committed.stdout) != expected:
            raise RuntimeError(f"Pinned AgentOps tool hash differs for {relative}")


def attest_snapshot_tree(target: Path, label: str) -> None:
    head = subprocess.check_output(
        ["/usr/bin/git", "-C", str(target), "rev-parse", "HEAD"], text=True
    ).strip()
    if head != AUTOBOTS_COMMIT:
        raise RuntimeError(f"{label} commit differs from the pin")
    status = subprocess.check_output(
        ["/usr/bin/git", "-C", str(target), "status", "--porcelain=v1", "--untracked-files=all"],
        text=True,
    ).strip()
    if status:
        raise RuntimeError(f"{label} is dirty")
    flags = subprocess.check_output(
        ["/usr/bin/git", "-C", str(target), "ls-files", "-v"], text=True
    ).splitlines()
    if any(line and (line[0].islower() or line.startswith("S ")) for line in flags):
        raise RuntimeError(f"{label} contains assume-unchanged or skip-worktree index flags")
    tree = subprocess.check_output(
        ["/usr/bin/git", "-C", str(target), "ls-tree", "-r", "-z", "--full-tree", "HEAD"]
    )
    for record in tree.split(b"\0"):
        if not record:
            continue
        metadata, encoded_path = record.split(b"\t", 1)
        mode, object_type, expected_oid = metadata.decode("ascii").split(" ")
        if object_type != "blob":
            raise RuntimeError(f"{label} contains unsupported tracked object type {object_type}")
        relative = encoded_path.decode("utf-8", errors="surrogateescape")
        target_path = target / relative
        info = target_path.lstat()
        if mode == "120000":
            if not target_path.is_symlink():
                raise RuntimeError(f"{label} tracked mode differs from HEAD for {relative}")
            contents = os.readlink(os.fsencode(target_path))
        else:
            if not target_path.is_file() or target_path.is_symlink():
                raise RuntimeError(f"{label} tracked mode differs from HEAD for {relative}")
            expected_executable = mode == "100755"
            if bool(info.st_mode & 0o111) != expected_executable:
                raise RuntimeError(f"{label} executable mode differs from HEAD for {relative}")
            contents = target_path.read_bytes()
        header = f"blob {len(contents)}\0".encode("ascii")
        actual_oid = hashlib.sha1(header + contents).hexdigest()
        if actual_oid != expected_oid:
            raise RuntimeError(f"{label} tracked bytes differ from HEAD for {relative}")
    for relative, expected in AUTOBOTS_TOOL_HASHES.items():
        if sha256_bytes((target / relative).read_bytes()) != expected:
            raise RuntimeError(f"{label} tool hash differs for {relative}")


def materialize_autobots_snapshot(target: Path) -> None:
    subprocess.run(
        [
            "/usr/bin/git",
            "-c",
            "core.hooksPath=/dev/null",
            "clone",
            "--no-hardlinks",
            "--no-checkout",
            str(AUTOBOTS_SOURCE),
            str(target),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )
    subprocess.run(
        [
            "/usr/bin/git",
            "-C",
            str(target),
            "-c",
            "core.hooksPath=/dev/null",
            "checkout",
            "--detach",
            AUTOBOTS_COMMIT,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )
    attest_snapshot_tree(target, "Isolated AgentOps snapshot")


def isolated_main(autobots: Path, source_identity: dict[str, object]) -> int:
    attest_snapshot_tree(autobots, "Isolated AgentOps child runtime")
    sys.path.insert(0, str(autobots))
    from agentops.runners.kg_preflight import build_kg_preflight
    from agentops.runners import repo_graph_v1 as repo_graph_runner

    os.environ["AGENTOPS_CONTEXT_GRAPH_MODE"] = "v2"
    os.environ["AGENTOPS_CG2_REPO_ROOT_CHOPDOT_V1_LAUNCH"] = str(WORKTREE)

    artifact_root = resolve_artifact_root()
    repo_graph_runtime_root = artifact_root / "repo-graph-runtime"
    repo_graph_runner.REPORT_ROOT = repo_graph_runtime_root / "reports"
    repo_graph_runner.STATE_ROOT = repo_graph_runtime_root / "state"
    ingest_mode = os.environ.get("CHOPDOT_AGENTOPS_INGEST_MODE", "scan")
    if ingest_mode not in {"scan", "full"}:
        raise RuntimeError(
            "CHOPDOT_AGENTOPS_INGEST_MODE must be either scan or full"
        )
    deployment = repo_graph_runner.deploy_repo(
        MANIFEST, apply=ingest_mode == "full", portfolio_tier="product"
    )
    deployment["execution_mode"] = ingest_mode
    deployment["projection_scope"] = (
        "external_projectors" if ingest_mode == "full" else "not_run_bounded_scan"
    )
    report_root = repo_graph_runner.REPORT_ROOT / "repos" / REPO_ID
    graph = json.loads((report_root / "graph.json").read_text(encoding="utf-8"))
    packet = json.loads(
        (report_root / "context_packet.json").read_text(encoding="utf-8")
    )
    gate9_bindings = gate9_source_bindings()

    preflights = {}
    query_summaries = {}
    all_citations = []
    all_facts = []
    for name, intent in QUERIES.items():
        preflight = build_kg_preflight(
            intent=intent,
            task_family="release_assurance",
            repo_target=REPO_ID,
            max_lessons=8,
            max_capabilities=8,
            mode_override="v2",
        )
        preflights[name] = preflight
        v2 = preflight.get("context_graph_v2", {})
        recalled = v2.get("packet", {})
        facts = recalled.get("facts", [])
        citations = recalled.get("citations", [])
        citation_bindings = []
        for citation in citations:
            source_ref = citation.get("source_ref")
            source_path = Path(source_ref).resolve() if source_ref else None
            verification = citation.get("verification", {})
            verification_checks = verification.get("checks", {})
            inside_exact_root = bool(
                source_path
                and source_path != WORKTREE
                and str(source_path).startswith(str(WORKTREE) + os.sep)
            )
            actual_hash = (
                sha256_bytes(source_path.read_bytes())
                if inside_exact_root and source_path.is_file()
                else None
            )
            citation_bindings.append(
                {
                    "source_ref": source_ref,
                    "inside_exact_root": inside_exact_root,
                    "verification_checks": verification_checks,
                    "verification_all_true": bool(verification_checks)
                    and all(value is True for value in verification_checks.values()),
                    "recorded_source_hash": citation.get("source_hash"),
                    "actual_source_hash": actual_hash,
                    "source_hash_matches": bool(actual_hash)
                    and citation.get("source_hash") == actual_hash,
                }
            )
        all_facts.extend(facts)
        all_citations.extend(citations)
        query_summaries[name] = {
            "read_path": preflight.get("read_path", {}),
            "runtime": v2.get("runtime", {}),
            "fact_count": len(facts),
            "citation_count": len(citations),
            "labels": [item.get("object_value", {}).get("label") for item in facts],
            "source_refs": [item.get("source_ref") for item in citations],
            "packet_digest": recalled.get("packet_digest"),
            "rejected_candidate_count": recalled.get("rejected_candidate_count"),
            "degradation": recalled.get("degradation", []),
            "citation_bindings": citation_bindings,
        }

    exact_prefix = str(WORKTREE) + os.sep
    query_checks = {}
    for name, summary in query_summaries.items():
        read_path = summary["read_path"]
        query_checks[name] = {
            "v2_active": read_path.get("active_path") == "context_graph_v2",
            "fallback_unused": read_path.get("fallback_used") is False,
            "facts_nonempty": summary["fact_count"] > 0,
            "citations_nonempty": summary["citation_count"] > 0,
            "required_source_cited": str(REQUIRED_QUERY_SOURCE[name])
            in summary["source_refs"],
            "all_citations_exact_root": all(
                str(source).startswith(exact_prefix)
                for source in summary["source_refs"]
            ),
            "all_citation_verification_checks_true": bool(summary["citation_bindings"])
            and all(item["verification_all_true"] for item in summary["citation_bindings"]),
            "all_citation_source_hashes_current": bool(summary["citation_bindings"])
            and all(item["source_hash_matches"] for item in summary["citation_bindings"]),
        }

    checks = {
        "deployment_working": deployment.get("status") == "working",
        "ingestion_passed_or_bounded_scan": (
            deployment.get("ingestion", {}).get("status") == "pass"
            if ingest_mode == "full"
            else deployment.get("ingestion", {}).get("status") == "skipped"
            and deployment.get("ingestion", {}).get("reason") == "dry_run"
        ),
        "exact_root": graph.get("identity", {}).get("root") == str(WORKTREE),
        "exact_branch": graph.get("identity", {}).get("branch")
        == "codex/chopdot-v1-launch",
        "exact_head": graph.get("identity", {}).get("commit") == git("rev-parse", "HEAD"),
        "clean_tree": graph.get("identity", {}).get("dirty") is False,
        "packet_branch_matches_graph": packet.get("branch") == graph.get("identity", {}).get("branch"),
        "packet_commit_matches_graph": packet.get("commit") == graph.get("identity", {}).get("commit"),
        "packet_graph_digest_matches": packet.get("graph_digest") == graph.get("graph_digest"),
        "proof_in_graph": any(
            item.get("source_path") == str(PROOF_PATH.relative_to(WORKTREE))
            for item in graph.get("entities", [])
        ),
        "context_sources_in_graph": all(
            any(
                item.get("source_path") == str(source.relative_to(WORKTREE))
                for item in graph.get("entities", [])
            )
            for source in [CONTEXT_PATH, LIVE_FINDING_PATH, RELEASE_STATE_PATH]
        ),
        "gate9_sources_in_graph": all(
            any(
                item.get("source_path") == str(source.relative_to(WORKTREE))
                for item in graph.get("entities", [])
            )
            for source in GATE9_PATHS
        ),
        "all_queries_pass": all(all(query.values()) for query in query_checks.values()),
    }
    core_pass = all(checks.values())
    knowledge_status = build_knowledge_status(query_checks)
    kg_lineage = {
        "repo_root": str(WORKTREE),
        "branch": source_identity["branch"],
        "commit": source_identity["head"],
        "repo_graph_packet_digest": packet.get("packet_digest"),
        "public_recall_exposes_commit_lineage": False,
        "reason": "Context Graph v2 public recalled facts and citations do not expose an event commit or Repo Graph packet identity, so exact-commit recall cannot be proven.",
    }
    kg_known = knowledge_status["portable_knowledge"]["global_release"]["kg_known"]
    gate9_kg_known = knowledge_status["portable_knowledge"][
        "gate9_legacy_assessment"
    ]["kg_known"]
    status = "partial" if core_pass else "fail"
    result = {
        "schema": "chopdot.release-agentops-verification.v2",
        "schema_version": 2,
        "kind": "chopdot_release_agentops_verification",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "kg_known": kg_known,
        "kg_known_scope": "global_release",
        "gate9_kg_known": gate9_kg_known,
        "knowledge_status": knowledge_status,
        "kg_lineage": kg_lineage,
        "source_identity": source_identity,
        "agentops_runtime": {
            "source_checkout": str(AUTOBOTS_SOURCE),
            "commit": AUTOBOTS_COMMIT,
            "snapshot_root": str(autobots),
            "tool_hashes": AUTOBOTS_TOOL_HASHES,
            "python": sys.version,
        },
        "checks": checks,
        "query_checks": query_checks,
        "queries": query_summaries,
        "repo_graph": {
            "root": graph.get("identity", {}).get("root"),
            "branch": graph.get("identity", {}).get("branch"),
            "commit": graph.get("identity", {}).get("commit"),
            "dirty": graph.get("identity", {}).get("dirty"),
            "dirty_paths": graph.get("identity", {}).get("dirty_paths", []),
            "dirty_status_digest": graph.get("identity", {}).get(
                "dirty_status_digest"
            ),
            "graph_digest": graph.get("graph_digest"),
            "packet_digest": packet.get("packet_digest"),
            "manifest_digest": graph.get("manifest_digest"),
        },
        "deployment": deployment,
        "fact_count": len(all_facts),
        "citation_count": len(all_citations),
        "citation_source_refs": [
            item.get("source_ref") for item in all_citations
        ],
    }

    packet_artifact = {
        "schema_version": 1,
        "kind": "release_exact_worktree_repo_graph_packet",
        "generated_at": result["generated_at"],
        "manifest": MANIFEST,
        "identity": graph.get("identity", {}),
        "scan": graph.get("scan", {}),
        "coverage": graph.get("coverage", {}),
        "graph_digest": graph.get("graph_digest"),
        "packet_digest": packet.get("packet_digest"),
        "deployment": deployment,
        "context_packet": packet,
    }
    port_packet = {
        "schema_version": "1.0.0",
        "kind": "chopdot.release-repo-graph-port-packet.v1",
        "generated_at": result["generated_at"],
        "root": source_identity["root"],
        "branch": source_identity["branch"],
        "commit": source_identity["head"],
        "tree": source_identity["tree"],
        "dirty": False,
        "dirty_paths": [],
        "graph_digest": graph.get("graph_digest"),
        "repo_graph_packet_digest": packet.get("packet_digest"),
        "knowledge_scope": "gate9_legacy_assessment",
        "portable_kg_known": gate9_kg_known,
        "knowledge_status": knowledge_status["portable_knowledge"][
            "gate9_legacy_assessment"
        ],
        "current_outcome_digest": None,
        "source_paths": [item["source_ref"] for item in gate9_bindings],
        "source_bindings": gate9_bindings,
        "facts": build_port_facts(gate9_bindings),
        "stale_reasons": [],
    }
    write_json(artifact_root / "release-repo-graph-packet.json", packet_artifact)
    write_json(
        artifact_root / "release-repo-graph-port-packet.json", port_packet
    )
    write_json(artifact_root / "release-kgv2-recall.json", preflights)
    write_json(artifact_root / "release-agentops-verification.json", result)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 2


def main() -> int:
    source_identity = require_clean_exact_worktree()
    if len(sys.argv) == 3 and sys.argv[1] == "--isolated-run":
        if sys.flags.isolated != 1:
            raise RuntimeError("The AgentOps child entrypoint requires Python isolated mode")
        if Path(sys.executable) != KG_PYTHON:
            raise RuntimeError(f"The AgentOps child requires the configured KGv2 Python: {KG_PYTHON}")
        for variable in ["PYTHONPATH", "PYTHONHOME", "PYTHONSTARTUP", "PYTHONUSERBASE"]:
            if variable in os.environ:
                raise RuntimeError(f"The AgentOps child environment still contains {variable}")
        for variable in ["PYTHONDONTWRITEBYTECODE", "PYTHONNOUSERSITE", "PYTHONSAFEPATH"]:
            if os.environ.get(variable) != "1":
                raise RuntimeError(f"The AgentOps child environment is missing {variable}=1")
        snapshot = Path(sys.argv[2]).resolve()
        supplied_identity = json.loads(
            os.environ.get("CHOPDOT_AGENTOPS_SOURCE_IDENTITY", "{}")
        )
        if supplied_identity != source_identity:
            raise RuntimeError("Parent and isolated child exact-worktree identities differ")
        return isolated_main(snapshot, source_identity)

    if len(sys.argv) != 1:
        raise RuntimeError("No arguments are accepted for the operator entrypoint")
    if not NODE_BIN.is_file():
        raise RuntimeError(f"Required Node runtime is missing: {NODE_BIN}")
    if not KG_PYTHON.is_file():
        raise RuntimeError(f"Required KGv2 Python runtime is missing: {KG_PYTHON}")
    dependency_check = subprocess.run(
        [str(KG_PYTHON), "-B", "-I", "-c", "import psycopg"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )
    if dependency_check.returncode != 0:
        raise RuntimeError("Configured KGv2 Python is missing its approved psycopg dependency")
    attest_autobots_source()
    with tempfile.TemporaryDirectory(prefix="chopdot-agentops-") as temporary:
        snapshot = (Path(temporary) / "runtime").resolve()
        materialize_autobots_snapshot(snapshot)
        environment = os.environ.copy()
        for variable in ["PYTHONPATH", "PYTHONHOME", "PYTHONSTARTUP", "PYTHONUSERBASE"]:
            environment.pop(variable, None)
        environment.update(
            {
                "CHOPDOT_AGENTOPS_SOURCE_IDENTITY": json.dumps(
                    source_identity, sort_keys=True
                ),
                "PYTHONDONTWRITEBYTECODE": "1",
                "PYTHONNOUSERSITE": "1",
                "PYTHONSAFEPATH": "1",
                "PATH": f"{NODE_BIN.parent}:/usr/bin:/bin:/usr/sbin:/sbin",
            }
        )
        child = subprocess.run(
            [str(KG_PYTHON), "-B", "-I", str(Path(__file__).resolve()), "--isolated-run", str(snapshot)],
            cwd=WORKTREE,
            env=environment,
            check=False,
        )
        return child.returncode


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # fail closed before a traceback obscures the gate
        print(f"ChopDot AgentOps refresh refused: {error}", file=sys.stderr)
        raise SystemExit(1)
