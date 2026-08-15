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
