# AgentOps Integration

ChopDot is connected to the shared `AgentOps` layer in:

- `/Users/devinsonpena/Documents/AutoBots/agentops`

The `chopdot-daily-operator` workflow currently reads:

- `/Users/devinsonpena/ChopDot/docs/FEATURE_PARITY.md`
- `/Users/devinsonpena/ChopDot/artifacts/FEATURE_AUDIT_AND_IMPROVEMENT_PLAN.md`
- `/Users/devinsonpena/ChopDot/artifacts/TODAY_EXECUTION_BOARD.md`
- `/Users/devinsonpena/ChopDot/artifacts/STABILITY_AUDIT_TODAY.md`
- `/Users/devinsonpena/ChopDot/artifacts/opengov-preflight-report.json`

It writes:

- `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_daily_brief.json`
- `/Users/devinsonpena/ChopDot/docs/AGENTOPS_OPERATOR_BRIEF.md`
- `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_operator_task_queue.json`
- `/Users/devinsonpena/ChopDot/docs/AGENTOPS_TASK_QUEUE.md`
- `/Users/devinsonpena/ChopDot/artifacts/qa/chopdot_knowns_sync.json`
- `/Users/devinsonpena/ChopDot/.knowns/tasks/task-*.md` for operator-managed execution items

Control plane:

- manifest: `/Users/devinsonpena/Documents/AutoBots/agentops/registry/agents/chopdot-daily-operator.json`
- model policy: `/Users/devinsonpena/Documents/AutoBots/agentops/registry/model_policies/chopdot_operator.json`
- eval suite: `/Users/devinsonpena/Documents/AutoBots/agentops/evals/suites/chopdot_operator.json`
- scorecard: `/Users/devinsonpena/Documents/AutoBots/agentops/reports/agent_scorecards/chopdot-daily-operator.md`
- outcome dashboard: `/Users/devinsonpena/Documents/AutoBots/agentops/reports/outcome_dashboards/chopdot-daily-operator.md`

Operating rule:

- `AgentOps` can recommend and prepare artifacts
- human review is still required for production model changes, code changes, and outbound support responses
