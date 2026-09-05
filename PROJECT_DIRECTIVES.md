# ChopDot launch directives

**Kind:** guardrail
**Status:** active
**Owner:** release integrator
**Last reviewed:** 2026-08-24
**Applies to:** chopdot-v1-launch
**Authority:** exact-worktree evidence and safety guardrails; it cannot make product or release decisions

1. Verify the exact worktree root, branch, HEAD, complete status, and deployed
   build identity before a current-state claim.
2. Run `npm run context:validate`; do not compensate for a failure by reading a
   different checkout.
3. Keep facts, inferences, assumptions, and newly executed verification
   separate.
4. Product law, current product decisions, implementation, deployment, and
   cited recall are different evidence classes.
5. Do not expose infrastructure language in normal UI.
6. Do not weaken signed membership, money, privacy, or recovery authority to
   make a flow appear complete.
7. Do not deploy a candidate with an unresolved live first-use blocker.
8. Preserve user work and unrelated dirty paths; commit logical reviewed slices.
9. Any external doctrine or AgentOps tool is advisory until its exact callable
   identity, source, side effects, and applicability are verified.
10. Stop a release when evidence is weaker than the claim.
