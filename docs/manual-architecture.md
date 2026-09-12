# Get Phame Role-Exclusive Manual Architecture

## Route and visibility model

Get Phame exposes one authenticated route: `/manual`. The route does not accept a role, manual type, or impersonation query parameter. It reads the authenticated role from `useAuth()` and renders exactly one document.

| Authenticated role | Visible document | Navigation label | Hidden document           |
| ------------------ | ---------------- | ---------------- | ------------------------- |
| `user`             | User Manual      | User Manual      | Admin Manual              |
| `admin`            | Admin Manual     | Admin Manual     | Separate User Manual view |

The Admin Manual is a content superset, not a second selectable manual. It composes the same shared user sections with additional administrator-only sections. The page contains no role switcher, tabs, links, or URL state that could expose the other document identity.

## Content model

Manual content is stored in locale-specific, typed JSON documents. Each locale contains:

- `sharedSections`: all user guidance, including Free and paid capabilities.
- `adminSections`: administrator-only procedures.

`getManualDocument(locale, role)` returns only `sharedSections` for ordinary users and returns `sharedSections` followed by `adminSections` for administrators. Administrator sections carry `access: "admin"`; paid subscription items carry `access: "paid"`; universally available items carry `access: "all"`.

Each section contains a stable `id`, title, summary, optional route, and ordered topics. Each topic contains a stable `id`, title, explanatory body, ordered steps, optional notes, and an access classification. IDs remain identical across all seven locales so deep links, search, and automated parity checks are deterministic.

## Subscription communication

The manual documents both Free and paid capabilities for every user, regardless of the signed-in account’s current tier. It never hides paid guidance. Instead, each paid-only topic displays an explicit **Paid subscription only** badge and states the relevant entitlement or Free limitation in the topic body.

The authoritative entitlement source is `shared/plans.ts`, `server/entitlements.ts`, the Upgrade comparison, and current Settings gates. The manual does not infer subscription status from marketing copy.

## Interface behavior

The page uses a searchable section index and anchored topic navigation. Search operates only over the role-appropriate document already selected by authenticated role. A role-specific eyebrow and page title identify the current manual without offering the other manual.

Desktop uses a sticky section index beside the document. Mobile uses a full-width search field and horizontally scrollable section shortcuts. Every topic heading is linkable, every control is keyboard reachable, and search-result counts are announced through an `aria-live` region.

## Navigation placement

Desktop and mobile navigation insert one role-appropriate Manual item immediately after Settings. Administrators see `Admin Manual`; ordinary users see `User Manual`. Both items navigate to `/manual`.

## Access and regression contract

Automated tests must prove all of the following:

1. The application registers only `/manual`; it does not register `/admin/manual` or `/user/manual`.
2. `getManualDocument(locale, "user")` contains no administrator sections, labels, or topic IDs.
3. `getManualDocument(locale, "admin")` includes every shared user section and every administrator section.
4. The page has no role selector or role override input.
5. The navigation item appears immediately after Settings and uses the authenticated role to choose its label.
6. Every paid-only topic renders an explicit paid-subscription badge.
7. Every locale has the same section/topic IDs and access classifications as English.
8. Direct navigation to `/manual` remains inside the authenticated shell; unauthenticated visitors follow the existing sign-in flow.

## Non-goals

This release does not create a public manual, downloadable PDF, manual-completion analytics, or separate user/admin routes. Those may be added later without changing the role-exclusive content contract.
