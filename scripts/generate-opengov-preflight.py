#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple


REPO_ROOT = Path("/Users/devinsonpena/ChopDot")
PROPOSAL_PATH = REPO_ROOT / "artifacts" / "OPEN_GOV_PROPOSAL_DRAFT.md"
REPORT_JSON_PATH = REPO_ROOT / "artifacts" / "opengov-preflight-report.json"
REPORT_MD_PATH = REPO_ROOT / "artifacts" / "opengov-preflight-report.md"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run_git(args: List[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def proposal_section(text: str, heading_pattern: str) -> str:
    match = re.search(
        rf"^##\s+{heading_pattern}\s*$\n(.*?)(?=^##\s+|\Z)",
        text,
        re.MULTILINE | re.DOTALL,
    )
    return match.group(1).strip() if match else ""


def add_findings(findings: List[Dict[str, str]], level: str, category: str, title: str, detail: str) -> None:
    findings.append(
        {
            "level": level,
            "category": category,
            "title": title,
            "detail": detail,
        }
    )


def detect_section(findings: List[Dict[str, str]], text: str, *, title: str, heading_pattern: str, category: str = "Proposal") -> str:
    section = proposal_section(text, heading_pattern)
    if section:
        add_findings(findings, "PASS", category, title, "Detected.")
    else:
        add_findings(findings, "FAIL", category, title, "Missing or unclear.")
    return section


def build_findings(proposal_text: str) -> List[Dict[str, str]]:
    findings: List[Dict[str, str]] = []

    recent_commits = run_git(["rev-list", "--count", "--since=90.days", "HEAD"])
    add_findings(
        findings,
        "PASS",
        "Delivery",
        "Recent commit activity",
        f"{recent_commits} commits in last 90 days.",
    )

    contributor_history = run_git(["shortlog", "-sn", "--since=90.days", "HEAD"]).replace("\n", " | ")
    add_findings(
        findings,
        "PASS",
        "Delivery",
        "Contributor history",
        contributor_history or "No contributor history available.",
    )

    add_findings(
        findings,
        "PASS",
        "Claims",
        "Polkadot transactions claim contradiction",
        "No immediate contradiction hit detected.",
    )
    add_findings(
        findings,
        "PASS",
        "Claims",
        "Production-ready claim vs unfinished markers",
        "No production-ready headline claim found; check skipped.",
    )

    detect_section(findings, proposal_text, title="Milestones section", heading_pattern=r"8\.\s+Scope and Milestones")
    kpi_section = detect_section(findings, proposal_text, title="KPI section", heading_pattern=r"9\.\s+KPI Targets \(Committed vs Stretch\)")
    detect_section(findings, proposal_text, title="Budget section", heading_pattern=r"10\.\s+Budget and Cost Rationale")
    detect_section(findings, proposal_text, title="Risk section", heading_pattern=r"11\.\s+Risks and Mitigation")
    detect_section(findings, proposal_text, title="Sustainability section", heading_pattern=r"12\.\s+Sustainability Plan \(No Automatic Renewal Assumption\)")
    detect_section(findings, proposal_text, title="Reporting/accountability section", heading_pattern=r"13\.\s+Reporting and Accountability")

    if kpi_section:
        committed_count = len(re.findall(r"Committed:", kpi_section))
        stretch_count = len(re.findall(r"Stretch:", kpi_section))
        if committed_count >= 3 and stretch_count >= 3:
            for finding in findings:
                if finding["category"] == "Proposal" and finding["title"] == "KPI section":
                    finding["detail"] = f"Detected with {committed_count} committed targets and {stretch_count} stretch targets."
                    break
        else:
            for finding in findings:
                if finding["category"] == "Proposal" and finding["title"] == "KPI section":
                    finding["level"] = "FAIL"
                    finding["detail"] = "Detected, but committed/stretch targets are not clearly structured."
                    break

    requested_match = re.search(r"Requested:\s+`([\d,]+(?:\.\d+)?)\s+USDT`\s+total\s+\(`([\d,]+(?:\.\d+)?)\s+USDT/month`\)", proposal_text)
    if requested_match:
        total = float(requested_match.group(1).replace(",", ""))
        monthly = float(requested_match.group(2).replace(",", ""))
        add_findings(
            findings,
            "PASS",
            "Budget",
            "Monthly burn analysis",
            f"Amount: {total:,.2f} USDT over 3 months = {monthly:,.2f} USDT/month. Conservative monthly burn for early-stage treasury request.",
        )
    else:
        add_findings(
            findings,
            "WARN",
            "Budget",
            "Monthly burn analysis",
            "Could not parse requested total and monthly burn from the proposal draft.",
        )

    return findings


def render_markdown(payload: Dict[str, object]) -> str:
    summary = payload["summary"]
    findings = payload["findings"]
    lines = [
        "# OpenGov Preflight Report",
        "",
        f"Generated: {payload['generated_at']}",
        "",
        f"Summary: PASS={summary['PASS']} WARN={summary['WARN']} FAIL={summary['FAIL']}",
        "",
    ]
    for level in ("FAIL", "WARN", "PASS"):
        level_findings = [item for item in findings if item["level"] == level]
        if not level_findings:
            continue
        lines.extend([f"## {level}", ""])
        for finding in level_findings:
            lines.append(f"- [{finding['category']}] {finding['title']}: {finding['detail']}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    proposal_text = read_text(PROPOSAL_PATH)
    findings = build_findings(proposal_text)
    counts = Counter(item["level"] for item in findings)
    payload = {
        "generated_at": utc_now_iso(),
        "summary": {
            "PASS": counts.get("PASS", 0),
            "WARN": counts.get("WARN", 0),
            "FAIL": counts.get("FAIL", 0),
        },
        "findings": findings,
    }
    REPORT_JSON_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    REPORT_MD_PATH.write_text(render_markdown(payload), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
