# Upgrade enhancement validation — 2026-07-21

## Desktop verification

Using the development-only non-persistent plan preview, the upgrade page showed all three plans in a single desktop row. The Annual card carried a visible **Most Popular** badge, gold border, restrained elevation, and selected-plan treatment. The savings calculator appeared directly above the cards and displayed the twelve-month Monthly benchmark, Annual year-one saving, and Lifetime year-two saving.

## Tablet verification

At a 768-pixel viewport, Monthly and Annual formed the first row while Lifetime spanned the second row. The savings calculator remained readable, Annual retained its badge and highlight, checkout controls stayed within their cards, and the layout did not introduce horizontal overflow.

## Mobile verification

At a 390-pixel viewport, the calculator, three plan cards, Annual emphasis, and full-width payment actions stacked without horizontal overflow. The full desktop comparison table was suppressed and replaced by a compact **Compare plan features** drawer trigger, keeping the feature comparison discoverable without adding a dense table to the mobile page.

## Validation note

The temporary `?preview=plans` development-only flag used for visual validation against a lifetime-account session has been removed before the production checkpoint.
