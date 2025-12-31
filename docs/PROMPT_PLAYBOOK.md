# ChopDot Prompt Playbook (Canonical)

Purpose: One working reference for how we scope, analyze, and execute work.
Rule: Before any execution, run this playbook unless the task is trivial.
Operating mode: When you give a single request, I will run the full playbook and then present an approval summary before execution. You only need to approve or give feedback.

## Execution workflow (always)

1. Preflight
2. Multi-perspective analysis (when applicable)
3. Plan and constraints
4. Implement
5. Verify
6. Report

## 1) Preflight (must answer before acting)

Goal:
- What is the exact outcome?

Scope:
- In-scope screens/files/flows
- Out-of-scope items

Constraints:
- No breaking changes?
- Preserve existing patterns?
- No new deps?

Risk:
- Data migrations or DB writes?
- Auth/finance edge cases?

Definition of done:
- How we know it worked

Verification:
- Which checks/tests to run

Deliverables:
- Code, docs, checklist, summary

## 2) Multi-perspective analysis

Use for features, refactors, UX changes, or anything user-facing.

Core perspectives:
- Engineer (feasibility, integration, minimal change plan)
- QA (edge cases, acceptance criteria, regressions)

Add as needed:
- Product (user impact, acceptance criteria)
- Architect (boundaries, contracts)
- Performance (latency, scale)
- Security (auth/data handling)

Request classification quick map:
- New feature: Product + Engineer + QA
- Bug fix: QA + Engineer
- Refactor: Architect + Engineer + QA
- UI/UX change: Product + Engineer + QA
- Performance: Engineer + Performance + QA
- Financial precision: Engineer + QA (Decimal/minor units)

Template:

Perspective:
Context:
- Request:
- Related files:
- Current pattern:

Questions:
1.
2.
3.

Deliverables:
- [ ]
- [ ]

Constraints:
- List constraints from this playbook

Synthesis checklist:
- Combine findings
- Resolve conflicts
- Identify risks
- Decide minimal plan
- Define acceptance criteria

## 3) Guardrails (default constraints)

Engineering constraints:
- Fix root cause, avoid band-aids.
- Keep changes minimal and scoped.
- Preserve existing architecture and patterns.
- No new dependencies unless explicitly approved.
- Keep wallet/Polkadot/settlement logic unchanged unless requested.
- Maintain Decimal.js + minor-units for money logic.

Product constraints:
- Avoid breaking UX.
- Preserve feature flags and defaults.
- Keep onboarding flows stable.

## 4) Prompt templates

Minimal prompt template:

Goal:
Scope:
Out-of-scope:
Constraints:
Definition of done:
Verification:
Deliverables:

Bug investigation:
Problem:
Steps to reproduce:
Expected:
Actual:
Context (files/functions):
Task:
- Identify root cause
- Propose minimal fix
- List files to modify
- Rollback strategy

Feature request:
As a [user],
I want [action],
So that [benefit].

Acceptance criteria:
- [ ]
- [ ]

Technical constraints:
- Must use [pattern/service]
- Cannot change [area]

QA test plan:
Scenarios:
1. Happy path
2. Edge case
3. Error case
4. Perf case

## 5) Verification rules

- Always run type-check.
- Run tests when logic is touched.
- Note any warnings or skipped checks.

## 6) Reporting format

- What changed and why (brief)
- Files touched
- Tests run
- Risks or manual steps

## References (source docs)

- docs/PROMPT_GUIDE.md
- docs/PROMPT_GUIDE_REFERENCE.md
- docs/MULTI_PERSPECTIVE_ANALYSIS_WORKFLOW.md
- docs/ARCHITECTURAL_AUDIT.md
