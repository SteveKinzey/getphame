# Public Regression Diagnosis — 2026-07-16

## Verified failures

- The live `/admin` P-brand control is rendered as an anchor with the accessible label `View the Get Phame landing page`; the shared wrapper currently targets `/landing`.
- Connected-browser click automation dropped twice before reporting the destination, so implementation validation must also use source assertions and post-fix rendered checks.
- The landing PDF form called `leadCapture.submit` with `skinzey06@mac.com` and received HTTP 500.
- The exact failure is the `leads` insert at `server/routers.ts`: production `leads.createdAt` and `leads.guideSentAt` are `bigint`, while the TypeScript schema declares timestamps. The generated insert used `DEFAULT` for a live `createdAt bigint NOT NULL` column with no database default.
- `https://assets.getphame.app/getphame-guide.pdf` returns HTTP 404.
- No matching 30-day Get Phame review guide PDF exists in the local project, shared project files, Downloads, static-asset workspace, or the connected Google Drive search. Drive contains unrelated Phame presentation PDFs, which must not be substituted for the promised guide.

## Public layout and artwork audit

- The existing `PublicLayout` uses its own compact header and does not render the established landing footer.
- Applicable public routes are defined in `client/src/App.tsx`; landing uses its own Navbar/Footer while legal, login, payment-success, unsubscribe, changelog, and security pages use or should use the shared public layout as appropriate.
- The customer-import and review-tracking mockups contain the incorrect P-plus-separate-star mark.
- The hero app screenshot and email-preview mockup do not contain that defect.
- Exact corrected customer-import and review-tracking assets were created using the approved standalone Get Phame P-mark reference. The customer-import replacements were uploaded to permanent web project storage; the review-tracking replacements still require upload.

## Required repair contract

- Do not substitute unrelated Drive PDFs. Create the promised 30-day review guide, verify it visually, upload it to permanent storage, and use that URL in both the email and direct-download fallback.
- Reconcile the Drizzle `leads` schema with the live bigint contract and write millisecond timestamps explicitly.
- A stored lead must receive either successful guide email delivery or an immediate working download link; delivery failure must never produce a false “check your inbox” message.
- Keep the public landing header/footer design consistent across applicable public pages, with a full-width footer and the exact approved copyright statement.

## Rendered preview findings

The authenticated preview resolves `/` to the private dashboard, so it is not a valid landing-page verification path for a signed-in administrator. The public landing is rendered at `/landing`; the admin P control must use a hard browser navigation to that public alias so it cannot remain inside the authenticated route state.

The `/landing` full-page preview confirms the landing sections render, but the fixed header is visually compressed at the captured desktop scale and the footer copyright is too small and pushed into the far-right edge of a three-column row. The copyright must become a dedicated, centered full-width bottom row with the legal and support links above it. Public legal pages now inherit the shared Navbar and Footer through `PublicLayout`, but the security policy page has a pre-existing light-background/light-text contrast defect that must not be mistaken for successful footer coverage.

The changelog is an authenticated utility page with its own app-style header and no public footer; it should not be treated as a public marketing route. Privacy, terms, security, login, payment-success, unsubscribe, and other truly public utility routes must use `PublicLayout` when their route-specific behavior allows it.
