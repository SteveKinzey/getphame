# Deployed Google sign-in verification — 2026-07-20

## Test result

The deployed Get Phame login route, [`https://getphame.app/login`](https://getphame.app/login), loaded successfully in an authenticated Chrome session. It rendered only the magic-link email form and did **not** render a “Continue with Google” control, so no OAuth authorization handoff could begin on the production domain.

## Root cause

This matches the current `client/src/pages/Login.tsx` policy: the Google and Apple controls are rendered only when `isStagingSocialLoginHost(window.location.hostname)` is true. The file’s header documents that production intentionally uses magic-link authentication, while social sign-in remains available only on localhost and Manus preview hosts.

## Outcome and next decision

The deployed login page is working according to the current production policy, but **production Google sign-in is not enabled and therefore cannot be tested end-to-end**. Enabling it would require an explicit product decision, a production-host allowlist change, and confirmation that the Google Cloud OAuth client authorizes the final deployed callback URI before any real-user authorization is attempted.
