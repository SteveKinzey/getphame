# Localization Verification Notes

## 2026-07-19 dashboard check

The Spanish authenticated dashboard was checked at mobile width using `/?lang=es`. After React mounting was deferred until the initial locale dictionaries were ready, the previously visible raw i18n identifiers (`homePage.*`, `trackingSummaryCard.*`, and `shareReferralCard.*`) no longer appeared.

Remaining copy-quality gaps visible in the same screen are maintained catalog values rather than runtime lookup failures. The dashboard still contains English or mixed-language text in the home-page explanatory paragraph, tracking summary interpolation copy, and referral rewards/share content. These values require a multilingual catalog completion pass across all supported non-English locales before the localization release can be considered complete.

## 2026-07-19 final mobile cross-language check

The authenticated dashboard was inspected at a 390×844 mobile viewport in Spanish, French, Italian, Thai, Simplified Chinese, and Traditional Chinese. All six variants rendered without raw `i18n` identifiers, English fallback fragments, or visible text overflow in the header, install prompt, request CTA, request list, tracking cards, referral rewards, share controls, and referral-share card.

Representative Spanish onboarding and Thai settings/form routes were also checked at the same width. Their visible labels, instructional copy, buttons, and controls were rendered in the selected language with no observed footer overlap or horizontal clipping. Product names, business names, customer names, email addresses, URLs, and platform brand names were intentionally preserved.

## 2026-07-19 desktop cross-language check

At a 1280×720 desktop viewport, Spanish, French, Italian, Thai, Simplified Chinese, and Traditional Chinese dashboard variants rendered their cards, navigation actions, referral surfaces, and translated marketing copy without raw keys, layout collisions, or unexpected English fallback. The public Spanish login route also rendered its navigation, form, consent, footer, and primary actions in Spanish. The localized desktop views preserved only intentional names, addresses, URLs, review-platform names, and the Get Phame product name.
