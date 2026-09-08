# Documentation

This index describes the `main` checkout. It separates practical entry points
from accumulated plans, experiments and past measurements.
For branch status, start with the [project README](../README.md).

## Start here

- [Run the frontend preview](../README.md#run-a-local-frontend-preview).
- [Contribute and verify a change](../CONTRIBUTING.md).
- [Database-backed development](setup/SUPABASE_SETUP.md).
- [Work across editors or worktrees](CROSS_IDE_COLLABORATION.md).
- [Report a security issue privately](../SECURITY.md).

The package scripts and configuration in the **same branch** are the reference
for executable commands. If a guide disagrees with them, report or fix the
disagreement rather than copying commands from a different implementation.

## Reference and history

The rest of this directory is retained engineering context, not a second
onboarding path or a unified current roadmap:

- [`plans/`](plans/): scoped plans; establish completion from matching code,
  PR and verification, not a plan's title.
- [`product/`](product/): product studies and design material.
- [`archive/`](archive/): archived documentation, not current setup instructions.
- [`supabase/`](supabase/): database reference material; use the setup guide
  above before running any database command.
- Root-level audits, strategy notes, release notes and files named `READY`,
  `COMPLETE`, `NEXT_STEPS` or `SUMMARY`: read their date, branch and scope.
  Their titles are not current release or implementation proof.

For example, [the public-docs IA draft](DOCS_IA_DRAFT.md) proposes a future docs
site, and [the Polkadot contract notes](POLKADOT_HUB_CONTRACT_EXPERIMENTS.md)
describe experiments. Neither replaces setup instructions or establishes
production readiness. Historical documents have not all been individually
revalidated by this onboarding pass.

## Keep documentation understandable

Update an existing guide before adding another entry point. Label new plans or
measurements with their date and scope. Keep private operator records out of
public documentation. Archive or remove obsolete instructions only after
checking their consumers; preserve useful implementation and release evidence.

`npm run docs:check` validates the small public entry-point set, not every
historical file. Expand coverage deliberately as more guides are reviewed.
