# PWA Safe-Update Validation Record

**Validation date:** 2026-08-01

The development-preview route `/sw-v28.js` returned `200 OK` with `Content-Type: text/javascript` from both the local server and the managed preview URL. A fresh browser-session load of the preview produced no console output, including no service-worker MIME-type or registration error.

Desktop (`1280×720`) and mobile (`390×844`) root-shell checks rendered without layout breakage from the globally mounted update coordinator. The normal update notice remained absent when no newer deployment was detected, as intended.

Automated validation completed before this record: focused PWA/localization contracts, TypeScript checking, the full one-worker test suite (`1,007 passed; 7 skipped`), and the production build.

## Final release validation

The completed release passed the focused version-utility and PWA source-contract suites (`11` tests), including the v28 worker lifecycle, cache exclusions, reload guard, localization parity, dirty-source coverage, and explicit non-React-Query authentication and PayPal critical-activity protection. The complete one-worker Vitest suite passed with `180` files passed, `1` suite skipped, `1,007` tests passed, and `7` tests skipped. `pnpm check` completed without TypeScript errors; `pnpm build` completed successfully; and the production dependency audit reported no known production vulnerabilities at the configured high-severity threshold.

The managed preview served `/sw-v28.js` as `text/javascript` and `/__manus__/version.json` as `application/json`, with `cache-control: no-cache` on both delivery checks. The source contracts additionally require the in-worker version request to use `cache: "no-store"`, exclude `/__manus__/` and `/api/` from runtime caching, and retain offline, localization, and managed-media safeguards.

Responsive review completed at `1280×720` and `375×812`. The root shell and its existing onboarding overlay remained readable, responsive, and unobstructed after the global coordinator and safety registry were mounted. Recent console entries contained only development-server WebSocket reconnect noise during preview capture; no PWA registration, MIME-type, worker, or application runtime error was observed in the refreshed preview check.

> This is the documented bootstrap release. The live two-tab, cross-deployment notice can only be observed after this version is published and a subsequent deployment changes the platform version. The implementation does not force-refresh open tabs; source and unit contracts verify the independent per-tab, user-controlled path in the interim.

## Protected-main review reconciliation

After protected-main review, the managed release was revalidated with the three review remediations: a bounded internal timeout for deployment-version requests, visible-tab-only polling, and an explicit `worker-timeout` diagnostic before a customer-requested reload proceeds. The reconciled worker also preserves the concurrent cancellation-localization offline cache for every supported language in both v28 delivery paths.

The managed workspace passed the focused PWA suite (`15` tests), TypeScript check, complete one-worker regression suite, production build, and production dependency audit with no known high-severity vulnerabilities. Final responsive captures at `1280×720` and `375×812` remained readable and functional with the existing onboarding overlay; no update-coordinator visual regression was observed.
