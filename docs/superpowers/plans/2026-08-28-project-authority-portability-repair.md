# Project authority portability repair

**Kind:** implementation plan
**Status:** active
**Owner:** release-integrator
**Applies to:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`

## Goal

Remove the unapproved assumption that collaborator `Gizmotronn` is a permanent
ChopDot reviewer or release authority. Make project authority explicit,
portable, and fail-closed while preserving `Devpen787` as the human project
owner.

## Current truth to preserve

- Hosted agent checks must remain mandatory for governed branch acceptance.
- Administrators must not bypass protected release approval.
- The release branch and `main` remain the only release-environment branches.
- A collaborator is not a project authority unless the owner explicitly assigns
  that role.
- Authorized agents currently act through the same `Devpen787` principal as the
  human owner. That delegation is intentional and does not require a fabricated
  second human identity.

## Scope in

1. Add a repository-owned authority profile that identifies roles, identities,
   identity mode, protected environments, and branch allowlists.
2. Resolve governance verification from that profile rather than hard-coded
   usernames.
3. Preserve `Gizmotronn` as an existing contributor and optional CODEOWNERS
   review route, while removing every mandatory reviewer/release dependency.
4. Configure delegated-owner mode so hosted exact-candidate checks—not an
   impossible self-review or unrelated collaborator—govern PR acceptance.
5. Remove unrelated required reviewers from release acceptance while retaining
   exact evidence enforcement, branch restrictions, and
   `can_admins_bypass=false`.
6. Update workflow/ruleset validators and hostile tests.
7. Read back the exact GitHub ruleset, environment, PR requests, branch, HEAD,
   and status after mutation.

## Scope out

- Creating or procuring a separate GitHub bot/App identity.
- Assigning any collaborator as a permanent reviewer.
- Product behavior, participant authority, money, membership, recovery, or UI.
- Claiming independent human review where delegated-owner mode provides none.
- Deploying or promoting a release.

## Objective expected outcome

The repository and live GitHub settings contain no authority dependency on
`Gizmotronn`; `Devpen787` is the explicit owner principal and authorized agents
may act through it; all governed PRs require the exact hosted checks without a
fabricated review; release enforcement requires its candidate-bound evidence
without an unrelated reviewer; admin bypass remains disabled; tests and exact
readbacks pass.

## Failure outcome and exit condition

Stop without merging when any hard-coded collaborator authority remains, the
release environment permits admin bypass, workflow validation fails, or the
exact hosted candidate is not green. Do not relabel deterministic agent
evaluation as independent human review.

## Documentation impact

Update source governance documentation and generated wiki material where the
old independent-review wording or fixed reviewer assumption appears. Product
Cockpit behavior is unaffected.
