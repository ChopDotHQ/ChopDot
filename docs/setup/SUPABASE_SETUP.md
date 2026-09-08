# Supabase development on main

The [frontend preview](../../README.md#run-a-local-frontend-preview) is the
starting point when you only need to inspect the application. It does not need
Docker, a database or hosted credentials. This page is for changes that require
database-backed behavior.

## Prerequisites and current limitations

- Node 22.x, npm 11.3.0 and installed project dependencies.
- Supabase CLI and Docker for local database services. They are separate
  tools; the root npm install does not install the CLI or Docker.
- Read [supabase/config.toml](../../supabase/config.toml) and relevant tracked
  migrations before starting services.

The checked-in configuration is not yet a verified zero-configuration auth
environment: Google, Apple and Facebook providers are enabled and expect
provider variables; auth redirects use port 3000 while Vite uses 5173; a seed
file is referenced but is not tracked. Resolve only configuration relevant to
your local test, with maintainer review where needed. Do not invent shared
credentials or claim a full auth/database test from a frontend preview.

## Local services, not the shared cloud project

From this checkout, with Docker running and local prerequisites satisfied:

```sh
npm run db:start
npm run db:status
```

These use `supabase start` and `supabase status`. Configured local ports are
API 54321, PostgreSQL 54322 and Studio 54323. All worktrees share the configured
Supabase project ID and ports: coordinate before starting/stopping services;
a different Git worktree does not imply an isolated database.

If no `.env` exists, copy [`.env.example`](../../.env.example) to `.env`.
Keep existing environment files intact. Fill in the **local** API URL and
public anon key reported by your local CLI; use `VITE_DATA_SOURCE=supabase` and
`VITE_SUPABASE_STRICT=true` when testing the Supabase data path. The template's
placeholder cannot authenticate. Do not put service-role keys, database
passwords or wallet secrets into any `VITE_` variable or a public report.

Then use:

```sh
npm run dev
```

This starts Supabase before Vite. The frontend uses port 5173; examine terminal
output for actual failures. In contrast, `dev:frontend` overrides data mode and
backend configuration for preview and is not a database-integration test.

## Commands that are not onboarding steps

Existing `db:setup`, `db:pull` and `db:push` scripts can link to, read from, or
mutate a hosted project; some also reset a local database. These are
maintainer-controlled migration workflows, not contributor requirements.
Inspect the script, destination and scope first. Cloud schema changes require
explicit approval for the intended project and migration.

`npm run db:reset` replaces local database state. Back up needed data and
confirm the target first. Never delete `supabase/migrations` to fix setup:
those files are versioned schema history.

`npm run db:stop` stops the shared local service instance. Coordinate with any
other task using it. A local failure is not a reason to use a production database.

## Report a setup problem

Include branch/commit, Node/npm/CLI versions, failing command and redacted
output. State whether the test was frontend-only or database-backed.
Do not include real environment files, user data, private keys or passwords.
