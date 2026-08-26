# Accepted agent outcome packets

This directory contains reviewed, redacted evidence packets promoted from local
Portable Agent Outcome System runs.

Local run ledgers live under ignored `output/agent-runs/` and are not product,
release, or knowledge truth. Promotion into this directory requires:

- a successful or honestly blocked terminal state;
- exact root, branch, commit/tree, and complete Git status;
- artifact hashes and evaluator evidence;
- reconciliation of every external effect;
- removal of prompts, credentials, reusable secrets, receipt contents, and
  other private data;
- a redaction result and outcome-packet schema validation.

Knowledge adapters may cite these packets after acceptance. They cannot upgrade
the evidence level recorded inside them.
