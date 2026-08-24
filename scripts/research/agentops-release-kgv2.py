#!/usr/bin/env python3
"""Ingest and recall bounded release evidence for the exact launch worktree."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


WORKTREE = Path("/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch").resolve()
AUTOBOTS = Path("/Users/devinsonpena/.codex/worktrees/24f9/AutoBots").resolve()
REPO_ID = "chopdot-v1-launch"
ARTIFACT_ROOT = WORKTREE / "artifacts" / "agentops"
PROOF_PATH = WORKTREE / "docs/release/2026-08-24-recovery-head-index-live-proof.md"

sys.path.insert(0, str(AUTOBOTS))

from agentops.runners.kg_preflight import build_kg_preflight  # noqa: E402
from agentops.runners.repo_graph_v1 import deploy_repo  # noqa: E402


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
            "package.json",
            "package-lock.json",
            "docs/release/**",
            "docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.md",
            "docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.json",
            "deployment/README.md",
            "deployment/recovery-head-index/**",
            "contracts/recovery-head-index/**",
            "scripts/lib/recovery-head-verification.mjs",
            "scripts/prepare-dot-host-release.mjs",
            "scripts/recovery-head-deployment.mjs",
            "scripts/release-evidence.test.mjs",
            "scripts/verify-dot-host.mjs",
            "src/main.tsx",
            "src/recovery/**",
        ],
        "source": ["src/**", "scripts/**", "contracts/**"],
        "tests": ["**/*.test.*", "**/*.spec.*", "contracts/**/test/**"],
        "specs": ["docs/superpowers/plans/**"],
        "decisions": ["PRODUCT_TRUTH.md", "docs/release/**"],
        "tasks": ["docs/superpowers/plans/**"],
        "evidence": [
            "docs/release/**",
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
        "docs/release/2026-08-24-local-release-assurance.md",
        "docs/release/2026-08-24-recovery-head-index-live-proof.md",
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
}


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, default=str) + "\n",
        encoding="utf-8",
    )


def git(*args: str) -> str:
    return subprocess.check_output(
        ["git", "-C", str(WORKTREE), *args], text=True
    ).strip()


def main() -> int:
    if Path.cwd().resolve() != WORKTREE:
        raise RuntimeError(f"Run from exact worktree: {WORKTREE}")
    if not PROOF_PATH.exists():
        raise RuntimeError(f"Release proof is missing: {PROOF_PATH}")

    os.environ["AGENTOPS_CONTEXT_GRAPH_MODE"] = "v2"
    os.environ["AGENTOPS_CG2_REPO_ROOT_CHOPDOT_V1_LAUNCH"] = str(WORKTREE)

    deployment = deploy_repo(MANIFEST, apply=True, portfolio_tier="product")
    report_root = AUTOBOTS / "agentops/reports/repo_graph_v1/repos" / REPO_ID
    graph = json.loads((report_root / "graph.json").read_text(encoding="utf-8"))
    packet = json.loads(
        (report_root / "context_packet.json").read_text(encoding="utf-8")
    )

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
        }

    proof_ref = str(PROOF_PATH)
    exact_prefix = str(WORKTREE) + os.sep
    query_checks = {}
    for name, summary in query_summaries.items():
        read_path = summary["read_path"]
        query_checks[name] = {
            "v2_active": read_path.get("active_path") == "context_graph_v2",
            "fallback_unused": read_path.get("fallback_used") is False,
            "facts_nonempty": summary["fact_count"] > 0,
            "citations_nonempty": summary["citation_count"] > 0,
            "release_proof_cited": proof_ref in summary["source_refs"],
            "all_citations_exact_root": all(
                str(source).startswith(exact_prefix)
                for source in summary["source_refs"]
            ),
        }

    checks = {
        "deployment_working": deployment.get("status") == "working",
        "ingestion_passed": deployment.get("ingestion", {}).get("status") == "pass",
        "exact_root": graph.get("identity", {}).get("root") == str(WORKTREE),
        "exact_branch": graph.get("identity", {}).get("branch")
        == "codex/chopdot-v1-launch",
        "exact_head": graph.get("identity", {}).get("commit") == git("rev-parse", "HEAD"),
        "clean_tree": graph.get("identity", {}).get("dirty") is False,
        "proof_in_graph": any(
            item.get("source_path") == str(PROOF_PATH.relative_to(WORKTREE))
            for item in graph.get("entities", [])
        ),
        "all_queries_pass": all(
            all(query.values()) for query in query_checks.values()
        ),
    }
    status = "pass" if all(checks.values()) else "fail"
    result = {
        "schema_version": 1,
        "kind": "chopdot_release_agentops_verification",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
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
    write_json(ARTIFACT_ROOT / "release-repo-graph-packet.json", packet_artifact)
    write_json(ARTIFACT_ROOT / "release-kgv2-recall.json", preflights)
    write_json(ARTIFACT_ROOT / "release-agentops-verification.json", result)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if status == "pass" else 2


if __name__ == "__main__":
    raise SystemExit(main())
