#!/usr/bin/env python3
"""Focused source-contract tests for the bounded release AgentOps refresher."""

from __future__ import annotations

import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


SCRIPT_PATH = Path(__file__).with_name("agentops-release-kgv2.py")
SPEC = importlib.util.spec_from_file_location("agentops_release_kgv2", SCRIPT_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Unable to load {SCRIPT_PATH}")
REFRESHER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REFRESHER)


def passing_query_checks() -> dict[str, dict[str, bool]]:
    return {
        name: {
            "v2_active": True,
            "fallback_unused": True,
            "facts_nonempty": True,
            "citations_nonempty": True,
            "required_source_cited": True,
            "all_citations_exact_root": True,
            "all_citation_verification_checks_true": True,
            "all_citation_source_hashes_current": True,
        }
        for name in REFRESHER.QUERIES
    }


class ReleaseAgentOpsGate9ContractTests(unittest.TestCase):
    def test_autobots_source_defaults_to_canonical_checkout_and_accepts_override(self) -> None:
        self.assertEqual(
            REFRESHER.resolve_autobots_source({}),
            Path("/Users/devinsonpena/Documents/AutoBots").resolve(),
        )
        with tempfile.TemporaryDirectory() as temporary:
            expected = Path(temporary).resolve()
            self.assertEqual(
                REFRESHER.resolve_autobots_source(
                    {"CHOPDOT_KGV2_AUTOBOTS_SOURCE": temporary}
                ),
                expected,
            )

    def test_autobots_source_attestation_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary)
            with patch.object(
                REFRESHER.subprocess,
                "run",
                return_value=SimpleNamespace(returncode=1),
            ):
                with self.assertRaisesRegex(RuntimeError, "commit is unavailable"):
                    REFRESHER.attest_autobots_source(source)

            with patch.object(
                REFRESHER.subprocess,
                "run",
                side_effect=[
                    SimpleNamespace(returncode=0),
                    SimpleNamespace(returncode=1, stdout=b""),
                ],
            ):
                with self.assertRaisesRegex(RuntimeError, "tool is unavailable"):
                    REFRESHER.attest_autobots_source(source)

        with self.assertRaisesRegex(RuntimeError, "source checkout is missing"):
            REFRESHER.attest_autobots_source(
                Path(temporary) / "missing-after-cleanup"
            )

    def test_manifest_explicitly_routes_every_gate9_path(self) -> None:
        manifest_paths = REFRESHER.MANIFEST["paths"]
        include = set(manifest_paths["include"])
        critical = set(REFRESHER.MANIFEST["critical_paths"])
        role_sections = {
            "source": set(manifest_paths["source"]),
            "test": set(manifest_paths["tests"]),
            "evidence": set(manifest_paths["evidence"]),
            "plan": set(manifest_paths["specs"]),
        }
        for role, paths in REFRESHER.GATE9_PATHS_BY_ROLE.items():
            for path in paths:
                relative = str(path.relative_to(REFRESHER.WORKTREE))
                self.assertIn(relative, include)
                self.assertIn(relative, critical)
                self.assertIn(relative, role_sections[role])

    def test_gate9_bindings_use_exact_paths_and_current_sha256(self) -> None:
        bindings = REFRESHER.gate9_source_bindings()
        self.assertEqual(len(bindings), len(REFRESHER.GATE9_PATHS))
        self.assertEqual(
            len({item["source_ref"] for item in bindings}), len(bindings)
        )
        for binding in bindings:
            path = Path(binding["source_ref"])
            self.assertEqual(path.parent == REFRESHER.WORKTREE or REFRESHER.WORKTREE in path.parents, True)
            self.assertEqual(
                binding["sha256"], hashlib.sha256(path.read_bytes()).hexdigest()
            )
            self.assertEqual(
                binding["path"], str(path.relative_to(REFRESHER.WORKTREE))
            )

    def test_gate9_query_is_hard_bound_to_accepted_evidence(self) -> None:
        self.assertIn("gate9_legacy_assessment", REFRESHER.QUERIES)
        self.assertEqual(
            REFRESHER.REQUIRED_QUERY_SOURCE["gate9_legacy_assessment"],
            REFRESHER.GATE9_EVIDENCE_PATH,
        )
        self.assertEqual(
            REFRESHER.REQUIRED_QUERY_SOURCE["context_authority"],
            REFRESHER.CONTEXT_PATH,
        )

    def test_read_success_never_fabricates_portable_kg_known(self) -> None:
        status = REFRESHER.build_knowledge_status(passing_query_checks())
        self.assertEqual(status["legacy_context_graph_v2_read"]["status"], "passed")
        self.assertFalse(status["portable_knowledge"]["global_release"]["kg_known"])
        gate9 = status["portable_knowledge"]["gate9_legacy_assessment"]
        self.assertTrue(gate9["legacy_v2_read_gate_pass"])
        self.assertFalse(gate9["kg_known"])
        self.assertEqual(
            gate9["status"], "read_gate_passed_record_and_recall_required"
        )

    def test_missing_context_or_gate9_citation_fails_the_scoped_read_gate(self) -> None:
        for missing in ["context_authority", "gate9_legacy_assessment"]:
            with self.subTest(missing=missing):
                checks = passing_query_checks()
                checks[missing]["required_source_cited"] = False
                status = REFRESHER.build_knowledge_status(checks)
                gate9 = status["portable_knowledge"]["gate9_legacy_assessment"]
                self.assertFalse(gate9["legacy_v2_read_gate_pass"])
                self.assertFalse(gate9["kg_known"])
                self.assertEqual(gate9["status"], "required_source_recall_failed")

    def test_port_packet_facts_bind_gate9_sources_without_claiming_closure(self) -> None:
        bindings = REFRESHER.gate9_source_bindings()
        facts = REFRESHER.build_port_facts(bindings)
        gate9_facts = [
            fact for fact in facts if "Gate 9" in str(fact.get("statement"))
        ]
        self.assertGreaterEqual(len(gate9_facts), 3)
        self.assertTrue(
            any(str(REFRESHER.GATE9_EVIDENCE_PATH) in fact["source_refs"] for fact in gate9_facts)
        )
        self.assertTrue(any("remains building" in fact["statement"] for fact in gate9_facts))


if __name__ == "__main__":
    unittest.main()
