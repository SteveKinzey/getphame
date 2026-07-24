# Get Phame Zero-Trust Release Validation

**Validation date:** 2026-07-23
**Scope:** Additive role authorization, passkeys, revocable sessions, credential lifecycle, and staging-only separated-duty recovery drills.

## Core gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Focused recovery and locale tests | Pass | 27/27 tests passed across recovery policy, recovery locale parity, and passkey locale coverage. |
| Full Vitest suite | Pass | 92 test files passed; 551 tests passed; 6 tests skipped by their existing test contracts. |
| TypeScript | Pass | `pnpm check` completed with zero errors. |
| Drizzle metadata | Pass | `pnpm drizzle-kit check` reported that migration metadata is consistent. |
| Managed recovery schema | Pass | All recovery tables and indexes are present. TiDB-compatible participant uniqueness is applied with zero missing backfill assignments. |
| Production dependency audit | Pass | The project audit checked 683 unique npm package versions against OSV; `pnpm audit --prod --audit-level=high` also reported no known vulnerabilities. |
| Production build | Pass | Client and server production bundles completed successfully. The existing Vite large-chunk advisory remains non-blocking. |

## Responsive verification

The authenticated `/settings` route was captured as a full page at **1280 × 900** and **390 × 844**. The Passkeys and Staging Recovery Drill sections render in the expected security sequence. The mobile layout stacks status cells, alerts, forms, and controls without visible horizontal overflow. Controls retain mobile touch-target sizing, and the page remains reachable through the existing bottom navigation.

## Recovery safety assertions covered

The focused suite verifies the exact non-production staging host gate, production-host denial, recent passkey A2 requirements, distinct Recovery Custodian and Independent Approver duties, lifecycle transition restrictions, redacted evidence validation, narrow expiring approver access, and the database separation invariant.

The managed database is TiDB-compatible and does not retain MySQL `CHECK` constraints. The release therefore uses `recovery_drill_participants` as the authoritative duty source. A unique `(drill_id, role)` index allows one actor per duty, while unique `(drill_id, user_id)` prevents one actor from holding two duties in the same drill. Sensitive recovery mutations resolve this table server-side rather than trusting compatibility columns.

## Remaining release gates

Staged production-domain verification and private GitHub synchronization remain pending.
