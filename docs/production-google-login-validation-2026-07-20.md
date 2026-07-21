# Production Google login validation — 2026-07-20

## Initial published observation

After managed checkpoint `049654d0` was saved, `https://getphame.app/login` still rendered only the email magic-link form. It did not display the expected Google entry, while Apple was correctly absent on the custom production domain.

## Configuration observation

The published `https://getphame.app/api/auth/google/status` endpoint returned `{"enabled":true}`. This confirms the production service has Google OAuth credentials available, so the initial mismatch is between the deployed login bundle and the current host-policy behavior rather than missing OAuth configuration.

## Next verification

Confirm whether deployment propagation or an outdated client bundle is responsible, then re-check the production login page before testing the Google authorization redirect. No authorization consent, account selection, or sign-in completion was performed during this observation.

## Deployment diagnosis

The managed build did not deploy checkpoint `049654d0`. Its Docker dependency layer copied `package.json`, `pnpm-lock.yaml`, and patches but omitted `pnpm-workspace.yaml`. That workspace manifest defines the security overrides recorded in `pnpm-lock.yaml`, so `corepack pnpm install --frozen-lockfile` correctly stopped with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`.

The Dockerfile now copies `pnpm-workspace.yaml` before the frozen builder install and into the production dependency stage. An isolated directory containing exactly `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `patches/` completed `pnpm install --frozen-lockfile --ignore-scripts` with pnpm 10.18.1. The next managed checkpoint will confirm the full image build and make the production login bundle eligible to update.
