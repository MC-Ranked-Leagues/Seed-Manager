# Published seed history

Seed Manager owns this HTTP interface. League maintains a local copy of the
response schema so the repositories can install and deploy independently.

```text
GET /api/seeds/history?weekNumber=<week>&leagueNumber=<league>
```

The route is unauthenticated. Its successful response is an array containing:

| Field                               | JSON value                                 |
| ----------------------------------- | ------------------------------------------ |
| `order`                             | Positive integer                           |
| `overworld`, `nether`, `end`, `rng` | Strings, preserving full integer precision |
| `type`                              | A supported seed type or `null`            |

Supported types are `BURIED_TREASURE`, `VILLAGE`, `DESERT_TEMPLE`,
`JUNGLE_PYRAMID`, `RUINED_PORTAL`, and `SHIPWRECK`.

Current-week history includes used seeds. Completed-week history includes expired
seeds for the requested league and week, in seed order. Existing error responses
and query validation remain defined by `convex/http.ts` and `convex/lib/validators.ts`.
The endpoint caches current-week responses for 30 seconds and historical responses
for 86400 seconds.

The producer schema is `convex/lib/seedHistoryResponse.ts`. League's consumer
schema is `domains/league/web/src/lib/seedHistoryResponse.ts` in MCRL. Both were
copied unchanged from `@mcrl/contracts/seed-history` at MCRL commit `29cd375`.

Keep existing fields and meanings compatible with deployed consumers. Adding an
optional field is compatible with the current Zod object parser. Renaming fields,
changing field types, adding enum values, or changing publication semantics needs
coordination. For a breaking change, introduce a versioned route, update League,
and retain the old route until its consumers have migrated.

Use the existing `convex/seedHistory.test.ts` tests to verify publication behavior.
When changing the interface, verify representative responses against League's
consumer schema as well. Neither repository imports the other's files at runtime.
