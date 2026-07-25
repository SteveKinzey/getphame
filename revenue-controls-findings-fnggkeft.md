# Revenue Controls Implementation Findings

- The authenticated shell lazy-loads administrator pages from `client/src/App.tsx`; the new unified route should be `/admin/revenue-controls` and remain inside `AppLayout`.
- Administrator discovery currently starts from the Operations card grid in `AdminDashboard.tsx`; add a dedicated **Revenue controls** card beside Revenue analytics rather than overloading analytics.
- `AdminPromotions.tsx` already establishes the live Stripe promotion monitor, refresh behavior, copy action, status badges, plan labels, loading/error/empty states, and navy/gold mobile-first page shell.
- The unified page should retain real Stripe data as the source of truth, add a controlled create form, and invalidate the live monitor after successful creation.
- Complimentary grants need a separate controlled form, exact-email lookup, status filter, masked-email list, expiry display, and active-only revocation. Plaintext customer email must never be rendered after submission or persisted.
- The signed-in profile now exposes `hasPaidAccess` and `complimentaryAccessExpiresAt` so feature UI can honor temporary access without changing the customer’s billing tier.
- Existing admin pages redirect non-administrators and also render a safe admin-required state; the new page should preserve both safeguards.
- Get Phame visual rules remain navy/gold, mobile-first, keyboard accessible, with the official shared brand component rather than a generated mark.
