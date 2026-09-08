# Contributing to ChopDot

This guide applies to `main`; the public-beta candidate has its own
implementation and commands.

## Before changing code

1. Read the [README](README.md), including the branch/status notice.
2. Check [open issues](https://github.com/ChopDotHQ/ChopDot/issues) and
   [pull requests](https://github.com/ChopDotHQ/ChopDot/pulls) for related work.
3. For a substantial change, discuss scope and target branch in an issue or
   existing PR before implementing it. Small documentation fixes can be
   proposed directly in a PR.
4. Work on a focused branch in your fork or an authorized clone. Keep unrelated
   changes separate and preserve existing uncommitted work.

Git, source files and issue/PR discussion are sufficient. Private maintainer
tooling and `.knowns` task files are optional context, not contribution
requirements. No particular editor, AI assistant or knowledge system is required.
See [Cross-IDE collaboration](docs/CROSS_IDE_COLLABORATION.md) for optional
worktree guidance.

## Development and checks

Use Node 22.x and npm 11.3.0. Follow the README for a bounded frontend preview.
The [database setup guide](docs/setup/SUPABASE_SETUP.md) describes the separate
integration prerequisites. Never use a production database or real payments
for a routine contribution test.

From the repository root:

```sh
npm run docs:check
npm run test:docs
npm run lint
npm run type-check
npm test
npm run build
```

Type checking and unit tests do not require a hosted database. Vite's build
configuration requires nonempty Supabase URL/key values even for local-mode
builds. Copy `.env.example` to a **new** `.env` only if one does not already
exist; its placeholders satisfy that configuration check but cannot authenticate.
Never replace an existing environment file or commit real credentials.

For Playwright checks, configure the integration environment first, then run:

```sh
npx --no-install playwright install chromium
npm run e2e
```

`e2e` uses `playwright.config.ts`, which starts `npm run dev` and therefore
requires the local Supabase prerequisites. Do not reuse an unrelated server
and call it a test of your checkout. Cypress is a separate legacy test surface;
skipping its install script does not count as running its tests.

These are commands to run, not a claim that all checks currently pass. If an
existing failure blocks verification, include the command, output and base
commit in the PR. Do not suppress failures, lower thresholds or broaden secret
allowlists to make an unrelated change pass.

## Before opening a pull request

- Name the target branch, user/developer problem, and bounded change.
- Include tests run and results, including failures and checks not run.
- Update the relevant guide when setup, behavior or limitations change.
- For visible UI changes, include screenshots and the actual user flow tested.
- Keep generated builds, browser output, personal notes and credentials out of
  the diff. Use reproducible fixtures instead of real user/wallet data.
- Keep financial-state, authentication and database changes separately
  reviewable. Do not include deployments or migrations as hidden setup steps.

Use the [PR template](.github/pull_request_template.md). Passing tests does not
by itself prove deployment, security or live-user readiness. Maintainers decide
merge and release timing; no individual is assigned mandatory review by this guide.

Security reports follow [SECURITY.md](SECURITY.md). The repository uses the
[MIT License](LICENSE); this guide does not add a separate contributor agreement.
