# SMTP Mail Management Validation

## Scope

This change adds a bounded post-save SMTP diagnostic email, a tenant-scoped mail-server health badge on the dashboard, and a confirmed disconnect/reset path in Settings. The reusable `tenant-owned-mail-connections` skill was updated and validated separately.

## Validation evidence

| Check                                                                 | Result                                                                                                                                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused rate-limit, routing, dashboard-health, and localization tests | Passed: 4 files, 7 tests                                                                                                                                                                       |
| Complete regression suite                                             | Passed: 217 files; 1 skipped. 1,130 tests passed; 7 skipped                                                                                                                                    |
| TypeScript                                                            | Server and client checks passed after pausing the local watcher to release memory                                                                                                              |
| Production build                                                      | Passed                                                                                                                                                                                         |
| Desktop dashboard review                                              | The authenticated dashboard rendered the visible **Mail server healthy** badge with the expected Settings affordance.                                                                          |
| Desktop Settings review                                               | The authenticated Settings route rendered successfully. The initial viewport covers account and security sections; deep mail controls remain covered by focused component and route contracts. |
| Mobile dashboard review                                               | The responsive dashboard rendered the full-width **Mail server healthy** badge with readable status copy and a Settings affordance.                                                            |
| Mobile Settings review                                                | A successful full-page mobile capture included the SMTP card, the chosen-recipient test-email control, and the confirmed disconnect/reset control without horizontal overflow.                 |

## Security boundaries observed

The new `smtp.sendTestEmail` operation is protected, validates a user-provided email recipient, is limited to five requests per user per hour, and calls the saved personal SMTP path. The reset operation retains server-side credential deletion plus clearing the explicit personal outbound-delivery preference. Neither path returns or renders stored secrets.
