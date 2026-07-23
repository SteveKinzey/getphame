# Get Phame Dependency Modernization Plan

**Plan date:** 2026-07-22  
**Current security baseline:** `pnpm audit` reports 857 resolved production dependencies with zero low, moderate, high, or critical findings.

Node.js recommends that production applications use an Active LTS or Maintenance LTS release. The official release table lists Node 24 as the current LTS line, and the Node 24 LTS announcement states that it receives updates through April 2028.[1] [2] Get Phame will therefore move its Docker and CI runtime from Node 22 to Node 24 while retaining the ability to run developer checks on Node 22 during the transition.

## Runtime and Toolchain Alignment

| Surface | Current | Target | Reason |
|---|---:|---:|---|
| Production Docker runtime | Node 22 | Node 24 LTS | Active supported LTS with support through April 2028. |
| GitHub Actions runtime | Node 22 | Node 24 | Match production build and test behavior. |
| `package.json` engines | Not declared | `node >=24 <25`, `pnpm >=10.34.4 <11` | Make the supported runtime explicit. |
| `packageManager` | `pnpm@10.18.1` | `pnpm@10.34.4` | Align with the already-declared pnpm 10 development dependency without taking the pnpm 11 breaking upgrade. |
| GitHub Actions pnpm | `10.18.1` | `10.34.4` | Eliminate package-manager drift between CI and the manifest. |
| TypeScript | `5.9.3` | `5.9.3` | TypeScript 7 is a breaking major and is deferred until framework compatibility is verified. |

## Controlled Upgrade Batches

| Batch | Scope | Examples | Gate before proceeding |
|---|---|---|---|
| 1 | Runtime and package-manager metadata | Node 24, pnpm 10.34.4, `engines` | Frozen install, TypeScript, focused runtime tests, production build. |
| 2 | Server and integration packages within current majors | AWS SDK 3.x, tRPC 11.x, Stripe 22.x, MySQL 3.x, Jose 6.x, Helmet 8.x, Nodemailer 9.x | Authentication, payment, database, webhook, email, and API tests. |
| 3 | React and data-layer packages within current majors | React 19.2.x, React Query 5.x, React Hook Form 7.x, Zod 4.x, i18next 26.x, React i18next 17.x | Full component, localization, form, and routing regressions. |
| 4 | UI and mobile packages within current majors | Radix packages, Framer Motion 12.x, Capacitor 8.x, Recharts 3.x, Tailwind 4.x | Desktop/mobile visual verification and native configuration review. |
| 5 | Build and test tooling within current majors | Vite 8.x, Vitest 4.x, Playwright 1.x, PostCSS 8.x, Prettier 3.x, TSX 4.x | Complete suite, TypeScript, production bundle, CI workflow tests. |
| 6 | Lockfile and security override reconciliation | Preserve or tighten patched transitive versions; remove only proven-obsolete overrides | Frozen install and zero-vulnerability production audit. |

Stripe 22.3.2 pins the current `2026-06-24.dahlia` API. Stripe's official API reference requires a promotion code to identify its coupon through `promotion: { type: "coupon", coupon: "..." }`; the former top-level `coupon` create parameter is no longer the current request shape.[3] Get Phame therefore migrates both the SDK API version and promotion-code request builder together, with a regression test that rejects restoration of the legacy top-level field.

## Intentionally Deferred Breaking Upgrades

| Package | Available major | Decision |
|---|---:|---|
| Express and `@types/express` | 5 | Keep Express 4.22.2 and type definitions 4.17.21 until middleware and error-handler behavior can be migrated separately. |
| TypeScript | 7 | Keep 5.9.3 until Vite, tRPC, Drizzle, test mocks, and the large strict-mode codebase are verified against the new compiler. |
| pnpm | 11 | Keep the latest pnpm 10 line for lockfile and CI stability. |
| `superjson` | 2 | Keep 1.13.3 until transport serialization compatibility is tested end to end. |
| `cookie` | 2 | Keep the current major until authentication-cookie behavior is migrated and verified. |
| `nanoid` | 6 | Keep 5.x until ESM/runtime compatibility is reviewed. |
| `react-day-picker` | 10 | Keep 9.x until date-filter components are migrated. |
| `react-resizable-panels` | 4 | Keep 3.x until dashboard layouts are tested against the new API. |
| `i18next-http-backend` | 4 | Keep 3.x until all seven locale-loading and fallback paths are verified. |
| `lucide-react` | 1 | Keep the current major to avoid an icon-surface migration during consolidation. |
| `wouter` | 3.10 | Retain patched 3.7.1 until the platform-specific route-registry patch is either upstreamed or replaced with an app-owned implementation. |
| Capacitor contacts plugin | 8 | Defer the plugin major independently from the Capacitor 8 core packages until native contact-picker behavior is exercised on iOS and Android. |

## Security Override Rules

The existing overrides for `path-to-regexp`, `body-parser`, `tar`, `picomatch`, Lodash, XML parsers, `form-data`, DOMPurify, Mermaid, esbuild, `follow-redirects`, UUID, `qs`, `brace-expansion`, and `mdast-util-to-hast` remain part of the baseline. An override will be removed only when the resolved graph proves every path is on a non-vulnerable version and the production audit remains clean.

## Validation and Rollback

Each batch will produce a reviewable manifest and lockfile delta. A failing batch will be reverted independently rather than being combined with unrelated fixes. The final release requires a frozen install, focused security and integration tests, the complete Vitest suite, bounded TypeScript validation, production audit, production build, migration review, responsive verification, GitHub CI, and a checkpoint-backed production verification.

## References

[1]: https://nodejs.org/en/about/previous-releases "Node.js Releases"
[2]: https://nodejs.org/en/blog/release/v24.11.0 "Node.js 24.11.0 LTS announcement"
[3]: https://docs.stripe.com/api/promotion_codes/create "Stripe API: Create a promotion code"
