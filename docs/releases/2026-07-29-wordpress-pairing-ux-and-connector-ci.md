# WordPress Pairing Recovery UX and Connector CI Release Evidence

## Scope

This release replaces raw Get Phame pairing failures with localized, privacy-preserving recovery guidance and adds a distinct, accessible rate-limit warning with server-timed retry guidance in the WordPress connector. It also resolves Connector PR 2's transient-expiry, immediate-cleanup, stale-control, PHPUnit, and WordPress coding-standard findings.

## Validation in Progress

The authenticated Developer Integrations route is `/developer`. A desktop full-page capture at 1280 × 720 rendered the complete page without clipping, overlap, invisible text, or broken navigation. The earlier `/developer-integrations` capture correctly exercised the application's unknown-route fallback and was excluded from affected-page evidence.

A mobile full-page capture at 390 × 844 preserved readable content, full-width controls, visible focusable actions, and bottom-navigation clearance without horizontal overflow. Post-capture network logs contained no failed affected-route requests. Browser-console errors were limited to expected Vite development WebSocket reconnect noise after the deliberate server restart; no application exception was observed.

A valid-shape unknown identifier (`wpb_` plus 12 characters) exercised the actual generic `NOT_FOUND` contract. The desktop viewport displayed a distinct rose recovery panel titled “Connection request no longer available,” explained that the request could not be verified, directed the user back to WordPress to start again, and explicitly confirmed that no credentials were created or exposed. No raw server message, pairing secret, or internal identifier was rendered.

## Completed Local Gates

| Gate | Result |
|---|---|
| Get Phame focused pairing and localization regressions | 68 tests passed |
| Get Phame full Vitest suite | 133 files passed; 788 tests passed; 6 skipped |
| Strict TypeScript | Passed with no diagnostics |
| Production dependency audit | No known high-severity production vulnerabilities |
| Production client and server build | Passed |
| Connector PHPUnit | 23 tests and 139 assertions passed |
| Connector WordPress coding standards | 4 files passed PHP_CodeSniffer |
| Connector PHP syntax and Composer metadata | Passed |
| Whitespace, stale-cache, and changed-file scans | Passed |

Final test totals, mobile verification, production behavior, checkpoint identifiers, pull requests, and protected-main parity will be appended before release closeout.
