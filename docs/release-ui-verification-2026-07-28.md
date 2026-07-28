# Get Phame Release UI Verification — 2026-07-28

## Public runtime checks

- Navigating directly to `/send` without an authenticated session resolves to the public Get Phame landing experience rather than exposing the protected composer.
- The global Help Assistant launcher is present on that public route and uses the accessible label `Open Get Phame help`.
- The opened panel displays the Get Phame Help identity, a prominent private-data warning, three common questions, a labeled question field, a human-support action, and a close control.
- Submitting the built-in question “How do I connect my sending email?” succeeded anonymously after normal model latency.
- The answer remained grounded in approved product guidance, explicitly warned against entering passwords or API keys in chat, linked to the sending-email and Get Phame setup sources, and retained the human-support handoff.
- The panel remained readable within the desktop viewport and did not obscure access to its input, source links, support action, or close control.

## Protected mobile checks

- A disposable non-owner account authenticated through the application’s real revocable-session path reached `/send`; the fixture used a nonfunctional local SMTP record and no real credential.
- The page displayed one global Help Assistant launcher, labeled customer fields, a template selector, subject and body editors, character counters, reset control, selected platform, truthful rendered preview, and a full-width `Review & send` action at 390 px.
- Recipient-specific rendering replaced `{{customer_name}}`, `{{business_name}}`, and `{{review_link}}` in the final preview while retaining the editable placeholder source in the composer.
- The final dialog showed the exact recipient, rendered subject and body, three explicit compliance attestations, `Confirm & send`, and `Back to edit`. Confirmation was disabled before attestation and enabled only after all three boxes were checked.
- The verification harness monitored requests and confirmed that no `request.send` mutation occurred. It deliberately did not activate the final send action.
- Text remained legible and controls retained practical touch sizes at 390 px. The apparent mid-page bottom navigation in full-page evidence is a Playwright stitching artifact for fixed chrome; viewport screenshots and interactive checks used the normal fixed position.

## Remaining runtime checks

- Settled desktop recaptures at 1280 × 900 show the expected editor/live-preview two-column layout, readable fields, full-width review action, persistent navigation, and non-overlapping Help launcher with no clipping or ghost overlay.
- The settled final-review dialog is centered, fully opaque, and contained within the viewport. It shows the exact sender, recipient, rendered subject/body, three unchecked compliance attestations, a clearly disabled `Confirm & send` action, `Back to edit`, and a close control.
- Desktop Mailjet verification shows the selected provider, `in-v3.mailjet.com:587 · STARTTLS`, `Mailjet API key`, `Mailjet Secret key`, the account-password warning, setup-help link, and verified-sender guidance in a readable single-column form with no horizontal overflow; no credentials were entered or saved.
- At 390 px, the Mailjet form stacks cleanly with readable labels, a full-width provider selector, endpoint panel, and credential fields. DOM geometry initially confirmed that the authenticated Help launcher overlapped the 198.5 px fixed BottomNav. The launcher now uses an authenticated mobile offset that includes the safe area and full navigation height; its measured box ends at 634.2 px while the BottomNav begins at 645.5 px, so the two surfaces no longer overlap. Public pages retain a low safe-area edge position, and desktop keeps its existing bottom-right placement.
- Automated keyboard checks confirmed that `Tab` moves from the subject editor to the body editor and from the first compliance checkbox to the second; all final actions are semantic buttons.
