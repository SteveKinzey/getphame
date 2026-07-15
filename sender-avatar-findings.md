# Sender Avatar Findings

## Verified source behavior

- Gmail search for `from:(no-reply@getphame.app)` displayed the legacy personal headshot next to a Google contact result named **Steve Kinzey**.
- Opening the Gmail contact card showed `no-reply@getphame.app` grouped with Steve's personal and business email addresses and phone number.
- Google Contacts search for `no-reply@getphame.app` returned a person/contact aggregate whose embedded contact data includes `no-reply@getphame.app`, the other Get Phame aliases, Steve's personal/business addresses, and Google profile identifier `114464332113887023303`.
- This demonstrates that the headshot shown in Steve's Gmail is supplied by Google Contacts/profile resolution, not by the Get Phame PWA favicon, manifest, Open Graph image, or email HTML.

## Application sender pipeline

- `/home/ubuntu/review-rocket/server/auth-email.ts` reads the platform SMTP identity from `SYSTEM_SMTP_*` and `SYSTEM_FROM_EMAIL`.
- Platform email HTML uses `renderGetPhameEmailHeader(...)` for the in-message logo/header. The image inside the email body is independent from the circular inbox sender avatar chosen by Gmail.
- The current platform sender is displayed as **GetPhame** with the configured `SYSTEM_FROM_EMAIL`; the user reports and Gmail confirms the relevant address is `no-reply@getphame.app`.

## Authoritative user-supplied artwork

- Source: `/home/ubuntu/upload/getphame-logo.svg`
- Source SHA-256: `c750c13570a4a7cc0d8b5c9e007e83c0f0d69dfb7f75cffa484884cb7bbe1116`
- Google-compatible deterministic PNG: `/home/ubuntu/webdev-static-assets/getphame-contact-avatar-user-supplied.png`
- PNG properties: 1024×1024 RGBA
- PNG SHA-256: `6cf39301b389a620499a7d35aecc568feb6a7de78f61fa0eaba08e43f4aad9a1`

## Provider limitation

- Replacing Steve's Google Contact/profile image can correct Steve's Gmail view but does not guarantee a branded avatar for every recipient.
- A domain-wide sender logo in supporting mailbox providers requires sender-authentication alignment and BIMI-compatible DNS/logo/certificate configuration; mailbox providers may cache sender identity images.

## Post-change verification — 2026-07-15

- Direct Google Contacts URL resolved from Gmail contact ID: `https://contacts.google.com/contact/66afed6f89fa7a42`, which redirects to `https://contacts.google.com/no-reply@getphame.app`.
- The contact page now visibly shows the exact user-supplied gold P-star artwork and the contact name **Get Phame**.
- The same page also exposes a linked Google Workspace **Directory profile** containing Steve's personal/business addresses and phone. Google states the directory profile was matched using `+19092556898`; this identity aggregation is the remaining source of Gmail's old headshot/name resolution.
- A fresh production magic-link message was sent after the contact update. Gmail received it at 6:17 AM, displays the thread label **GetPhame**, and still showed the legacy Steve headshot in the aggregated search header immediately after the update.
- This confirms the new contact/photo is saved correctly, while Gmail's aggregated directory/profile cache has not yet switched. The app's email body and From display name are already branded; the circular inbox avatar remains provider-controlled.

## Google Workspace Admin verification — 2026-07-15

- The authenticated Admin console user list currently contains only two Workspace users: `steve@sk-america.com` and `michael@a1websitepros.com`.
- The attempted **Get Phame** user was not created. The Add user dialog shows `no-reply@getphame.app` with the validation error: **“This is an existing alternate email (email alias) for a user.”**
- The safe migration sequence is to remove `no-reply@getphame.app` from Steve's alternate-email list, create a separate Get Phame user with a non-conflicting primary address, and then attach `no-reply@getphame.app` to that new user as its alternate email.
- The production application can retain the visible From address `no-reply@getphame.app` while its SMTP authentication principal changes to the new Get Phame user.
- Steve's Admin profile confirms **3 assigned licenses**: Google Workspace Business Plus, Google Voice Standard, and Cloud Identity Free.
- The alternate-email editor is open and exposes individual delete controls for each alias. The first visible entries include `workspace@sk-america.com`, `info@sk-america.com`, `steve@herostyle.org`, `info@vonrebelapparel.com`, `spoof@sk-america.com`, `octh@sk-america.com`, and `support@prompto.botflowlab.com`; `no-reply@getphame.app` is farther down the scrollable editor and has not yet been removed.

## Dedicated sender account creation — verified 2026-07-15

- The Admin workflow successfully removed the conflicting `no-reply@getphame.app` alternate email from Steve and created a dedicated Workspace user named **Get Phame** with primary username `no-reply@getphame.app`.
- Google states the new user will be assigned a license based on the current Workspace subscriptions.
- Google generated a strong temporary password; it remains sensitive and is intentionally not recorded in this file or exposed in chat.
- The creation confirmation still showed the default gray profile avatar, so the exact user-supplied P-star artwork must be applied from the dedicated user's profile.
- Next steps: finish the confirmation, open the new user, upload the exact P-star avatar, establish SMTP-safe credentials for the dedicated identity, update the production SMTP secrets, and inspect a fresh message.
- The new account is now active in the Workspace directory at `https://admin.google.com/ac/users/3jtnz0s24c1dw9` and appears as **Get Phame / no-reply@getphame.app / Active (Added recently)**.
- The account has not signed in and still displays Google’s generic gray profile avatar; the exact supplied P-star artwork remains the next required change.
