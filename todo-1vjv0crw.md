# Project TODO

- [x] Inspect the deployed and local authentication path for `/admin/email-preview`, including session, authorization, and login redirect handling.
- [x] Reproduce the already-authenticated login prompt and capture the underlying route or OAuth error without exposing credentials.
- [x] Implement the secure fix for the admin email-preview access and login failure.
- [x] Add focused regression tests for the corrected authentication and authorization behavior.
- [x] Run focused tests, the full suite, TypeScript validation, production build, and desktop/mobile route verification; the full server check exceeded sandbox limits, so bounded changed-file client/server checks were used as the documented fallback.
- [x] Save a validated release checkpoint and synchronize the exact tree to the selected Get Phame GitHub repository through a reviewed pull request.
- [x] Complete and verify the interrupted return-path and authenticated-entry implementation without weakening redirect safety.
- [x] Run focused Google OAuth, magic-link, and authenticated-entry regression tests for the repaired path.
- [x] Run collected positive and negative redirect-safety regressions for same-origin and rejected `returnTo` destinations.
- [x] Reproduce and diagnose the current email-preview login error and confirm the active production authorization behavior.
- [x] Add a clear, accessible loading animation and actionable error state to the administrator sign-in form.
- [x] Allow development-only email-preview access without a login while retaining production admin authorization and route safety.
- [x] Add regression coverage for login feedback, development bypass activation, and production bypass rejection.
- [x] Run focused and full authentication tests, client type checks, production build, dependency audit, and responsive route verification; server type checks were terminated by sandbox resource limits after the production build passed.
- [ ] Save and synchronize the validated email-preview authentication update through the required GitHub release workflow.
