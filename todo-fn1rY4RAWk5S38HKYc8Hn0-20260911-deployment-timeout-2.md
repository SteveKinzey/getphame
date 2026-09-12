# Get Phame Deployment Timeout Recovery — 2026-09-11

- [x] Capture current managed deployment and runtime evidence. The deployment reports a timeout and the legacy `build` command still ran audit plus the complete Vitest suite before bundling; earlier managed output showed tests past 210 seconds.
- [x] Reproduce production startup and Cloud Run readiness assumptions locally. The compiled bundle now starts with a configured free PORT, binds `0.0.0.0`, returns `200 {"ok":true,"status":"ready"}` from `/api/health`, and serves the SPA root.
- [x] Apply a minimal code fix only if evidence identifies an application blocker. `build` now performs Vite/esbuild bundling only; `validate:production` and protected CI retain `audit:prod` and the full suite. The compiled bundle forces static production serving rather than attempting Vite if a development-mode environment leaks into the runtime.
- [ ] Run full release validation and save a checkpoint.
- [ ] Synchronize the validated tree to protected GitHub main and verify live deployment.
