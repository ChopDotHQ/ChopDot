#!/usr/bin/env python3
"""Ingest and recall the feature-inheritance matrix for the exact launch worktree."""

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
MATRIX_PATH = WORKTREE / "docs/research/CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.md"
DECISIONS_PATH = WORKTREE / "docs/research/CHOPDOT_FEATURE_INHERITANCE_DECISIONS.md"

sys.path.insert(0, str(AUTOBOTS))

from agentops.runners.kg_preflight import build_kg_preflight  # noqa: E402
from agentops.runners.repo_graph_v1 import deploy_repo  # noqa: E402


MANIFEST = {
    "schema_version": "1.0",
    "repo_id": REPO_ID,
    "root": str(WORKTREE),
    "privacy": "private_local",
    "languages": ["javascript", "typescript"],
    "paths": {
        "include": [
            "README.md",
            "package.json",
            "package-lock.json",
            "docs/research/**",
            "docs/CHOPDOT_V1_EXECUTION_BOARD.md",
            "docs/CODEX_PLATFORM_CATALOG_ADDENDUM.md",
            "docs/superpowers/plans/2026-08-22-products-devnet-catalog-kgv2.md",
            "docs/superpowers/plans/2026-08-22-chopdot-feature-inheritance-external-analog-matrix.md",
            "docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.md",
            "docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.json",
            "scripts/research/**",
            "src/contacts/**",
            "src/payments/pasWallet.ts",
            "tests/fixtures/verifiedContactFixture.ts",
        ],
        "source": ["src/**", "scripts/**"],
        "tests": ["tests/**", "**/*.test.*", "**/*.spec.*"],
        "specs": ["docs/superpowers/plans/**"],
        "decisions": [
            "docs/research/CHOPDOT_PLATFORM_ADOPTION_DECISIONS.md",
            "docs/research/CHOPDOT_FEATURE_INHERITANCE_DECISIONS.md",
            "docs/research/CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.md",
            "docs/research/RESEARCH-002_PARITY_PRODUCTS_DEVNET_CAPABILITY_CATALOG.md",
            "docs/research/CHOPDOT_PLATFORM_OPPORTUNITY_MATRIX.md",
            "docs/CODEX_PLATFORM_CATALOG_ADDENDUM.md",
            "docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.md",
        ],
        "tasks": ["docs/CHOPDOT_V1_EXECUTION_BOARD.md", "docs/superpowers/plans/**"],
        "evidence": ["docs/research/evidence/**", "artifacts/**"],
        "generated": [
            "docs/research/PARITY_PRODUCTS_DEVNET_CATALOG.json",
            "docs/research/CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.json",
            "docs/research/devnet-registry-snapshots/**",
            "docs/research/parity-repository-snapshots/**",
        ],
        "exclude": [
            "**/.local-private/**",
            "**/node_modules/**",
            "**/.venv*/**",
            "**/vendor/**",
            "**/dist/**",
            "**/build/**",
            "**/coverage/**",
        ],
    },
    "critical_paths": [
        "README.md",
        "package.json",
        "docs/research/CHOPDOT_FEATURE_INHERITANCE_DECISIONS.md",
        "docs/research/CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.md",
        "docs/research/CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.json",
        "docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.md",
        "docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.json",
    ],
}


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, default=str) + "\n",
        encoding="utf-8",
    )


def git(*args: str) -> str:
    return subprocess.check_output(["git", "-C", str(WORKTREE), *args], text=True).strip()


