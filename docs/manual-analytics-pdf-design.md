# Manual Search Analytics and PDF Export Contract

## Zero-result search analytics

Get Phame records an event only when an authenticated user enters a normalized query of 2–100 characters, the role-visible Manual returns zero topics, and the query remains unchanged for the debounce interval. The client sends only the normalized query, resolved supported locale, active role-derived Manual scope, and Manual content version. It never sends customer records, contact data, page referrers, user-agent strings, or Manual result content.

The server derives the account ID from the authenticated session, verifies that the submitted Manual scope matches the account role, normalizes the query again, and hashes the normalized query for deduplication. A unique daily key counts the same account, normalized query, locale, and Manual scope at most once per UTC day. A bounded in-memory limiter rejects more than 60 attempted Manual analytics writes per account per hour.

The dedicated table stores the account ID for server-side deduplication only. Administrator reporting never returns account IDs, raw rows, or deduplication hashes. It returns grouped query text, role scope, locale, count, and most recent timestamp for a selectable 30-, 90-, or 365-day window. Opportunistic cleanup removes events older than 365 days without requiring a background worker.

## PDF exports

The browser generates PDFs from the role-visible, locale-resolved Manual document already loaded by the page. A full export includes every visible section; a section export includes only the chosen section. Neither endpoint nor query parameter can request the other role’s Manual.

Each PDF contains the official text-rendered GET PHAME lockup, Manual title, selected scope, locale, generation date, last-updated date, section summaries, access labels, topic descriptions, numbered steps, notes, and feature paths. Deterministic filenames include the role scope, locale, and section slug where applicable. Unicode fonts are loaded only for Thai or CJK content through the existing same-origin font endpoints. Object URLs are revoked after download, and the interface exposes pending, success, and error feedback.

## Access model

Standard accounts may write zero-result events for the User Manual and export only User Manual content. Administrators may write events for the Admin Manual, view aggregate missing-topic analytics, and export only the Admin Manual. The existing single `/manual` route remains the only Manual route.
