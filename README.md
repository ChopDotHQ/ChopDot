# ChopDot

ChopDot is an open-source group expense app for tracking shared spending,
working out each person's share, and keeping a clear record of payments.
It is a work in progress, not a production-readiness or payment-safety guarantee.

## Which version am I looking at?

This guide describes **`main`**, the public default branch. The repository is
in a transition between implementations:

| Branch | Role |
| --- | --- |
| `main` | Existing React/Vite application with Supabase integration. Use the instructions below for this checkout. |
| [`codex/chopdot-v1-launch`](https://github.com/ChopDotHQ/ChopDot/tree/codex/chopdot-v1-launch) | Participant-held public-beta candidate, proposed in [draft PR #13](https://github.com/ChopDotHQ/ChopDot/pull/13). It has a different storage model, setup and test suite; it is not merged into `main`. |

Branch status was checked on September 8, 2026. Check the linked PR before
relying on that snapshot. A candidate branch or old release note does not prove
what is currently deployed. Before contributing, agree on the target branch;
do not mix setup instructions or copy whole implementations between branches.

## Run a local frontend preview

Use **Node.js 22.x** and **npm 11.3.0** (the versions declared in
[package.json](package.json)). From a fresh clone:

```sh
git clone https://github.com/ChopDotHQ/ChopDot.git
cd ChopDot
npm ci --ignore-scripts
npm run dev:frontend
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

This command starts only Vite, bound to your computer's loopback address. It
uses local data mode and placeholder loopback Supabase configuration, without
starting Docker, linking a cloud project, or changing a database. No private
maintainer files, agent tools, knowledge graph, or hosted credentials are needed.

**Preview limits:** authentication, shared synchronization, uploads and payment
integrations are not configured by this command. It is a frontend starting
point, not an offline/full-product test. Use synthetic data and do not attempt
real payments. Existing browser storage is not cleared automatically.

The install skips dependency lifecycle scripts, including the legacy Cypress
binary download. Install the required browser separately when running browser
tests; see [Contributing](CONTRIBUTING.md).

For database-backed development, use the separate
[Supabase setup guide](docs/setup/SUPABASE_SETUP.md) and
[environment template](.env.example). `npm run dev` starts Supabase first;
it is not the same command as the frontend preview.

## Find your way around

| Path | Purpose on `main` |
| --- | --- |
| [`src/`](src/) | Application UI, state and services. |
| [`public/`](public/) and [`assets/`](assets/) | Static assets and developer fixtures. |
| [`supabase/`](supabase/) | Database configuration, migrations and edge functions. |
| [`api/`](api/) and [`backend/`](backend/) | Server-side integrations; not started by the frontend preview. |
| [`tests/`](tests/) and [`cypress/`](cypress/) | Browser/integration tests; unit tests also live alongside source. |
| [`scripts/`](scripts/) | Development, verification and maintenance commands. |
| [`docs/`](docs/README.md) | Documentation index, including historical and experimental material. |

## Contribute and verify

Start with [Contributing](CONTRIBUTING.md). The small onboarding check runs
without installing application dependencies:

```sh
npm run docs:check
npm run test:docs
```

Application checks and their prerequisites are listed in the contribution
guide. Report exact commands and failures; do not substitute an old green run
or a test on another branch for current evidence.

Report vulnerabilities privately through [SECURITY.md](SECURITY.md), not a
public issue. The project is licensed under the [MIT License](LICENSE).
