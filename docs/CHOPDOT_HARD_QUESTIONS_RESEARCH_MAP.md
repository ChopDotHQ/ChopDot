# ChopDot Hard Questions Research Map

<discovery_plan>
- Name the hard questions ChopDot must answer to justify its product thesis
- Connect each question to evidence, history, behavior, security, privacy, and future development
- Prevent the product from drifting into trust claims it has not earned
</discovery_plan>

## FACTS

- ChopDot wants to reduce the lifetime pain of trust in shared financial commitments.
- The intended user fear includes:
  - getting burned
  - getting robbed
  - getting hacked
  - getting swindled
  - getting tricked
  - getting drained
  - being abandoned by a group after fronting money or trust
- The current product direction is still coordination-first and non-custodial.
- Current docs already establish that ChopDot has not yet proven the full end-state.

## INFERENCES

- The serious research question is not "can we build a nicer expense app?"
- The serious research question is:
  - can ChopDot reduce trust failure in financial commitments without creating a worse surveillance, custody, exclusion, or abuse system?

## ASSUMPTIONS

- ChopDot should prefer minimal disclosure over blanket KYC.
- Optional higher-assurance identity or personhood may be useful in specific contexts.
- The product must work across cultural settings without assuming one universal trust model.

## Core Research Question

Can ChopDot create a practical shared commitment system where people can commit, access, distribute, manage, secure, and close financial obligations with less fear of betrayal, fraud, coercion, or technical failure?

## Hard Questions

## 1. Trust Mechanism Question

What mechanisms actually reduce trust failure?

Subquestions:

- when does visibility help?
- when does visibility create pressure, shame, or privacy risk?
- when do deposits improve follow-through?
- when do deposits reduce participation or create resentment?
- when does social proof help?
- when does social proof enable herd behavior or scams?
- when does reputation help?
- when does reputation become exclusionary or gameable?

Evidence needed:

- behavioral research
- historical savings-group research
- live ChopDot experiments
- pilot observation

## 2. No-KYC / Optional-KYC Question

How far can ChopDot go without KYC while still reducing bots, scams, and trust abuse?

Subquestions:

- which flows can remain pseudonymous?
- which flows only need invitation or bounded-group trust?
- when is proof of personhood enough?
- when is verifiable credential proof useful?
- when does law or risk require stronger verification?
- what should stay optional?

Evidence needed:

- identity standards
- proof-of-personhood research
- privacy-preserving credential research
- legal/compliance review
- abuse modeling

## 3. Personhood And Anti-Bot Question

How can ChopDot reduce fake participants and automated abuse without forcing users into invasive identity disclosure?

Subquestions:

- can invitation graphs solve enough of the early problem?
- can rate limits and bounded groups solve enough of the early problem?
- can proof of personhood help later?
- what are the risks of biometric, social-graph, or credential-based personhood?
- how do agents participate without impersonating humans?

Evidence needed:

- Sybil-resistance research
- proof-of-personhood literature
- verifiable credentials standards
- agent-auth research
- adversarial testing

## 4. Security And Drain Question

How does ChopDot avoid becoming a surface where people get tricked into unsafe financial action?

Subquestions:

- can a malicious organizer manipulate group trust?
- can a participant fake paid/confirmed status?
- can a link be abused?
- can an agent approve or prepare unsafe action?
- can a UI imply safety that does not exist?
- what state should be impossible?

Evidence needed:

- threat modeling
- invariant testing
- protocol security references
- phishing and wallet-drain pattern review
- incident analysis from crypto and fintech

## 5. Cultural Fit Question

Which trust mechanisms travel across cultures, and which must remain locally adaptable?

Subquestions:

- how do chamas, tandas, susu, stokvels, ROSCAs, ASCAs, and VSLAs differ?
- who has authority in each setting?
- what is visible?
- what is shameful?
- what is considered fair?
- when is formal proof less trusted than local reputation?
- when is local reputation dangerous or exclusionary?

Evidence needed:

- ethnographic and development finance research
- pilot interviews
- local partner input
- field notes

## 6. Misuse And Abuse Question

How will people use ChopDot in ways we did not intend?

Subquestions:

- fake commitments
- coercive commitments
- scam groups
- pressure to pay
- organizer capture
- social punishment
- privacy leaks
- fraud laundering through legitimacy signals

Evidence needed:

- adversarial protocol testing
- user safety research
- fraud and scam pattern review
- pilot incident logs

## 7. Economic Sustainability Question

Can ChopDot become essential and neutral without turning into a surveillance-heavy financial gatekeeper?

Subquestions:

- what remains open?
- what is monetized?
- what should never be monetized?
- what value is scarce and ethical to charge for?
- what metrics prove ecosystem value?
- what keeps the system alive without distorting incentives?

Evidence needed:

- open-system sustainability research
- ecosystem funding case studies
- pricing validation
- operator interviews

## 8. Future Development Question

Which future technologies should ChopDot prepare for now without overbuilding?

Subquestions:

- wallet-centric identity
- verifiable credentials
- selective disclosure
- proof of personhood
- ZK proofs
- agent authority
- Polkadot identity/governance/asset surfaces
- privacy-preserving analytics

Evidence needed:

- standards tracking
- protocol roadmap tracking
- architecture stress tests
- adapter readiness reviews

## Research Lanes

## Lane 1: Historical And Cultural Trust Systems

Purpose:

- understand how real groups coordinate pooled obligation and release decisions

Outputs:

- comparative mechanisms table
- cultural risk notes
- product rules

## Lane 2: Behavioral And Game-Theory Mechanisms

Purpose:

- test what makes commitments credible and fair

Outputs:

- experiments
- falsifiable hypotheses
- product mechanism decisions

## Lane 3: Privacy, Personhood, And Identity

Purpose:

- find the minimum verification needed per risk level

Outputs:

- assurance ladder
- optional verification policy
- no-KYC boundary map

## Lane 4: Security, Misuse, And Anti-Abuse

Purpose:

- prevent ChopDot from becoming a trust theater or abuse amplifier

Outputs:

- misuse cases
- invariants
- threat model
- incident taxonomy

## Lane 5: Future Infrastructure And Ecosystem Fit

Purpose:

- keep ChopDot compatible with future rails without losing the kernel

Outputs:

- adapter map
- future stress matrix updates
- ecosystem impact metrics

## Evidence Standard

Each lane must produce:

- source ledger
- claim extraction
- consensus
- disagreements
- unresolved gaps
- ChopDot implication
- experiment or verification path

## Decision

ChopDot's research program should now be organized around hard questions, not generic topics.

## Why

Because the product thesis is only serious if it can survive:

- human behavior
- cultural variation
- privacy constraints
- abuse pressure
- security failures
- future technical change

## Next Move

Run the first deep research pass on:

- privacy, personhood, and no-KYC trust

because it directly affects:

- onboarding
- safety
- anti-bot design
- cultural fit
- future agent participation
