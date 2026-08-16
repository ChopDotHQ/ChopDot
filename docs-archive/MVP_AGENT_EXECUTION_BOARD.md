# MVP Multi-Agent Execution Board

This board tracks the 5-agent split for the 12 identified MVP gaps and defines the verification gate for completion.

## Parent Task

- `5wd7dc` - MVP 12-item multi-agent execution

## Agent Tasks

- `lyszqz` - Agent A: Navigation and entry-point wiring
  - Items: 4, 5, 11, 12
  - Goal: remove dead-end navigation and unreachable sheets/routes
- `gmdsnh` - Agent B: Pot lifecycle handler wiring
  - Items: 1, 2, 3
  - Goal: make pot lifecycle controls fully functional end-to-end
- `wcf5oh` - Agent C: You-tab action hardening
  - Items: 10
  - Goal: eliminate placeholder/no-op controls in account area
- `xg6138` - Agent D: QR, checkpoint, and settlement export
  - Items: 6, 7, 8, 9
  - Goal: replace mock/stub flows with production-usable behavior
- `jqhbhk` - Agent E: QA and analytics verification gate
  - Items: cross-cutting
  - Goal: enforce Cypress + GA verification before closeout

## Working Agreement

- Every agent task must include updates in task notes for:
  - scope completed
  - blockers and risks
  - files touched
  - verification evidence
- A task is considered complete only when:
  - task status is `done`
  - all acceptance criteria are checked

## Verification Commands

```bash
# Live board view
knowns board --plain

# Verify all five agent tasks are done with AC complete
./scripts/verify-agent-delivery.sh

# Optional: include parent task in gate
./scripts/verify-agent-delivery.sh --include-parent
```

Exit code from `verify-agent-delivery.sh`:
- `0` = all checked tasks passed gate
- `1` = one or more tasks are missing/incomplete
