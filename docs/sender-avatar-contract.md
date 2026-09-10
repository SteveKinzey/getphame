# Sender Avatar Contract

Get Phame treats mailbox profile images as **Workspace-managed identity**, not application email-template data.

| Sender account          | Required avatar                                    | Ownership                                               |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| `no-reply@getphame.app` | Official gold Get Phame P icon                     | Managed on the separate Google Workspace sender account |
| `steve@sk-america.com`  | Steve's chosen headshot or SK-America company icon | Managed independently on Steve's Workspace account      |

The application may set the SMTP **From** display name, address, and Reply-To behavior. It may also render Get Phame branding inside an email body. It must not upload, replace, copy, or infer either mailbox avatar, and it must never substitute a Get Phame user's in-app account photo for a Workspace sender avatar.

The `no-reply@getphame.app` mailbox should be configured with the official P icon in Google Workspace. The `steve@sk-america.com` mailbox remains an independent identity and can use either Steve's headshot or the SK-America company icon when Steve decides.
