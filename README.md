# Seed Manager

Seed Manager coordinates Minecraft speedrun seeds from upload through weekly use
and historical publication. It includes Discord authentication, uploader and host
workflows, comments, and audit logging.

## Structure

- `src/`: React website source.
- `public/`: Static website assets.
- `convex/`: schema, authentication, backend functions, and HTTP endpoints.
- `docs/`: workflows and the published-history interface.

Read [CONTEXT.md](CONTEXT.md) for domain terminology and [AGENTS.md](AGENTS.md)
for development instructions.

## Development

Use Bun 1.3.14. Run commands from the repository root:

```sh
bun install --frozen-lockfile
cp .env.example .env.local
```

Configure `.env.local` for an existing **development** Convex deployment before
running `bun run dev`. `bun run dev:web` starts only Vite; `bun run dev:convex`
starts only Convex. Vite reads the environment from the repository root.

| Variable            | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `CONVEX_DEPLOYMENT` | Selects the Seed Convex development deployment |
| `VITE_CONVEX_URL`   | Connects the website to that deployment        |

The existing backend uses `SITE_URL`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`,
`JWT_PRIVATE_KEY`, `JWKS`, `READ_API_KEY_SEEDS`, and `WRITE_API_KEY_SEEDS`.
These are backend variables, not frontend configuration. Convex provides
`CONVEX_SITE_URL`. Repository migration does not require rotating credentials,
reinitializing authentication, or copying database records.

## Verification

```sh
bun run typecheck
bun run test
bun run build
bun run lint
```

`bun run format:check` checks formatting. Tests use an in-process Convex test
runtime and do not deploy the backend.

## Published history

League consumes `GET /api/seeds/history?weekNumber=<week>&leagueNumber=<league>`.
See [published-history.md](docs/published-history.md) for compatibility rules.

## Hosting and migration

The frontend build runs at the repository root with `bun run build:cloudflare`
and produces `dist`. Configure `VITE_CONVEX_URL` in the hosting environment.

The prepared backend deployment workflow is manual and additionally requires
`SEED_DEPLOY_ENABLED` to equal `true`. Leave it disabled until the old MCRL Seed
workflow is disabled and the production cutover is explicitly approved. It uses
the existing deployment key through the `SEED_CONVEX_DEPLOY_KEY` repository secret.

This repository continues the original `NotAva1ble/seed-manager` Git history.
