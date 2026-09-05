#!/usr/bin/env python3
"""Verify KGv2 recall of the full-product plan from the exact launch worktree."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


WORKTREE = Path("/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch").resolve()
AUTOBOTS = Path("/Users/devinsonpena/.codex/worktrees/24f9/AutoBots").resolve()
ARTIFACT_ROOT = WORKTREE / "artifacts" / "agentops"
PLAN_PATH = WORKTREE / "docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.md"
REPO_GRAPH_PATH = ARTIFACT_ROOT / "feature-inheritance-repo-graph-packet.json"
REPO_GRAPH_REPORT_PATH = (
    AUTOBOTS
    / "agentops/reports/repo_graph_v1/repos/chopdot-v1-launch/graph.json"
)

sys.path.insert(0, str(AUTOBOTS))

from agentops.runners.kg_preflight import build_kg_preflight  # noqa: E402


QUERIES = {
    "release_definition": "13. Definition of full-product release",
    "architecture": (
        "5. No-Supabase architecture decision lock Responsibility v1 owner "
        "canonical truth"
    ),
    "mode_completion": (
        "Spend Card map SP-001--SP-008 Savings circle map SC-001--SC-012 "
        "Emergency pot map EP-001--EP-010 Community fund map CF-001--CF-010"
    ),
    "next_move": "Immediate next move Start Wave 0 only",
}


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, default=str) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    if Path.cwd().resolve() != WORKTREE:
        raise RuntimeError(f"Run from exact worktree: {WORKTREE}")
    if not PLAN_PATH.exists() or not REPO_GRAPH_PATH.exists() or not REPO_GRAPH_REPORT_PATH.exists():
        raise RuntimeError("Plan or refreshed Repo Graph packet missing")

    os.environ["AGENTOPS_CONTEXT_GRAPH_MODE"] = "v2"
    os.environ["AGENTOPS_CG2_REPO_ROOT_CHOPDOT_V1_LAUNCH"] = str(WORKTREE)

    preflights = {}
    summaries = {}
    all_citations = []
    for name, intent in QUERIES.items():
        preflight = build_kg_preflight(
            intent=intent,
            task_family="product_planning",
            repo_target="chopdot-v1-launch",
            max_lessons=12,
            max_capabilities=12,
            mode_override="v2",
        )
        preflights[name] = preflight
        v2 = preflight.get("context_graph_v2", {})
        packet = v2.get("packet", {})
        facts = packet.get("facts", [])
        citations = packet.get("citations", [])
        all_citations.extend(citations)
        summaries[name] = {
            "read_path": preflight.get("read_path", {}),
            "runtime": v2.get("runtime", {}),
            "fact_count": len(facts),
            "citation_count": len(citations),
            "labels": [item.get("object_value", {}).get("label") for item in facts],
            "source_refs": [item.get("source_ref") for item in citations],
            "packet_digest": packet.get("packet_digest"),
            "rejected_candidate_count": packet.get("rejected_candidate_count"),
            "degradation": packet.get("degradation", []),
        }

    plan_ref = str(PLAN_PATH)
    repo_graph = json.loads(REPO_GRAPH_PATH.read_text(encoding="utf-8"))
    graph_report = json.loads(REPO_GRAPH_REPORT_PATH.read_text(encoding="utf-8"))
    relative_plan_path = str(PLAN_PATH.relative_to(WORKTREE))
    plan_entities = [
        item
        for item in graph_report.get("entities", [])
        if item.get("source_path") == relative_plan_path
    ]
    query_checks = {}
    for name, summary in summaries.items():
        read_path = summary["read_path"]
        query_checks[name] = {
            "v2_active": read_path.get("active_path") == "context_graph_v2",
            "fallback_unused": read_path.get("fallback_used") is False,
            "facts_nonempty": summary["fact_count"] > 0,
            "citations_nonempty": summary["citation_count"] > 0,
            "plan_citation_present": plan_ref in summary["source_refs"],
            "all_citations_exact_root": all(
                str(source).startswith(str(WORKTREE) + os.sep)
                for source in summary["source_refs"]
            ),
        }

    checks = {
        "exact_repo_graph_root": repo_graph.get("identity", {}).get("root") == str(WORKTREE),
        "exact_repo_graph_branch": repo_graph.get("identity", {}).get("branch") == "codex/chopdot-v1-launch",
        "plan_in_repo_graph": bool(plan_entities),
        "all_queries_pass": all(
            all(query_result.values()) for query_result in query_checks.values()
        ),
    }
    status = "pass" if all(checks.values()) else "fail"
    result = {
        "schema_version": 1,
        "kind": "chopdot_full_product_plan_kgv2_verification",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "checks": checks,
        "query_checks": query_checks,
        "queries": summaries,
        "repo_graph": {
            "root": repo_graph.get("identity", {}).get("root"),
            "branch": repo_graph.get("identity", {}).get("branch"),
            "commit": repo_graph.get("identity", {}).get("commit"),
            "dirty": repo_graph.get("identity", {}).get("dirty"),
            "dirty_status_digest": repo_graph.get("identity", {}).get("dirty_status_digest"),
            "graph_digest": repo_graph.get("graph_digest"),
            "packet_digest": repo_graph.get("packet_digest"),
            "plan_entity_count": len(plan_entities),
            "plan_source_hashes": sorted(
                {item.get("source_hash") for item in plan_entities if item.get("source_hash")}
            ),
        },
        "fact_count": sum(item["fact_count"] for item in summaries.values()),
        "citation_count": sum(item["citation_count"] for item in summaries.values()),
        "unique_citation_source_refs": sorted(
            {item.get("source_ref") for item in all_citations if item.get("source_ref")}
        ),
    }
    write_json(ARTIFACT_ROOT / "full-product-plan-kgv2-recall.json", preflights)
    write_json(ARTIFACT_ROOT / "full-product-plan-agentops-verification.json", result)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if status == "pass" else 2


if __name__ == "__main__":
    raise SystemExit(main())
