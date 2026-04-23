# AutoBots Research OS Lessons For ChopDot

<discovery_plan>
- Inspect AutoBots for reusable research, evidence, and review machinery
- Extract only what strengthens ChopDot's research-vs-reality discipline
- Define how ChopDot should use these patterns without importing unnecessary system complexity
</discovery_plan>

## FACTS

- AutoBots contains reusable research and rigor workflows in:
  - `/Users/devinsonpena/Documents/AutoBots/baseline_skills/research-grounding.md`
  - `/Users/devinsonpena/Documents/AutoBots/baseline_skills/research-literature-review.md`
  - `/Users/devinsonpena/Documents/AutoBots/baseline_skills/research-deep-brief.md`
  - `/Users/devinsonpena/Documents/AutoBots/baseline_skills/adversarial-protocol-testing.md`
  - `/Users/devinsonpena/Documents/AutoBots/docs/research_os_control_point_checklist.md`
  - `/Users/devinsonpena/Documents/AutoBots/docs/research_os_status.md`
  - `/Users/devinsonpena/Documents/AutoBots/docs/upgrade_rubric.md`
  - `/Users/devinsonpena/Documents/AutoBots/docs/experiment_log.md`
  - `/Users/devinsonpena/Documents/AutoBots/docs/agentops_web3_rigor_plan.md`
  - `/Users/devinsonpena/Documents/AutoBots/docs/blockchain_security_reference_baseline.md`
  - `/Users/devinsonpena/Documents/AutoBots/docs/hci_foundations_reference_baseline.md`
- AutoBots also contains `proofmap`, a research system that is built around:
  - source ingestion
  - claim extraction
  - assumption extraction
  - evidence links
  - support checking
  - benchmark and holdout evaluation
- AutoBots' Research OS status explicitly warns that visible-fixture strength is not the same as holdout-grade reliability.

## INFERENCES

- ChopDot should reuse AutoBots' research control-point model.
- ChopDot should not blindly import AutoBots tooling before the research questions and evidence model are clear.
- The strongest near-term value is process adoption:
  - entry gates
  - source ledgers
  - claim/evidence mapping
  - disconfirmation logging
  - adversarial review
  - durable updates

## ASSUMPTIONS

- ChopDot's research program should stay product-facing, not become academic sprawl.
- AutoBots can later supply tooling, but the first need is a disciplined research workflow.

## What To Adopt Now

## 1. Research Control Points

AutoBots rule:

- name the lane
- name the bounded slice
- name what is not changing
- verify the exact behavior before trust increases
- update durable state after the result

ChopDot adaptation:

- every research pass must define:
  - research question
  - evidence class
  - source standard
  - falsification condition
  - product implication
  - next experiment

## 2. Grounding Before Synthesis

AutoBots rule:

- structural claims require repo or source evidence
- unsupported claims are marked speculative

ChopDot adaptation:

- no claim about human behavior, identity, privacy, anti-abuse, economics, or future infrastructure should enter doctrine unless it is:
  - externally backed
  - ChopDot-tested
  - or explicitly labeled as inference

## 3. Literature Review Contract

AutoBots rule:

- question
- scope
- sources
- consensus
- disagreements
- open questions
- local implications

ChopDot adaptation:

- every serious research brief should use:
  - `Question`
  - `Scope`
  - `Source Ledger`
  - `Consensus`
  - `Disagreements`
  - `Unresolved Gaps`
  - `ChopDot Implications`
  - `Claims Ledger Updates`

## 4. Deep Brief Contract

AutoBots rule:

- plan before synthesis
- source ledger
- verified findings
- tentative findings
- unresolved gaps

ChopDot adaptation:

- use this for large topics such as:
  - no-KYC and optional personhood
  - privacy-preserving trust
  - cultural commitment systems
  - anti-scam and anti-drain design
  - future identity and agent participation

## 5. Upgrade Rubric

AutoBots rule:

- no upgrade without hypothesis, target metric, bounded experiment, and rollback path

ChopDot adaptation:

- no new trust mechanism should be adopted without:
  - hypothesis
  - risk
  - metric
  - experiment
  - fallback

This applies to:

- deposits
- proof of personhood
- optional KYC
- reputation
- verified credentials
- agents
- privacy proofs
- settlement rails

## 6. Adversarial Protocol Testing

AutoBots rule:

- identify invariants
- hypothesize violations
- simulate hostile sequencing
- report exploit vectors and mitigations

ChopDot adaptation:

- every trust feature needs misuse review:
  - how can users fake commitment?
  - how can organizers abuse authority?
  - how can bots farm incentives?
  - how can agents be tricked into unsafe action?
  - how can privacy tools hide fraud?
  - how can proof language mislead users?

## 7. Reference Baselines

AutoBots already separates:

- HCI foundations
- quant UX and experimentation
- dataviz/dashboard references
- blockchain security
- product UX references

ChopDot adaptation:

- build equivalent source baselines for:
  - group financial commitment history
  - behavioral economics and trust
  - privacy-preserving identity
  - proof of personhood and Sybil resistance
  - no-KYC / optional-KYC compliance boundaries
  - protocol security and anti-abuse
  - cultural/local trust systems

## What Not To Import Yet

Do not import the full AutoBots/ProofMap system into ChopDot yet as a dependency.

Reasons:

- ChopDot first needs research question clarity
- ProofMap itself is still not fully holdout-grade
- adding tooling too early could create process drag

Adopt the discipline first.
Adopt tooling later if repeated research work proves the need.

## Practical ChopDot Research OS Shape

ChopDot should treat research as four linked files:

1. research question map
2. source ledger
3. claims/evidence ledger
4. experiment/result log

Only then should it consider deeper automation:

- claim extraction
- evidence retrieval
- support-checking
- grounded drafting

## Decision

ChopDot should adopt AutoBots' control-point and evidence-mapping discipline now, while deferring full ProofMap tooling adoption until the research workflow repeats enough to justify it.

## Why

Because the immediate risk is not lack of tools.
It is unsupported belief entering the product faster than evidence.

## Next Move

Use this doc with:

- [CHOPDOT_HARD_QUESTIONS_RESEARCH_MAP.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/CHOPDOT_HARD_QUESTIONS_RESEARCH_MAP.md)
- [PRIVACY_PERSONHOOD_AND_NO_KYC_RESEARCH_PROGRAM.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/PRIVACY_PERSONHOOD_AND_NO_KYC_RESEARCH_PROGRAM.md)