def main() -> int:
    if not MATRIX_PATH.exists() or not DECISIONS_PATH.exists():
        raise RuntimeError("Feature inheritance artifacts are missing")

    os.environ["AGENTOPS_CONTEXT_GRAPH_MODE"] = "v2"
    os.environ["AGENTOPS_CG2_REPO_ROOT_CHOPDOT_V1_LAUNCH"] = str(WORKTREE)

    deployment = deploy_repo(MANIFEST, apply=True, portfolio_tier="product")
    report_root = AUTOBOTS / "agentops" / "reports" / "repo_graph_v1" / "repos" / REPO_ID
    graph = json.loads((report_root / "graph.json").read_text(encoding="utf-8"))
    packet = json.loads((report_root / "context_packet.json").read_text(encoding="utf-8"))

    packet_artifact = {
        "schema_version": 1,
        "kind": "feature_inheritance_exact_worktree_repo_graph_packet",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "manifest": MANIFEST,
        "identity": graph["identity"],
        "scan": graph["scan"],
        "coverage": graph["coverage"],
        "graph_digest": graph["graph_digest"],
        "packet_digest": packet["packet_digest"],
        "deployment": deployment,
        "context_packet": packet,
        "feature_matrix": {
            "path": str(MATRIX_PATH),
            "decision_path": str(DECISIONS_PATH),
            "matrix_digest": json.loads(
                (WORKTREE / "docs/research/CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.json")
                .read_text(encoding="utf-8")
            )["matrix_digest"],
        },
    }
    write_json(ARTIFACT_ROOT / "feature-inheritance-repo-graph-packet.json", packet_artifact)

    modes_preflight = build_kg_preflight(
        intent=(
            "ChopDot savings circles CircleCredit emergency pots community funds "
            "external analog zero generated paths"
        ),
        task_family="product_research",
        repo_target=REPO_ID,
        max_lessons=8,
        max_capabilities=8,
        mode_override="v2",
    )
    group_cards_preflight = build_kg_preflight(
        intent=(
            "Decision group cards remain ChopDot-owned product synthesis living "
            "group card one current state one next actor one obvious action"
        ),
        task_family="product_research",
        repo_target=REPO_ID,
        max_lessons=6,
        max_capabilities=6,
        mode_override="v2",
    )
    write_json(
        ARTIFACT_ROOT / "feature-inheritance-kgv2-recall.json",
        {"modes": modes_preflight, "group_cards": group_cards_preflight},
    )

    modes_v2 = modes_preflight.get("context_graph_v2", {})
    group_cards_v2 = group_cards_preflight.get("context_graph_v2", {})
    modes_recalled = modes_v2.get("packet", {})
    group_cards_recalled = group_cards_v2.get("packet", {})
    modes_facts = modes_recalled.get("facts", [])
    group_cards_facts = group_cards_recalled.get("facts", [])
    facts = modes_facts + group_cards_facts
    citations = modes_recalled.get("citations", []) + group_cards_recalled.get("citations", [])
    exact_citations = [
        item
        for item in citations
        if str(item.get("source_ref", "")).startswith(str(WORKTREE) + os.sep)
    ]
    decision_citations = [
        item
        for item in exact_citations
        if item.get("source_ref", "").endswith(
            "docs/research/CHOPDOT_FEATURE_INHERITANCE_DECISIONS.md"
        )
    ]
    modes_recalled_text = json.dumps(modes_facts).lower()
    group_cards_recalled_text = json.dumps(group_cards_facts).lower()
    modes_read_path = modes_preflight.get("read_path", {})
    group_cards_read_path = group_cards_preflight.get("read_path", {})
    checks = {
        "deployment_not_blocked": deployment["status"] != "blocked",
        "ingestion_passed": deployment.get("ingestion", {}).get("status") == "pass",
        "exact_root": graph["identity"]["root"] == str(WORKTREE),
        "exact_branch": graph["identity"]["branch"] == "codex/chopdot-v1-launch",
        "exact_head": graph["identity"]["commit"] == git("rev-parse", "HEAD"),
        "v2_active": (
            modes_read_path.get("active_path") == "context_graph_v2"
            and group_cards_read_path.get("active_path") == "context_graph_v2"
        ),
        "fallback_unused": (
            modes_read_path.get("fallback_used") is False
            and group_cards_read_path.get("fallback_used") is False
        ),
        "recalled_facts_nonempty": bool(modes_facts) and bool(group_cards_facts),
        "citations_nonempty": bool(citations),
        "all_citations_exact_root": bool(citations) and len(exact_citations) == len(citations),
        "feature_decision_citation_present": bool(decision_citations),
        "savings_or_circlecredit_recalled": (
            "savings" in modes_recalled_text or "circlecredit" in modes_recalled_text
        ),
        "group_cards_recalled": "group card" in group_cards_recalled_text,
    }
    summary = {
        "status": "pass" if all(checks.values()) else "fail",
        "checks": checks,
        "repo_graph_status": deployment["status"],
        "ingestion": deployment.get("ingestion", {}),
        "read_paths": {
            "modes": modes_read_path,
            "group_cards": group_cards_read_path,
        },
        "runtimes": {
            "modes": modes_v2.get("runtime", {}),
            "group_cards": group_cards_v2.get("runtime", {}),
        },
        "fact_count": len(facts),
        "fact_counts": {"modes": len(modes_facts), "group_cards": len(group_cards_facts)},
        "citation_count": len(citations),
        "feature_decision_citation_count": len(decision_citations),
        "citation_source_refs": [item.get("source_ref") for item in citations],
        "graph_digest": graph["graph_digest"],
        "packet_digest": packet["packet_digest"],
    }
    write_json(ARTIFACT_ROOT / "feature-inheritance-agentops-verification.json", summary)
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if summary["status"] == "pass" else 2


if __name__ == "__main__":
    raise SystemExit(main())
