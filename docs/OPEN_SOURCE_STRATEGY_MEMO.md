# Open Source Strategy Memo

<discovery_plan>
- Define a realistic ChopDot open-source posture
- Separate public code from private company and operator material
- Recommend a license and repo structure that fit the current stage
</discovery_plan>

## FACTS

- ChopDot currently wants:
  - openness as a real product and ecosystem value
  - protection against low-effort cloning
  - freedom to keep internal company materials private
- ChopDot's current moat is not code secrecy.
- ChopDot's current moat is more likely to come from:
  - shared commitment semantics
  - execution speed
  - user learning
  - pricing learning
  - pilot relationships
  - ecosystem positioning
  - brand trust
- The current company posture is:
  - coordination first
  - proof second
  - no custody-first business
  - subscription-led now
  - API/platform later

## INFERENCES

- ChopDot should not try to make "everything public" the default.
- ChopDot should also not pretend it can be "open source" while quietly relying on repo ambiguity instead of explicit decisions.
- The right move is:
  - make the public/private boundary explicit
  - choose a license deliberately
  - protect the brand separately
  - keep the moat in execution and distribution, not secrecy theater

## ASSUMPTIONS

- The repo is public now or is intended to be public.
- The team wants real openness on the product/core system, not just marketing language.
- This is strategic guidance, not legal advice.

## 1. The Core Decision

There are three clean postures:

### Option A: True open source

Public code under an OSI-compliant license.

Best if:
- ChopDot wants openness to be real
- the moat is not license restriction
- the team is comfortable competing on execution, brand, and distribution

### Option B: Open core

Public community/core repo plus private commercial/operator layers.

Best if:
- ChopDot wants a public product core
- paid value will live in advanced workflows, managed service, or enterprise/operator features

### Option C: Source-available

Code is visible, but commercial use is restricted by license.

Best if:
- protection against hosted/commercial cloning matters more than strict OSI openness

## 2. Recommended ChopDot Posture

Recommended now:

- **public core**
- **private company surface**
- **protected brand**
- **deliberate license choice**

This is effectively:

- open-source or open-core in product posture
- private in operator/company posture
- trademark-protected in brand posture

## 3. Public vs Private Boundary

## Public

These should stay public:

- core app code
- shared commitment kernel
- public architecture docs
- public product direction docs
- contributor-facing implementation docs
- public research that improves the product and ecosystem understanding

Why:

- these help contributors, users, reviewers, and ecosystem credibility
- these are the parts where openness helps the product

## Private

These should move out of the public surface:

- investor notes
- raise strategy
- partner pipeline
- pilot candidate lists
- pricing interview notes
- raw user interview notes
- internal financial sensitivities and negotiation thinking
- internal legal/compliance working notes
- sensitive threat and abuse playbooks
- internal execution scorecards
- private operating decisions not needed by contributors

Why:

- these are not product openness
- these are company-operational materials

## Definitely private

- secrets
- credentials
- production topology details
- fraud heuristics
- abuse response procedures
- internal security playbooks

## 4. License Options For ChopDot

## MIT

Good:
- maximally permissive
- easiest for adoption

Bad:
- easiest for commercial cloning
- weak protection for a young product company

Assessment for ChopDot:
- probably too permissive right now

## AGPLv3

Good:
- real open-source license
- stronger protection against closed hosted modifications
- aligned with network/software openness

Bad:
- some commercial adopters may hesitate
- still allows forks if they comply

Assessment for ChopDot:
- strongest candidate if the goal is genuine openness with some hosted-service reciprocity

## Apache 2.0

Good:
- permissive and business-friendly
- explicit patent language

Bad:
- still easy to clone commercially

Assessment for ChopDot:
- cleaner than MIT in some ways, but still probably too permissive if anti-cloning matters

## BSL / source-available style

Good:
- stronger commercial protection
- code can remain visible

Bad:
- not true open source in OSI terms
- may conflict with the stated vision if "open source" is meant literally

Assessment for ChopDot:
- viable only if the team decides commercial defense matters more than calling ChopDot truly open source

## 5. Brand Protection

Code license does not protect the brand.

ChopDot should separately protect:

- name
- logo
- primary product marks

That matters because:

- forks can copy code
- they should not be able to copy identity freely

## 6. Recommended Structure

## Public repo

Use the public repo for:

- product code
- public docs
- architecture
- implementation
- public contributor roadmap

## Private repo or workspace

Use a private space for:

- pricing
- pilots
- fundraising
- internal legal/compliance notes
- partner strategy
- internal scorecards
- security/abuse operations

## Local-only

Use local-only materials for:

- rough notes
- exploratory thoughts
- personal prep
- incomplete sensitive drafts

## 7. What Actually Protects ChopDot

ChopDot is not protected mainly by hiding code.

It is protected by:

- speed of iteration
- better product taste
- clearer trust semantics
- real pilot relationships
- user learning
- ecosystem relationships
- proof and metrics
- brand
- distribution

That is the real moat structure.

## 8. Recommendation

### Best near-term recommendation

1. Keep the core product repo public.
2. Move company-operational materials into a private surface.
3. Do not expose fundraising, pilot, pricing, and sensitive ops work by default.
4. Protect the ChopDot brand separately.
5. Choose a license explicitly rather than inheriting ambiguity.

### License recommendation

If the team means **real open source**, the strongest current fit is:

- `AGPLv3`

Reason:

- it preserves genuine openness
- it is more defensible than MIT/Apache for a networked app
- it fits the current product posture better than permissive cloning

### Fallback recommendation

If the team decides commercial protection matters more than strict OSI openness:

- move toward an open-core or source-available model instead

But that should be a deliberate identity decision, not an accident.

## 9. Immediate Next Steps

1. Make a public/private material inventory.
2. Move sensitive operator/company materials out of the public surface.
3. Decide:
   - true open source
   - open core
   - source-available
4. Draft brand/trademark planning.
5. Add a short public-facing licensing philosophy note so contributors understand the choice.

## One-Line Rule

**Be open on the product, private on company operations, deliberate on licensing, and serious about brand protection.**
