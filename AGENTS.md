# Repository instructions

- Use Bun for package management and commands.
- Do not commit without explicit user approval.
- Do not run commands or make changes against production environments.
- Answer questions without treating them as permission to make changes.
- Keep brainstorming concise and collaborative.

## Code quality

- Read `CONTEXT.md` before changing Seed behavior or terminology.
- Read `docs/seed-manager-routing.plan.md` and `docs/seed-manager-v1.plan.md`
  before changing application workflows.
- Before adding a logging action, ask whether it should be logged.
- Reuse existing UI where suitable. Avoid abstractions used only once.
- Prefer one React component per file; keep closely related helpers together
  when that is clearer. Put reusable helpers in the relevant `lib` directory.
- Use `@/*` for `src` imports and `@/convex/*` for this app's backend.
- Keep backend implementations private. External callers use HTTP interfaces.
- Seed owns the published-history interface documented in
  `docs/published-history.md`. Preserve compatibility with League's local schema.

## Convex

- Read `convex/_generated/ai/guidelines.md` before changing Convex code.
- Mutations and internal mutations signal failures by throwing `ConvexError`.
  Returning a failure value commits earlier writes.

## Verification

- Run typecheck frequently, using the smallest affected script in `package.json`.
- Prefer existing tests and typecheck over custom or browser tests for small edits.
- Run broader existing tests and build checks for migration or core changes.
- Run lint at the end and report remaining errors.
