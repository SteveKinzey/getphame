# Localization Verification Notes

## 2026-07-19 dashboard check

The Spanish authenticated dashboard was checked at mobile width using `/?lang=es`. After React mounting was deferred until the initial locale dictionaries were ready, the previously visible raw i18n identifiers (`homePage.*`, `trackingSummaryCard.*`, and `shareReferralCard.*`) no longer appeared.

Remaining copy-quality gaps visible in the same screen are maintained catalog values rather than runtime lookup failures. The dashboard still contains English or mixed-language text in the home-page explanatory paragraph, tracking summary interpolation copy, and referral rewards/share content. These values require a multilingual catalog completion pass across all supported non-English locales before the localization release can be considered complete.

## 2026-07-19 final mobile cross-language check

The authenticated dashboard was inspected at a 390×844 mobile viewport in Spanish, French, Italian, Thai, Simplified Chinese, and Traditional Chinese. All six variants rendered without raw `i18n` identifiers, English fallback fragments, or visible text overflow in the header, install prompt, request CTA, request list, tracking cards, referral rewards, share controls, and referral-share card.

Representative Spanish onboarding and Thai settings/form routes were also checked at the same width. Their visible labels, instructional copy, buttons, and controls were rendered in the selected language with no observed footer overlap or horizontal clipping. Product names, business names, customer names, email addresses, URLs, and platform brand names were intentionally preserved.

## 2026-07-19 desktop cross-language check

At a 1280×720 desktop viewport, Spanish, French, Italian, Thai, Simplified Chinese, and Traditional Chinese dashboard variants rendered their cards, navigation actions, referral surfaces, and translated marketing copy without raw keys, layout collisions, or unexpected English fallback. The public Spanish login route also rendered its navigation, form, consent, footer, and primary actions in Spanish. The localized desktop views preserved only intentional names, addresses, URLs, review-platform names, and the Get Phame product name.

## 2026-07-19 performance and mobile-footer check

At 375×812, the Spanish dashboard preserved translated first-render content after active-locale static-copy loading. The authenticated gold footer kept its legal links, secondary links, copyright, touch targets, and safe-area space visible without horizontal overflow. One compact-width refinement remains before release: the longer Spanish Settings label wraps at an awkward character boundary in the primary navigation, so narrow-screen labels need an abbreviation strategy.

## 2026-07-19 compact navigation follow-up

The 375×812 Spanish authenticated dashboard was rechecked after adding locale-aware compact labels. The Settings navigation item now reads “Ajustes” on compact phones, remains semantically labelled as Settings for assistive technology, and no longer breaks mid-word. The gold footer and all visible navigation controls remained aligned without clipping or horizontal overflow.

## 2026-07-19 320 px compact-width check

At 320×700 in French, the authenticated footer retained its full-width gold ribbon, safe-area spacing, ordered link grids, and tappable controls without horizontal overflow. The one remaining polish item is to provide compact alternatives for the longer Dashboard and Admin navigation labels; truncation is safe but less legible than intentional short labels at this extreme width.

## 2026-07-19 compact-label completion

The short Dashboard label loaded as intended, while the Admin label was being rewritten from its runtime-localized value by the legacy static-text bridge. The primary-navigation label container now opts out of that bridge because all of its copy is already supplied by i18n. This preserves concise localized Dashboard, Settings, and Admin labels at 320 px while retaining full accessible names and the full labels at wider breakpoints.

The final 320×700 French capture showed intentional short labels (“Stats” and “Admin”), no clipping or horizontal scrolling, stable gold-ribbon footer spacing, and full primary-tab touch targets.
