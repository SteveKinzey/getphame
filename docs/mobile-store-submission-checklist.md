# Get Phame mobile store submission checklist

## Code and quality gates

- [ ] Run `pnpm test:e2e` against the release candidate with Chromium and mobile Chromium.
- [ ] Run `pnpm test` and `pnpm build` in a release-capable CI environment.
- [ ] Verify offline guidance, **Retry now**, automatic recovery, toast motion, and haptic preference behavior on at least one physical iPhone and Android device.
- [ ] Confirm that offline recovery never exposes stack traces, credentials, or raw transport errors.
- [ ] Confirm the app launches with the correct **Get Phame** display name and does not request undeclared or unnecessary permissions.

## Apple App Store Connect

- [ ] Archive and validate a signed Release build in Xcode using the production bundle identifier.
- [ ] Supply a working reviewer account or a complete review-access path; do not require undisclosed credentials.
- [ ] Complete the privacy nutrition label, export-compliance responses, support URL, privacy-policy URL, screenshots, and age rating with release-accurate information.
- [ ] Test fresh install, interrupted network, resume from background, and delete/reinstall paths on the submitted iOS build.

## Google Play Console

- [ ] Generate and sign an Android App Bundle for the intended package identifier.
- [ ] Complete Play Console Data Safety, content rating, privacy policy, and test-account instructions with release-accurate information.
- [ ] Run the Play pre-launch report and resolve device, accessibility, crash, and policy findings before production rollout.
- [ ] Test fresh install, offline retry, background resume, and upgrade on a physical Android device and in the selected test track.

## Release evidence

- [ ] Attach final build numbers, device matrix, automated-test results, accessibility notes, and reviewer instructions to the release record.
- [ ] Keep a rollback plan for the web bundle and native release track before submitting to App Store Connect or Play Console.
