# ChopDot Prompt Preflight

Note: This guide is now consolidated in `docs/PROMPT_PLAYBOOK.md`. Use the playbook as the canonical reference.

Use this guide before starting any task. It keeps scope tight, avoids rework, and makes outcomes predictable.

## Quick preflight (answer these before acting)

1. Goal
   - What is the exact outcome we want?
2. Scope
   - Which screens/files/flows are in-scope?
   - What is explicitly out-of-scope?
3. Constraints
   - No breaking changes?
   - Preserve existing patterns?
   - Keep behavior the same unless noted?
4. Risk / Impact
   - Any data migrations or DB writes?
   - Any UX or auth edge cases?
5. Definition of done
   - How do we know it worked?
6. Verification
   - Which checks/tests should run?
7. Output
   - What deliverables are expected (code, docs, checklist, summary)?

## Default checklist (use unless user overrides)

- Keep changes minimal and targeted.
- Fix root cause, avoid band-aids.
- Update docs if behavior changes.
- Run type-check; run tests if touched logic is risky.
- Call out any remaining risks or manual steps.

## Reference docs

- `docs/PROMPT_GUIDE_REFERENCE.md` (prompt patterns and examples)
- `docs/ARCHITECTURAL_AUDIT.md` (system constraints and tradeoffs)

## Prompt template (copy/paste)

Goal:
Scope:
Out-of-scope:
Constraints:
Definition of done:
Verification:
Deliverables:

## Examples

### Bug fix

Goal: Fix member add so accepted invitees can be added to new pots.
Scope: AddMember flow + data layer.
Out-of-scope: UI redesign.
Constraints: Supabase + guest modes must still work.
Definition of done: New member appears and is persisted; no regressions.
Verification: npm run type-check.
Deliverables: Code fix + brief summary.

### UX polish

Goal: Add loading states to PotsHome, PeopleHome, ExpenseDetail.
Scope: Those screens only.
Out-of-scope: New animations or redesign.
Constraints: Use existing PSA glass styles.
Definition of done: Skeletons appear during load, no jank.
Verification: npm run type-check.
Deliverables: Code changes + quick checklist.
