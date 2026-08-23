#!/usr/bin/env python3
"""Build and ingest a bounded Repo Graph for the exact launch worktree."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


WORKTREE = Path("/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch").resolve()
AUTOBOTS = Path("/Users/devinsonpena/.codex/worktrees/24f9/AutoBots").resolve()
REPO_ID = "chopdot-v1-launch"
ARTIFACT_ROOT = WORKTREE / "artifacts" / "agentops"

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
            "docs/research/RESEARCH-002_PARITY_PRODUCTS_DEVNET_CAPABILITY_CATALOG.md",
            "docs/research/CHOPDOT_PLATFORM_OPPORTUNITY_MATRIX.md",
            "docs/CODEX_PLATFORM_CATALOG_ADDENDUM.md",
        ],
        "tasks": ["docs/CHOPDOT_V1_EXECUTION_BOARD.md", "docs/superpowers/plans/**"],
        "evidence": ["docs/research/evidence/**", "artifacts/**"],
        "generated": [
            "docs/research/PARITY_PRODUCTS_DEVNET_CATALOG.json",
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
        "docs/research/CHOPDOT_PLATFORM_ADOPTION_DECISIONS.md",
        "docs/research/RESEARCH-002_PARITY_PRODUCTS_DEVNET_CAPABILITY_CATALOG.md",
        "docs/research/PARITY_PRODUCTS_DEVNET_CATALOG.json",
    ],
}


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            payload,
            indent=2,
            sort_keys=True,
            default=lambda value: value.isoformat() if hasattr(value, "isoformat") else str(value),
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    if not (WORKTREE / ".git").exists() and not (WORKTREE / ".git").is_file():
        raise RuntimeError(f"Exact worktree is unavailable: {WORKTREE}")

    os.environ["AGENTOPS_CONTEXT_GRAPH_MODE"] = "v2"
    os.environ["AGENTOPS_CG2_REPO_ROOT_CHOPDOT_V1_LAUNCH"] = str(WORKTREE)

    deployment = deploy_repo(MANIFEST, apply=True, portfolio_tier="product")
    report_root = AUTOBOTS / "agentops" / "reports" / "repo_graph_v1" / "repos" / REPO_ID
    graph = json.loads((report_root / "graph.json").read_text(encoding="utf-8"))
    packet = json.loads((report_root / "context_packet.json").read_text(encoding="utf-8"))

    packet_artifact = {
        "schema_version": 1,
        "kind": "exact_worktree_repo_graph_packet",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "manifest": MANIFEST,
        "identity": graph["identity"],
        "scan": graph["scan"],
        "coverage": graph["coverage"],
        "graph_digest": graph["graph_digest"],
        "packet_digest": packet["packet_digest"],
        "deployment": deployment,
        "context_packet": packet,
        "agentops_source": {
            "root": str(AUTOBOTS),
            "branch": os.popen(f"git -C '{AUTOBOTS}' branch --show-current").read().strip(),
            "commit": os.popen(f"git -C '{AUTOBOTS}' rev-parse HEAD").read().strip(),
        },
    }
    write_json(ARTIFACT_ROOT / "catalog-repo-graph-packet.json", packet_artifact)

    preflight = build_kg_preflight(
        intent="ADOPT_AS_ADAPTER Statement Store Product SDK ChopDot platform adoption decisions",
        task_family="architecture_research",
        repo_target=REPO_ID,
        max_lessons=5,
        max_capabilities=5,
        mode_override="v2",
    )
    write_json(ARTIFACT_ROOT / "catalog-kgv2-recall.json", preflight)

    v2 = preflight.get("context_graph_v2", {})
    recalled = v2.get("packet", {})
    citations = recalled.get("citations", [])
    exact_citations = [
        item
        for item in citations
        if str(item.get("source_ref", "")).startswith(str(WORKTREE) + os.sep)
    ]
    decision_citations = [
        item
        for item in exact_citations
        if item.get("source_ref", "").endswith("docs/research/CHOPDOT_PLATFORM_ADOPTION_DECISIONS.md")
    ]
    checks = {
        "deployment_not_blocked": deployment["status"] != "blocked",
        "ingestion_passed": deployment.get("ingestion", {}).get("status") == "pass",
        "exact_root": graph["identity"]["root"] == str(WORKTREE),
        "exact_branch": graph["identity"]["branch"] == "codex/chopdot-v1-launch",
        "v2_active": preflight.get("read_path", {}).get("active_path") == "context_graph_v2",
        "fallback_unused": preflight.get("read_path", {}).get("fallback_used") is False,
        "recalled_facts_nonempty": bool(recalled.get("facts")),
        "citations_nonempty": bool(citations),
        "all_citations_exact_root": bool(citations) and len(exact_citations) == len(citations),
        "at_least_two_decision_citations": len(decision_citations) >= 2,
    }
    summary = {
        "status": "pass" if all(checks.values()) else "fail",
        "checks": checks,
        "repo_graph_status": deployment["status"],
        "ingestion": deployment.get("ingestion", {}),
        "read_path": preflight.get("read_path", {}),
        "runtime": v2.get("runtime", {}),
        "fact_count": len(recalled.get("facts", [])),
        "citation_count": len(citations),
        "decision_citation_count": len(decision_citations),
        "citation_source_refs": [item.get("source_ref") for item in citations],
        "graph_digest": graph["graph_digest"],
        "packet_digest": packet["packet_digest"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if summary["status"] == "pass" else 2


if __name__ == "__main__":
    raise SystemExit(main())
