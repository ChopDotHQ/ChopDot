# ChopDot Loop Runner

Purpose: describe the minimal local checks AgentOps can expect before routing ChopDot work as ready.

## Default Checks

- Read the active product cockpit/card when the task is product-facing.
- Confirm the user journey, one next action, and evidence surface before implementation.
- Run local product validation commands when the task changes product state.
- Capture browser or screenshot evidence for UI work.

## Current Runner Boundary

- This file is a doctrine bridge, not a replacement for repo-local scripts.
- Do not treat passing docs checks as production readiness.
- Live wallet, payment, publishing, or external mutation still requires explicit human approval and current evidence.
