# Project TODO

- [x] Inspect the existing email composer, CSV import, analytics, localization, and test structure for integration points.
- [x] Implement a secure, tenant-scoped AI email tone adjustment flow with clear user control and compliant output safeguards.
- [x] Add focused automated tests for AI tone-adjustment inputs, authorization, and error handling.
- [x] Add router-level tests proving unauthenticated and free-tier users cannot use AI tone adjustment while an entitled tenant can.
- [x] Add a tRPC integration test covering the protected email tone-adjustment mutation path and surfaced errors.
- [x] Verify the Send Request AI tone-adjustment controls, loading/success/error states, accessibility, and upgrade handling in the active UI.
- [x] Verify the production AI tone-adjustment helper’s draft-validation and compliance safeguards in the active server implementation.
- [x] Implement a concise CSV import error summary that identifies rejected rows and actionable corrections without exposing sensitive data.
- [x] Add focused automated tests for CSV error-summary validation and presentation data.
- [x] Implement accessible export controls for analytics charts that preserve the active date range and chart context.
- [x] Add focused automated tests for chart export data, naming, and unavailable-data states.
- [x] Update the premium conversion UI regression contract for the additional locked AI tone-adjustment action.
- [x] Run focused tests, full test suite, TypeScript checks, production build, and desktop/mobile visual verification.
- [x] Re-run and record focused passing tests for AI tone adjustment, CSV diagnostics, and analytics chart export.
- [x] Perform and document evidence-based desktop and mobile visual QA of the new AI, CSV, and chart-export controls.
- [x] Persist route-specific visual QA findings for the Send Request, Import Clients, and Dashboard routes after review.
- [x] Add inspectable UI regression assertions for the AI tone-adjustment control, CSV diagnostics panel, and chart export buttons.
- [ ] Save a validated release checkpoint, synchronize the validated tree to GitHub through a release branch and pull request, merge it to main, and verify the remote main tree.
