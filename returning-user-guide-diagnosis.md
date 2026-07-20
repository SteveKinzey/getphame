# Returning-User Setup Guide Diagnosis

- Production account resolution is now correct: the authenticated dashboard shows Steve / SK America LLC, Life Plan, 4 historical requests, performance statistics, referral code, and the existing business profile.
- The setup guide modal opens automatically over that dashboard on `https://getphame.app/`.
- A browser hard refresh reproduces the automatic modal opening.
- The current `Home.tsx` initializes `guideOpen` to `false` and only calls `setGuideOpen(true)` from the manual Guide button.
- `useOnboardingGuide` still contains browser-local auto-show logic based on `rl_guide_seen`, but the current source tree has no invocation of that hook.
- The contradiction between deployed behavior and current source suggests either a stale production client asset/service worker or a different auto-open path outside the checked TypeScript source. The next step is to inspect the production HTML, service-worker registration, and active JavaScript bundle content before changing logic.
