# Get Phame GitHub Branch Consolidation Audit

**Audit date:** 2026-07-22  
**Canonical repository:** [SteveKinzey/getphame](https://github.com/SteveKinzey/getphame)  
**Canonical branch:** `main` at `491422fac81e7673cd221dac71740925843f2c66`

The repository currently has no GitHub releases or tags. Pull request [#4](https://github.com/SteveKinzey/getphame/pull/4) is the only open pull request and remains a draft.

| Branch | Tip | Relationship to `main` | Unique value | Consolidation decision |
|---|---|---:|---|---|
| `SteveKinzey-patch-1` | `d50e44d` | 162 commits behind; 0 ahead | Its esbuild security override was merged through PR #1 and is already in `main`. | Already fully contained. Delete after the consolidated `main` is verified. |
| `copilot/fix-failing-github-actions-job` | `f05be29` | 15 commits behind; 4 ahead | Four commits were audited individually; every meaningful change is already present or superseded. | Record the branch lineage with a no-tree-change merge, close PR #4 as superseded, then delete the branch after verification. |
| `landing` | `51c9d5f` | Unrelated/orphan history | Six commits contain an older standalone landing implementation. Its useful capabilities are already present in the modern `main`; its hardcoded testimonials and results claims must not be carried forward. | Preserve lineage with an unrelated-history no-tree-change merge after parity verification, then delete the branch after verification. |

## Copilot Branch Commit Audit

| Commit | Change | Current canonical state | Disposition |
|---|---|---|---|
| `ece0c47` | Initial plan | No tree changes. | No implementation to port. |
| `2cd6203` | Add `NODE_OPTIONS=--max-old-space-size=4096` to the CI type-check | The exact CI heap setting already exists in `.github/workflows/quality.yml`. | Superseded. |
| `738769f` | Reverse a fallback assertion in the Resend integration test | The canonical test now runs the required-variable assertion only when `RUN_SYSTEM_EMAIL_INTEGRATION=true`; the current `toEqual([])` assertion is correct for that newer control flow. | Obsolete and must not be cherry-picked. |
| `f05be29` | Override `body-parser` to `>=1.20.6` | The canonical workspace already pins `body-parser` to the exact patched version `1.20.6`. | Superseded by the stricter current override. |

## Landing Branch Parity and Product-Direction Audit

The orphan branch introduced a two-column landing page, anchored navigation, feature and workflow sections, product mockups, pricing, comparison, FAQ, lead capture, final CTA, footer, scroll animation, a persistent 50/50 hero CTA experiment, the YouTube demo `EWHSE1oyJOk`, Apple authentication routing, and Open Graph metadata. Current `main` contains the complete modern landing component set, including `Hero`, `Features`, `HowItWorks`, `ProductShowcase`, `Stats`, `Pricing`, `Comparison`, `FAQ`, `LeadCapture`, `FinalCTA`, `Footer`, `FadeUp`, `VideoDemo`, and `SEOHead`. It also contains the CTA experiment, the same demo video, the `/api/auth/apple` route, and production social-image metadata.

The orphan branch is therefore not a missing product surface. It is an older, substantially smaller application tree that would delete modern authentication, localization, PWA, administration, diagnostics, migrations, tests, and customer workflows if merged as ordinary source changes.

> The landing history also contains hardcoded customer names, five-star ratings, quotations, and review-count/result claims. Those claims are not verified customer evidence and conflict with Get Phame’s explicit prohibition on fabricated reviews, ratings, testimonials, quotes, or counts. They will not be preserved. The same inherited content currently present on `main` must be replaced with truthful product proof and protected by regression coverage during consolidation.

## Lossless Integration Sequence

1. Create an annotated rollback tag on the current `main` tip and a protected integration branch.
2. Merge the Copilot branch lineage with a documented no-tree-change merge because all meaningful changes are already present or superseded.
3. Merge the unrelated landing lineage with an explicit unrelated-history no-tree-change merge because feature parity is proven and the older tree contains destructive regressions and prohibited social proof.
4. Remove the inherited fabricated testimonial surface from the canonical app and replace it with verifiable product capabilities, localized across all seven supported locales.
5. Modernize dependencies only after branch lineage is consolidated, using controlled compatible batches and preserving the repository’s security overrides.
6. Run focused tests, the complete Vitest suite, bounded TypeScript validation, dependency and security audits, production build, migration review, and authenticated desktop/mobile verification.
7. Push the integration branch, open a reviewable pull request, merge only after checks pass, verify `main`, close the superseded draft PR, and delete stale branches.
8. Synchronize the validated canonical tree into the managed Get Phame project, save an auto-published checkpoint, and verify the production bundle.

## Rollback Plan

The pre-consolidation annotated tag will remain immutable. If validation fails before the pull request is merged, the integration branch will be corrected or abandoned without changing `main`. If a post-merge issue is found, a normal revert commit will restore the tagged tree; history will not be rewritten and no force push will be used.

## References

[1]: https://github.com/SteveKinzey/getphame "Get Phame GitHub repository"
[2]: https://github.com/SteveKinzey/getphame/pull/4 "Draft pull request #4"
[3]: https://github.com/SteveKinzey/getphame/commit/d50e44d7a84a9bea8df2093ba83e9d140024d7db "Merged esbuild security override"
[4]: https://github.com/SteveKinzey/getphame/commit/2cd62032b1506eaa4dd0111ce578827a2511f301 "Copilot CI heap commit"
[5]: https://github.com/SteveKinzey/getphame/commit/738769fa474dfcd4d00266bf17d98fa389f2db74 "Copilot test assertion commit"
[6]: https://github.com/SteveKinzey/getphame/commit/f05be290657945688a9ab566ecb318ca2bd561d0 "Copilot body-parser commit"
[7]: https://github.com/SteveKinzey/getphame/commit/51c9d5f8aceb0075c4bf725025afad50786559a2 "Landing branch tip"
