# Authentication and Account-Management Verification

- Clean-session desktop capture at 1440 × 1000 rendered the public `/login` route after the application-loading period.
- The page shows the GetPhame brand lockup, public navigation, Apple sign-in option, returning-user email field, and **Send Magic Link** action with readable contrast and no visible clipping.
- A clean-session phone capture at 390 × 844 shows the same login choices in a single-column layout, with the compact brand header, language control, mobile menu, full-width email field, and full-width magic-link action visible without horizontal overflow.
- The first immediate screenshot captured only the application loading state; the page was recaptured with a six-second virtual rendering budget before evaluation.
- Automated coverage separately verifies the landing-page and onboarding-page returning-user sign-in entries, active-origin payload, existing-account dashboard routing, administrator authorization, merge direction, and account-data transfer categories.
- Final release gates passed: **32 test files**, **171 passing tests**, **1 skipped test**, strict TypeScript validation, and the production build.
