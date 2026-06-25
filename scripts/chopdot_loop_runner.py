#!/usr/bin/env python3
"""Executable ChopDot operating loops.

This runner turns docs/CHOPDOT_OPERATING_LOOPS.md into a small deterministic
control plane: create packets, validate loop-specific gates, record outcomes,
and maintain improvement backlog/state.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shlex
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_ROOT = REPO_ROOT / "artifacts" / "chopdot-loops"
RUN_ROOT = ARTIFACT_ROOT / "runs"
STATE_PATH = ARTIFACT_ROOT / "loop-state.json"
DECISION_LOG_PATH = ARTIFACT_ROOT / "decision-log.jsonl"
IMPROVEMENT_BACKLOG_PATH = ARTIFACT_ROOT / "improvement-backlog.md"

PILLARS = {"Catch", "Management", "Payout", "History"}
VERDICTS = {"keep", "build", "spike", "defer", "reject"}
TECHNICAL_USER_COPY_TERMS = {
    "adapter",
    "asset hub",
    "bulletin",
    "chapter",
    "claim",
    "coinage",
    "dotns",
    "host",
    "kernel",
    "native",
    "obligation",
    "product sdk",
    "protocol",
    "rail",
    "raw json",
    "settlement",
    "state machine",
    "statement store",
    "test-token",
    "test token",
}
PRODUCT_GATE_LOOPS = {"product-spine", "ux-shape"}
REAL_WORKFLOW_EFFECT_TERMS = {
    "next action",
    "permission",
    "status",
    "workflow",
    "closeout",
    "blocker",
    "confirmation",
    "confirm",
    "payment",
    "receipt",
    "history",
    "claim",
    "approval",
    "handoff",
}
DECORATIVE_ONLY_TERMS = {
    "name only",
    "rename",
    "default only",
    "defaults only",
    "changes name",
    "changes the name",
    "currency only",
    "copy only",
    "label only",
    "category only",
    "preset only",
}
SENSITIVE_PATTERNS = [
    re.compile(r"\b(seed phrase|mnemonic|private key|secret key)\b", re.IGNORECASE),
    re.compile(r"\bmedical details\b", re.IGNORECASE),
    re.compile(r"0x[a-fA-F0-9]{32,}"),
]


@dataclass(frozen=True)
class LoopDefinition:
    loop_id: str
    name: str
    role: str
    required_fields: set[str]
    recommended_fields: set[str] = field(default_factory=set)
    follow_up_loop: str | None = None


LOOPS: dict[str, LoopDefinition] = {
    "product-spine": LoopDefinition(
        "product-spine",
        "Product Spine Loop",
        "product lead",
        {
            "decision",
            "user_job",
            "pillars",
            "current_friction",
            "trust_gap",
            "product_gate",
            "proposed_change",
            "strongest_null_option",
            "expected_user_visible_outcome",
            "verifier",
            "stop_condition",
            "verdict",
        },
        {"evidence_paths"},
        "ux-shape",
    ),
    "first-time-user": LoopDefinition(
        "first-time-user",
        "First-Time User Loop",
        "participant persona",
        {
            "decision",
            "user_job",
            "persona",
            "device_context",
            "first_time_answers",
            "expected_user_visible_outcome",
            "verifier",
            "stop_condition",
            "evidence_paths",
            "verdict",
        },
        {"observations"},
        "money-behavior",
    ),
    "money-behavior": LoopDefinition(
        "money-behavior",
        "Money Behavior Loop",
        "money-behavior researcher",
        {
            "decision",
            "user_job",
            "pillars",
            "current_friction",
            "trust_gap",
            "social_risk",
            "proposed_change",
            "expected_user_visible_outcome",
            "verifier",
            "stop_condition",
            "verdict",
        },
        {"pilot_questions", "evidence_paths"},
        "ux-shape",
    ),
    "ux-shape": LoopDefinition(
        "ux-shape",
        "UX Shape Loop",
        "product designer",
        {
            "decision",
            "user_job",
            "route_or_screen",
            "expected_user_visible_outcome",
            "verifier",
            "stop_condition",
            "evidence_paths",
            "product_gate",
            "surface_delta",
            "verdict",
        },
        {"changed_files", "copy_review"},
        "first-time-user",
    ),
    "commitment-kernel": LoopDefinition(
        "commitment-kernel",
        "Commitment Kernel Loop",
        "domain engineer",
        {
            "decision",
            "user_job",
            "state_invariant",
            "proposed_change",
            "expected_user_visible_outcome",
            "verifier",
            "stop_condition",
            "commands",
            "verdict",
        },
        {"changed_files", "evidence_paths"},
        "evidence-qa",
    ),
    "polkadot-native-adapter": LoopDefinition(
        "polkadot-native-adapter",
        "Polkadot Native Adapter Loop",
        "native stack researcher/adapter engineer",
        {
            "decision",
            "user_job",
            "pillars",
            "adapter_boundary",
            "failure_mode",
            "source_refs",
            "expected_user_visible_outcome",
            "verifier",
            "stop_condition",
            "verdict",
        },
        {"commands", "evidence_paths"},
        "security-privacy-abuse",
    ),
    "security-privacy-abuse": LoopDefinition(
        "security-privacy-abuse",
        "Security, Privacy, And Abuse Loop",
        "safety reviewer",
        {
            "decision",
            "user_job",
            "privacy_class",
            "sensitive_data",
            "claim_boundary",
            "expected_user_visible_outcome",
            "verifier",
            "stop_condition",
            "evidence_paths",
            "verdict",
        },
        {"changed_files", "commands"},
        "evidence-qa",
    ),
    "evidence-qa": LoopDefinition(
        "evidence-qa",
        "Evidence And QA Loop",
        "verifier",
        {
            "decision",
            "user_job",
            "expected_user_visible_outcome",
            "verifier",
            "stop_condition",
            "commands",
            "evidence_paths",
            "verdict",
        },
        {"residual_risk"},
        "decision-editor",
    ),
    "decision-editor": LoopDefinition(
        "decision-editor",
        "Decision Editor Loop",
        "operating editor",
        {
            "decision",
            "current_status",
            "blocked_gates",
            "next_loop",
            "expected_user_visible_outcome",
            "verifier",
            "stop_condition",
            "evidence_paths",
            "verdict",
        },
        {"scorecard_delta"},
        None,
    ),
}


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug[:80] or "loop-run"


def load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        raise SystemExit(f"Missing JSON packet: {path}")
    except json.JSONDecodeError as error:
        raise SystemExit(f"Invalid JSON in {path}: {error}")


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def packet_template(loop_id: str, decision: str) -> dict[str, Any]:
    loop = require_loop(loop_id)
    packet: dict[str, Any] = {
        "schema_version": 1,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "loop_id": loop.loop_id,
        "loop_name": loop.name,
        "role": loop.role,
        "decision": decision,
        "user_job": "",
        "pillars": [],
        "current_friction": "",
        "trust_gap": "",
        "product_gate": {
            "user_journey": "",
            "one_next_action": "",
            "friction_score": None,
            "trust_score": None,
            "clarity_score": None,
            "language_score": None,
            "total_score": None,
            "decision": "",
        },
        "proposed_change": "",
        "strongest_null_option": "",
        "expected_user_visible_outcome": "",
        "verifier": "",
        "stop_condition": "",
        "evidence_paths": [],
        "commands": [],
        "verdict": "",
        "notes": "",
    }
    if loop.loop_id == "first-time-user":
        packet["evidence_mode"] = "preflight"
        packet["persona"] = ""
        packet["device_context"] = ""
        packet["first_time_answers"] = {
            "what_is_this_pot_for": "",
            "what_do_i_do_now": "",
            "who_blocks_the_group": "",
            "what_changed_after_i_acted": "",
            "am_i_done": "",
        }
    if loop.loop_id == "money-behavior":
        packet["social_risk"] = ""
        packet["pilot_questions"] = []
    if loop.loop_id == "ux-shape":
        packet["route_or_screen"] = ""
        packet["changed_files"] = []
        packet["copy_review"] = ""
        packet["surface_delta"] = {
            "visible_choices_added": 0,
            "user_action_gained": "",
            "workflow_effect": "",
            "friction_added": "",
            "confusion_removed": "",
            "evidence_of_removed_friction": "",
            "keep_change_remove": "",
        }
    if loop.loop_id == "commitment-kernel":
        packet["state_invariant"] = "claimed != received/cleared != approved/released != closed"
        packet["changed_files"] = []
    if loop.loop_id == "polkadot-native-adapter":
        packet["adapter_boundary"] = ""
        packet["failure_mode"] = ""
        packet["source_refs"] = []
    if loop.loop_id == "security-privacy-abuse":
        packet["privacy_class"] = ""
        packet["sensitive_data"] = ""
        packet["claim_boundary"] = ""
        packet["changed_files"] = []
    if loop.loop_id == "evidence-qa":
        packet["residual_risk"] = ""
    if loop.loop_id == "decision-editor":
        packet["current_status"] = ""
        packet["blocked_gates"] = []
        packet["next_loop"] = loop.follow_up_loop or ""
        packet["scorecard_delta"] = ""
    return packet


def require_loop(loop_id: str) -> LoopDefinition:
    if loop_id not in LOOPS:
        valid = ", ".join(sorted(LOOPS))
        raise SystemExit(f"Unknown loop '{loop_id}'. Valid loops: {valid}")
    return LOOPS[loop_id]


def is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, (list, dict, tuple, set)):
        return len(value) == 0
    return False


def normalize_paths(values: Any) -> list[Path]:
    if not isinstance(values, list):
        return []
    paths = []
    for value in values:
        if isinstance(value, str) and value.strip():
            path = Path(value)
            if not path.is_absolute():
                path = REPO_ROOT / path
            paths.append(path)
    return paths


def validate_required_fields(packet: dict[str, Any], loop: LoopDefinition) -> list[str]:
    failures = []
    for field_name in sorted(loop.required_fields):
        if is_blank(packet.get(field_name)):
            failures.append(f"missing required field: {field_name}")
    verdict = packet.get("verdict")
    if verdict and verdict not in VERDICTS:
        failures.append(f"verdict must be one of {sorted(VERDICTS)}")
    return failures


def validate_pillars(packet: dict[str, Any]) -> list[str]:
    if "pillars" not in packet or is_blank(packet.get("pillars")):
        return []
    pillars = packet.get("pillars")
    if not isinstance(pillars, list):
        return ["pillars must be a list"]
    invalid = [pillar for pillar in pillars if pillar not in PILLARS]
    if invalid:
        return [f"invalid pillars: {invalid}; valid pillars: {sorted(PILLARS)}"]
    return []


def validate_evidence_paths(packet: dict[str, Any]) -> list[str]:
    failures = []
    for path in normalize_paths(packet.get("evidence_paths")):
        if not path.exists():
            failures.append(f"evidence path does not exist: {path.relative_to(REPO_ROOT) if path.is_relative_to(REPO_ROOT) else path}")
    return failures


def validate_product_gate(packet: dict[str, Any]) -> list[str]:
    failures = []
    if str(packet.get("loop_id", "")) not in PRODUCT_GATE_LOOPS:
        return failures
    gate = packet.get("product_gate")
    if not isinstance(gate, dict):
        return ["product_gate must be an object"]
    for field_name in [
        "user_journey",
        "one_next_action",
        "friction_score",
        "trust_score",
        "clarity_score",
        "language_score",
        "total_score",
        "decision",
    ]:
        if is_blank(gate.get(field_name)):
            failures.append(f"product_gate missing {field_name}")
    journey = str(gate.get("user_journey", "")).strip()
    if journey and not re.search(r"\bI am\b.+\bI need to\b.+\bso the group can\b", journey, re.IGNORECASE):
        failures.append('product_gate.user_journey must follow "I am [person], I need to [do one job], so the group can [outcome]."')
    one_next_action = str(gate.get("one_next_action", "")).strip()
    if one_next_action and len([part for part in re.split(r",|/|\band\b", one_next_action, flags=re.IGNORECASE) if part.strip()]) > 1:
        failures.append("product_gate.one_next_action must name one primary action, not a list")

    score_specs = {
        "friction_score": (0, 3),
        "trust_score": (0, 3),
        "clarity_score": (0, 3),
        "language_score": (0, 1),
    }
    scores: dict[str, int] = {}
    for field_name, (minimum, maximum) in score_specs.items():
        try:
            score = int(gate.get(field_name))
        except (TypeError, ValueError):
            failures.append(f"product_gate.{field_name} must be an integer")
            continue
        scores[field_name] = score
        if score < minimum or score > maximum:
            failures.append(f"product_gate.{field_name} must be between {minimum} and {maximum}")
    try:
        total_score = int(gate.get("total_score"))
    except (TypeError, ValueError):
        total_score = -1
        if not is_blank(gate.get("total_score")):
            failures.append("product_gate.total_score must be an integer")
    if scores and total_score >= 0:
        expected_total = sum(scores.values())
        if total_score != expected_total:
            failures.append(f"product_gate.total_score must equal score sum {expected_total}")

    decision = str(gate.get("decision", "")).strip().lower()
    if decision not in {"pass", "fail"} and decision:
        failures.append("product_gate.decision must be PASS or FAIL")
    if total_score >= 0:
        if total_score < 8 and decision == "pass":
            failures.append("product_gate cannot PASS below 8/10")
        if total_score >= 8 and decision == "fail":
            failures.append("product_gate should not FAIL at 8/10 or higher unless stop_condition explains a hard stop")
    verdict = str(packet.get("verdict", "")).strip().lower()
    if verdict in {"build", "keep"} and (total_score < 8 or decision != "pass"):
        failures.append("verdict build/keep requires product_gate PASS at 8/10 or higher")

    copy_text = " ".join(
        str(packet.get(field, ""))
        for field in ["expected_user_visible_outcome", "proposed_change", "notes"]
    ).lower()
    leaked = sorted(term for term in TECHNICAL_USER_COPY_TERMS if term in copy_text)
    if leaked and scores.get("language_score") == 1:
        failures.append(f"product_gate.language_score cannot be 1 while user-facing copy contains technical terms: {leaked}")
    return failures


def validate_first_time_user(packet: dict[str, Any]) -> list[str]:
    failures = []
    evidence_mode = packet.get("evidence_mode")
    if evidence_mode not in {"preflight", "observed"}:
        failures.append("first-time-user evidence_mode must be preflight or observed")
    answers = packet.get("first_time_answers")
    if not isinstance(answers, dict):
        return ["first_time_answers must be an object"]
    for key in [
        "what_is_this_pot_for",
        "what_do_i_do_now",
        "who_blocks_the_group",
        "what_changed_after_i_acted",
        "am_i_done",
    ]:
        if is_blank(answers.get(key)):
            failures.append(f"missing first-time answer: {key}")
    if evidence_mode == "observed":
        evidence_paths = [str(path) for path in packet.get("evidence_paths", []) if isinstance(path, str)]
        observed_evidence = [
            path for path in evidence_paths
            if any(fragment in path.lower() for fragment in ["screenshot", "trace", "test-results", "friend-pilot", "artifacts/"])
        ]
        if not observed_evidence:
            failures.append("observed first-time-user loop requires screenshot, trace, test-results, friend-pilot, or artifacts evidence")
    if evidence_mode == "preflight" and packet.get("verdict") not in {"spike", "defer"}:
        failures.append("preflight first-time-user loop must use verdict spike or defer, not a promotion verdict")
    return failures


def validate_ux_shape(packet: dict[str, Any]) -> list[str]:
    failures = []
    copy_text = " ".join(
        str(packet.get(field, ""))
        for field in ["expected_user_visible_outcome", "copy_review", "proposed_change", "notes"]
    ).lower()
    leaked = sorted(term for term in TECHNICAL_USER_COPY_TERMS if term in copy_text)
    if leaked:
        failures.append(f"user-facing copy still contains technical terms: {leaked}")
    surface_delta = packet.get("surface_delta")
    if not isinstance(surface_delta, dict):
        failures.append("ux-shape requires surface_delta object")
        return failures
    for field_name in [
        "user_action_gained",
        "workflow_effect",
        "friction_added",
        "confusion_removed",
        "keep_change_remove",
    ]:
        if is_blank(surface_delta.get(field_name)):
            failures.append(f"surface_delta missing {field_name}")
    decision = str(surface_delta.get("keep_change_remove", "")).strip().lower()
    if decision and decision not in {"keep", "change", "remove"}:
        failures.append("surface_delta.keep_change_remove must be keep, change, or remove")
    try:
        visible_choices_added = int(surface_delta.get("visible_choices_added", 0))
    except (TypeError, ValueError):
        failures.append("surface_delta.visible_choices_added must be a number")
        visible_choices_added = 0
    workflow_effect = str(surface_delta.get("workflow_effect", "")).lower()
    user_action = str(surface_delta.get("user_action_gained", "")).lower()
    confusion_removed = str(surface_delta.get("confusion_removed", "")).lower()
    combined_delta = " ".join([workflow_effect, user_action, confusion_removed])
    has_real_effect = any(term in combined_delta for term in REAL_WORKFLOW_EFFECT_TERMS)
    decorative_only = any(term in combined_delta or term in copy_text for term in DECORATIVE_ONLY_TERMS)
    if visible_choices_added > 0 and (not has_real_effect or decorative_only):
        failures.append(
            "visible choices must change the user journey: next action, permissions, status, workflow, blockers, payment, confirmation, closeout, receipt, or history"
        )
    if visible_choices_added > 0 and decision == "keep" and not has_real_effect:
        failures.append("surface_delta cannot keep a new visible choice without a real workflow effect")
    return failures


def validate_commitment_kernel(packet: dict[str, Any]) -> list[str]:
    invariant = str(packet.get("state_invariant", ""))
    required_terms = ["claimed", "received", "approved", "closed"]
    missing = [term for term in required_terms if term not in invariant]
    if missing:
        return [f"state_invariant must preserve payment state separation; missing {missing}"]
    commands = packet.get("commands")
    if not isinstance(commands, list) or not any("vitest" in str(command) for command in commands):
        return ["commitment-kernel loop requires a focused vitest command in commands"]
    return []


def validate_native_adapter(packet: dict[str, Any]) -> list[str]:
    failures = []
    refs = packet.get("source_refs")
    if not isinstance(refs, list) or len(refs) == 0:
        failures.append("polkadot-native-adapter loop requires source_refs")
    else:
        officialish = [
            ref for ref in refs
            if isinstance(ref, str)
            and (
                "github.com/paritytech" in ref
                or "docs.polkadot.com" in ref
                or "paritytech.github.io" in ref
                or ref.startswith("docs/")
            )
        ]
        if not officialish:
            failures.append("source_refs must include official/current Parity/Polkadot/repo documentation")
    boundary = str(packet.get("adapter_boundary", "")).lower()
    if "product truth" not in boundary and "evidence" not in boundary and "adapter" not in boundary:
        failures.append("adapter_boundary must state how adapter behavior stays separate from ChopDot truth")
    return failures


def validate_security(packet: dict[str, Any]) -> list[str]:
    failures = []
    public_paths = [
        path for path in normalize_paths(packet.get("evidence_paths"))
        if ".local-private" not in path.parts
    ]
    for path in public_paths:
        if not path.is_file():
            continue
        try:
            content = path.read_text(errors="ignore")
        except UnicodeDecodeError:
            continue
        for pattern in SENSITIVE_PATTERNS:
            if pattern.search(content):
                failures.append(f"possible sensitive data in public evidence: {path.relative_to(REPO_ROOT)}")
                break
    claim_boundary = str(packet.get("claim_boundary", "")).lower()
    if any(term in claim_boundary for term in ["guaranteed", "custody", "protected funds"]) and "not" not in claim_boundary:
        failures.append("claim_boundary contains custody/guarantee language without explicit limitation")
    return failures


def validate_evidence_qa(packet: dict[str, Any]) -> list[str]:
    failures = []
    commands = packet.get("commands")
    if not isinstance(commands, list) or not commands:
        failures.append("evidence-qa loop requires commands")
    for command in commands or []:
        if isinstance(command, str):
            failures.append("commands must be objects with cmd and status, not bare strings")
            continue
        if not isinstance(command, dict):
            failures.append("commands entries must be objects")
            continue
        if is_blank(command.get("cmd")):
            failures.append("command entry missing cmd")
        if command.get("status") not in {"pass", "fail", "skipped", "not_run"}:
            failures.append(f"command '{command.get('cmd')}' has invalid status {command.get('status')}")
    return failures


def validate_decision_editor(packet: dict[str, Any]) -> list[str]:
    failures = []
    next_loop = packet.get("next_loop")
    if next_loop and next_loop not in LOOPS:
        failures.append(f"next_loop must be a known loop id: {next_loop}")
    blocked_gates = packet.get("blocked_gates")
    if not isinstance(blocked_gates, list):
        failures.append("blocked_gates must be a list")
    return failures


LOOP_VALIDATORS = {
    "first-time-user": validate_first_time_user,
    "ux-shape": validate_ux_shape,
    "commitment-kernel": validate_commitment_kernel,
    "polkadot-native-adapter": validate_native_adapter,
    "security-privacy-abuse": validate_security,
    "evidence-qa": validate_evidence_qa,
    "decision-editor": validate_decision_editor,
}


def validate_packet(packet: dict[str, Any]) -> tuple[list[str], list[str]]:
    loop = require_loop(str(packet.get("loop_id", "")))
    failures: list[str] = []
    warnings: list[str] = []
    failures.extend(validate_required_fields(packet, loop))
    failures.extend(validate_pillars(packet))
    failures.extend(validate_evidence_paths(packet))
    failures.extend(validate_product_gate(packet))
    if loop.loop_id in LOOP_VALIDATORS:
        failures.extend(LOOP_VALIDATORS[loop.loop_id](packet))
    for field_name in sorted(loop.recommended_fields):
        if is_blank(packet.get(field_name)):
            warnings.append(f"recommended field is empty: {field_name}")
    return failures, warnings


def markdown_report(packet: dict[str, Any], failures: list[str], warnings: list[str], status: str) -> str:
    evidence = packet.get("evidence_paths", [])
    commands = packet.get("commands", [])
    lines = [
        f"# Loop Run: {packet.get('decision', 'Untitled')}",
        "",
        f"Status: `{status}`",
        f"Loop: `{packet.get('loop_id')}`",
        f"Role: `{packet.get('role', '')}`",
        f"Updated: {now_iso()}",
        "",
        "## User Outcome",
        "",
        str(packet.get("expected_user_visible_outcome", "")),
        "",
        "## Verifier",
        "",
        str(packet.get("verifier", "")),
        "",
        "## Stop Condition",
        "",
        str(packet.get("stop_condition", "")),
        "",
        "## Failures",
        "",
    ]
    lines.extend([f"- {failure}" for failure in failures] or ["- none"])
    lines.extend(["", "## Warnings", ""])
    lines.extend([f"- {warning}" for warning in warnings] or ["- none"])
    lines.extend(["", "## Commands", ""])
    if commands:
        for command in commands:
            if isinstance(command, dict):
                lines.append(f"- `{command.get('status', 'unknown')}` `{command.get('cmd', '')}`")
            else:
                lines.append(f"- `unknown` `{command}`")
    else:
        lines.append("- none")
    lines.extend(["", "## Evidence Paths", ""])
    lines.extend([f"- `{path}`" for path in evidence] or ["- none"])
    lines.append("")
    return "\n".join(lines)


def load_state() -> dict[str, Any]:
    if not STATE_PATH.exists():
        return {"schema_version": 1, "created_at": now_iso(), "runs": 0, "loops": {}}
    return json.loads(STATE_PATH.read_text())


def save_state(state: dict[str, Any]) -> None:
    state["updated_at"] = now_iso()
    write_json(STATE_PATH, state)


def append_decision_log(packet: dict[str, Any], status: str, report_path: Path) -> None:
    DECISION_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": now_iso(),
        "status": status,
        "loop_id": packet.get("loop_id"),
        "decision": packet.get("decision"),
        "verdict": packet.get("verdict"),
        "report_path": str(report_path.relative_to(REPO_ROOT)),
        "next_loop": packet.get("next_loop") or LOOPS[str(packet.get("loop_id"))].follow_up_loop,
    }
    with DECISION_LOG_PATH.open("a") as handle:
        handle.write(json.dumps(entry, sort_keys=True) + "\n")


def update_improvement_backlog(packet: dict[str, Any], failures: list[str], warnings: list[str]) -> None:
    if not failures and not warnings:
        return
    IMPROVEMENT_BACKLOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not IMPROVEMENT_BACKLOG_PATH.exists():
        IMPROVEMENT_BACKLOG_PATH.write_text("# ChopDot Loop Improvement Backlog\n\n")
    with IMPROVEMENT_BACKLOG_PATH.open("a") as handle:
        handle.write(f"## {now_iso()} — {packet.get('loop_id')} — {packet.get('decision')}\n\n")
        for failure in failures:
            handle.write(f"- failure: {failure}\n")
        for warning in warnings:
            handle.write(f"- warning: {warning}\n")
        handle.write("\n")


def record_state(packet: dict[str, Any], status: str, failures: list[str], warnings: list[str]) -> None:
    state = load_state()
    state["runs"] = int(state.get("runs", 0)) + 1
    loops = state.setdefault("loops", {})
    loop_state = loops.setdefault(packet["loop_id"], {"runs": 0, "passes": 0, "fails": 0, "last_decision": None})
    loop_state["runs"] += 1
    loop_state["last_decision"] = packet.get("decision")
    loop_state["last_status"] = status
    loop_state["last_run_at"] = now_iso()
    loop_state["last_failures"] = failures
    loop_state["last_warnings"] = warnings
    if status == "pass":
        loop_state["passes"] += 1
    else:
        loop_state["fails"] += 1
    save_state(state)


def run_commands(packet: dict[str, Any], execute: bool) -> dict[str, Any]:
    commands = packet.get("commands")
    if not execute or not isinstance(commands, list):
        return packet
    updated = []
    for command in commands:
        if isinstance(command, str):
            cmd = command
        elif isinstance(command, dict):
            cmd = str(command.get("cmd", ""))
        else:
            updated.append(command)
            continue
        if not cmd.strip():
            updated.append({"cmd": cmd, "status": "fail", "output": "empty command"})
            continue
        result = subprocess.run(
            shlex.split(cmd),
            cwd=REPO_ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        updated.append(
            {
                "cmd": cmd,
                "status": "pass" if result.returncode == 0 else "fail",
                "exit_code": result.returncode,
                "output_tail": result.stdout[-4000:],
            }
        )
    packet["commands"] = updated
    packet["updated_at"] = now_iso()
    return packet


def cmd_list(_: argparse.Namespace) -> int:
    for loop in LOOPS.values():
        print(f"{loop.loop_id}: {loop.name} ({loop.role})")
    return 0


def cmd_new(args: argparse.Namespace) -> int:
    packet = packet_template(args.loop, args.decision)
    if args.user_job:
        packet["user_job"] = args.user_job
    packet_id = f"{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}-{slugify(args.decision)}"
    out_path = Path(args.out) if args.out else RUN_ROOT / packet_id / "packet.json"
    if not out_path.is_absolute():
        out_path = REPO_ROOT / out_path
    write_json(out_path, packet)
    print(out_path.relative_to(REPO_ROOT))
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    packet_path = Path(args.packet)
    if not packet_path.is_absolute():
        packet_path = REPO_ROOT / packet_path
    packet = load_json(packet_path)
    failures, warnings = validate_packet(packet)
    for warning in warnings:
        print(f"warning: {warning}")
    if failures:
        for failure in failures:
            print(f"failure: {failure}")
        return 1
    print("packet valid")
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    packet_path = Path(args.packet)
    if not packet_path.is_absolute():
        packet_path = REPO_ROOT / packet_path
    packet = load_json(packet_path)
    packet = run_commands(packet, execute=args.execute_commands)
    failures, warnings = validate_packet(packet)
    status = "pass" if not failures else "fail"
    run_id = f"{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}-{slugify(str(packet.get('decision', 'loop-run')))}"
    run_dir = RUN_ROOT / run_id
    packet_out = run_dir / "packet.resolved.json"
    report_out = run_dir / "report.md"
    write_json(packet_out, packet)
    report_out.parent.mkdir(parents=True, exist_ok=True)
    report_out.write_text(markdown_report(packet, failures, warnings, status))
    record_state(packet, status, failures, warnings)
    append_decision_log(packet, status, report_out)
    update_improvement_backlog(packet, failures, warnings)
    print(f"status: {status}")
    print(f"report: {report_out.relative_to(REPO_ROOT)}")
    return 0 if status == "pass" else 1


def cmd_state(_: argparse.Namespace) -> int:
    state = load_state()
    print(json.dumps(state, indent=2, sort_keys=True))
    return 0


def cmd_selftest(_: argparse.Namespace) -> int:
    valid = {
        "schema_version": 1,
        "loop_id": "evidence-qa",
        "loop_name": "Evidence And QA Loop",
        "role": "verifier",
        "decision": "Selftest valid packet",
        "user_job": "A user sees proof-backed status.",
        "expected_user_visible_outcome": "The user sees the record close with readable evidence.",
        "verifier": "Command status is pass and evidence path exists.",
        "stop_condition": "Command fails or evidence is missing.",
        "commands": [{"cmd": "python3 -m py_compile scripts/chopdot_loop_runner.py", "status": "pass"}],
        "evidence_paths": ["docs/CHOPDOT_OPERATING_LOOPS.md"],
        "verdict": "keep",
    }
    invalid = {
        "schema_version": 1,
        "loop_id": "ux-shape",
        "loop_name": "UX Shape Loop",
        "role": "product designer",
        "decision": "Selftest invalid packet",
        "user_job": "A user sees next action.",
        "route_or_screen": "/pots",
        "product_gate": {
            "user_journey": "I am Mina, I need to capture a dinner payment, so the group can repay me without confusion.",
            "one_next_action": "Add receipt",
            "friction_score": 2,
            "trust_score": 2,
            "clarity_score": 2,
            "language_score": 1,
            "total_score": 7,
            "decision": "FAIL",
        },
        "expected_user_visible_outcome": "The user sees kernel adapter rail details.",
        "verifier": "Technical language is rejected.",
        "stop_condition": "Technical language appears.",
        "evidence_paths": ["docs/CHOPDOT_OPERATING_LOOPS.md"],
        "surface_delta": {
            "visible_choices_added": 0,
            "user_action_gained": "The user can see the next action.",
            "workflow_effect": "The next action is clearer.",
            "friction_added": "None.",
            "confusion_removed": "Technical state is hidden.",
            "evidence_of_removed_friction": "Selftest fixture.",
            "keep_change_remove": "change",
        },
        "verdict": "spike",
    }
    decorative_invalid = {
        "schema_version": 1,
        "loop_id": "ux-shape",
        "loop_name": "UX Shape Loop",
        "role": "product designer",
        "decision": "Selftest decorative choice packet",
        "user_job": "A user creates a pot faster.",
        "route_or_screen": "/pots/create",
        "product_gate": {
            "user_journey": "I am Mina, I need to create a trip pot, so the group can track vacation payments.",
            "one_next_action": "Create pot",
            "friction_score": 2,
            "trust_score": 2,
            "clarity_score": 2,
            "language_score": 1,
            "total_score": 7,
            "decision": "FAIL",
        },
        "expected_user_visible_outcome": "The user can choose a trip preset.",
        "verifier": "Decorative choice is rejected because it changes defaults only.",
        "stop_condition": "A visible choice does not change the journey.",
        "evidence_paths": ["docs/CHOPDOT_OPERATING_LOOPS.md"],
        "surface_delta": {
            "visible_choices_added": 1,
            "user_action_gained": "No new action; it changes the pot name.",
            "workflow_effect": "Defaults only.",
            "friction_added": "One more decision before the user creates a pot.",
            "confusion_removed": "None.",
            "evidence_of_removed_friction": "Selftest fixture.",
            "keep_change_remove": "keep",
        },
        "verdict": "spike",
    }
    valid_ux = {
        "schema_version": 1,
        "loop_id": "ux-shape",
        "loop_name": "UX Shape Loop",
        "role": "product designer",
        "decision": "Selftest valid journey-changing UX packet",
        "user_job": "A payer records a purchase at checkout.",
        "route_or_screen": "/pots",
        "product_gate": {
            "user_journey": "I am Mina, I need to record a checkout payment, so the group can repay me while the context is fresh.",
            "one_next_action": "Record payment",
            "friction_score": 3,
            "trust_score": 2,
            "clarity_score": 2,
            "language_score": 1,
            "total_score": 8,
            "decision": "PASS",
        },
        "expected_user_visible_outcome": "The payer sees Record at checkout and can add the purchase immediately.",
        "verifier": "The visible choice changes the next action and payment capture workflow.",
        "stop_condition": "The button only renames a pot or changes defaults.",
        "evidence_paths": ["docs/CHOPDOT_OPERATING_LOOPS.md"],
        "surface_delta": {
            "visible_choices_added": 1,
            "user_action_gained": "The user can start the next action: record a checkout payment.",
            "workflow_effect": "The payment capture workflow starts from the pot screen.",
            "friction_added": "One visible action, replacing a less specific action.",
            "confusion_removed": "The user knows the action is for checkout capture.",
            "evidence_of_removed_friction": "Selftest fixture.",
            "keep_change_remove": "change",
        },
        "verdict": "spike",
    }
    valid_failures, _valid_warnings = validate_packet(valid)
    invalid_failures, _invalid_warnings = validate_packet(invalid)
    decorative_failures, _decorative_warnings = validate_packet(decorative_invalid)
    valid_ux_failures, _valid_ux_warnings = validate_packet(valid_ux)
    below_gate_invalid = {
        **valid_ux,
        "decision": "Selftest below product gate packet",
        "product_gate": {
            "user_journey": "I am Mina, I need to record a checkout payment, so the group can repay me while the context is fresh.",
            "one_next_action": "Record payment",
            "friction_score": 1,
            "trust_score": 2,
            "clarity_score": 2,
            "language_score": 1,
            "total_score": 6,
            "decision": "FAIL",
        },
        "verdict": "build",
    }
    below_gate_failures, _below_gate_warnings = validate_packet(below_gate_invalid)
    if valid_failures:
        print("selftest failed: valid packet did not pass")
        for failure in valid_failures:
            print(f"- {failure}")
        return 1
    if valid_ux_failures:
        print("selftest failed: valid UX packet did not pass")
        for failure in valid_ux_failures:
            print(f"- {failure}")
        return 1
    if not any("technical terms" in failure for failure in invalid_failures):
        print("selftest failed: invalid UX packet did not fail technical-copy gate")
        print(invalid_failures)
        return 1
    if not any("visible choices must change the user journey" in failure for failure in decorative_failures):
        print("selftest failed: decorative UX packet did not fail journey-effect gate")
        print(decorative_failures)
        return 1
    if not any("verdict build/keep requires product_gate PASS" in failure for failure in below_gate_failures):
        print("selftest failed: below-threshold product gate did not block build verdict")
        print(below_gate_failures)
        return 1
    print("selftest passed")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run ChopDot operating loops")
    sub = parser.add_subparsers(dest="command", required=True)

    list_parser = sub.add_parser("list", help="List loop ids")
    list_parser.set_defaults(func=cmd_list)

    new_parser = sub.add_parser("new", help="Create a loop packet")
    new_parser.add_argument("--loop", required=True, choices=sorted(LOOPS))
    new_parser.add_argument("--decision", required=True)
    new_parser.add_argument("--user-job")
    new_parser.add_argument("--out")
    new_parser.set_defaults(func=cmd_new)

    validate_parser = sub.add_parser("validate", help="Validate a loop packet")
    validate_parser.add_argument("packet")
    validate_parser.set_defaults(func=cmd_validate)

    run_parser = sub.add_parser("run", help="Validate, optionally execute commands, and record loop outcome")
    run_parser.add_argument("packet")
    run_parser.add_argument("--execute-commands", action="store_true")
    run_parser.set_defaults(func=cmd_run)

    state_parser = sub.add_parser("state", help="Print loop state")
    state_parser.set_defaults(func=cmd_state)

    selftest_parser = sub.add_parser("selftest", help="Run built-in runner self-tests")
    selftest_parser.set_defaults(func=cmd_selftest)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
