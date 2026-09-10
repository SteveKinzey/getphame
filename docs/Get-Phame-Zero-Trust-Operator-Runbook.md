# Get Phame Zero-Trust Operator Runbook

**Release status:** Validated and live  
**Production application:** [https://getphame.app](https://getphame.app)  
**Operator settings:** [https://getphame.app/settings](https://getphame.app/settings)  
**Recovery drill:** Staging only; production hosts are denied by code

## 1. Purpose and Safety Boundary

This runbook activates Get Phame passkeys and executes the separated-duty owner-account recovery drill. Passkeys are additive: magic-link sign-in remains available as a fallback. The recovery drill is deliberately unavailable on `getphame.app`, `www.getphame.app`, `getphame.manus.space`, and `revrocket-j5ynazte.manus.space`.

> Never test recovery with production records, customer data, production cookies, credentials, API keys, recovery artifacts, or notification destinations. Use one explicitly approved non-production host and synthetic staging data only.

The recovery control fails closed unless both deployment settings are present through managed secrets or environment configuration:

| Setting                        | Required value                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `RECOVERY_DRILL_MODE`          | Exactly `staging`                                                              |
| `RECOVERY_DRILL_ALLOWED_HOSTS` | Exact non-production host allowlist; never include a production Get Phame host |

Do not put configuration values or credentials in tickets, source code, screenshots, evidence notes, or this document.

## 2. Roles and Separation of Duties

| Role                     | Assigned operator                                  | Allowed duties                                                                 | Prohibited duties                                                       |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Recovery Custodian**   | **Steve**, using the active platform-owner account | Prepare, start, record evidence, contain, complete, or abort the staging drill | Cannot approve the request                                              |
| **Independent Approver** | A different named lead engineer                    | Review and approve or reject; may abort an unsafe drill                        | Cannot prepare, start, record completion evidence, or complete recovery |
| **Observer**             | Optional security or operations reviewer           | Review sanitized evidence outside the execution path                           | Cannot mutate the drill                                                 |

Get Phame enforces one actor per duty and prevents the same user from holding two duties in one drill through database uniqueness constraints. The approver receives only `recovery.drill.view` and `recovery.drill.approve`, for no more than four hours. Completion, rejection, or abort revokes temporary recovery assignments and overrides.

## 3. Activate Passkeys

### 3.1 Steve: enroll two independent passkeys

1. Sign in to [Get Phame](https://getphame.app) using the normal magic-link flow.
2. Open **Settings → Passkeys** at [https://getphame.app/settings](https://getphame.app/settings).
3. Enter a recognizable device name, such as `Steve — work laptop`.
4. Select **Create passkey** and complete the browser or operating-system prompt.
5. Repeat on an independent authenticator, such as a phone, tablet, security key, or separately protected device. Avoid two labels that conceal where the credentials live.
6. Confirm both entries appear under **Saved passkeys**.
7. Sign out. Sign in with the first passkey, then repeat with the second passkey in a separate verification window.

The staging drill cannot be prepared unless Steve has at least **two active passkeys**. Do not remove the last usable passkey during rollout. Use **Rename** to maintain clear device labels. Use **Remove** only after confirming another enrolled passkey works.

### 3.2 Lead engineer: enroll one passkey

1. Choose one named lead engineer who is not Steve and is authorized to review the staging exercise.
2. The lead engineer must first sign in to Get Phame so the account exists.
3. Open **Settings → Passkeys** and create at least one passkey.
4. Sign out and verify passkey sign-in succeeds.
5. Share only the account email with Steve through the approved internal channel. Do not place the address in drill evidence.

## 4. Prepare the Staging Environment

Before enabling the deployment-controlled drill switch, verify every item below.

- The host is clearly non-production and is not one of the four blocked production hosts.
- The tenant, users, records, email destinations, and notifications are synthetic or explicitly approved for staging.
- Production secrets, customer records, cookies, recovery codes, and credentials are absent.
- Steve has an active `platform_owner` grant and two working passkeys.
- The named lead engineer has a different user account and one working passkey.
- Backup, rollback, incident contacts, and stop conditions are published for the exercise window.
- The exact staging host is configured in `RECOVERY_DRILL_ALLOWED_HOSTS`; wildcard hosts are not used.
- `RECOVERY_DRILL_MODE=staging` is enabled only for the exercise environment.

After configuration, open `https://<approved-staging-host>/settings`. The **Staging recovery drill** card must show **Allowed staging host**. If it reports that the host is unavailable, stop and correct deployment configuration; do not bypass the gate.

## 5. Prepare and Approve the Drill

Sensitive actions require a passkey-authenticated A2 session from the previous **15 minutes**. If the card reports that recent passkey verification is missing, sign out, sign in with a passkey, and return to Settings.

### 5.1 Steve prepares the request

1. Sign in to the approved staging host with a passkey.
2. Open **Settings → Staging recovery drill**.
3. Confirm the card shows:
   - environment: **Allowed staging host**;
   - role: **Platform owner** or **Recovery Custodian**;
   - status: **Not prepared** or a closed prior drill.
4. Under **Prepare separated-duty drill**, enter:
   - a sanitized title;
   - the lead engineer's Get Phame account email;
   - a scheduled time between **5 minutes and 3 hours** from the current time;
   - optional redacted operator notes.
5. Select **Prepare staging drill**.

Preparation assigns **Steve — Recovery Custodian**, assigns the different lead engineer as **Independent Approver**, opens a pending dual-control request, and starts the four-hour narrow-approval window. Only one open staging drill may exist.

### 5.2 The lead engineer independently decides

1. The lead engineer signs in to the same staging host with a passkey within 15 minutes of acting.
2. Open **Settings → Staging recovery drill**.
3. Confirm the displayed role is **Independent Approver** and the custodian is a different person.
4. Validate the environment, synthetic-data boundary, timing, backup, rollback, and stop conditions.
5. Enter a sanitized decision rationale of at least three characters.
6. Select **Approve** only if every prerequisite is satisfied. Select **Reject** if any prerequisite is missing.

Rejection closes the drill and revokes temporary recovery access. Approval does not start recovery; Steve must perform the separate start action.

## 6. Execute the Approved Drill

### 6.1 Start

1. Steve signs in with a passkey again if the 15-minute A2 window has expired.
2. Open the drill and confirm the independent decision is **Approved**.
3. Select **Start approved drill**.

Get Phame changes the status to **In progress**, marks the dual-control action executed, and automatically records passing `preflight` evidence.

### 6.2 Run negative tests

Execute each test using synthetic staging identities and artifacts. A secure result is a denial or containment result, not successful unauthorized access.

| Test                                                            | Expected result                                                 | Evidence type               |
| --------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------- |
| Attempt email-only sensitive recovery                           | Denied; recent passkey A2 remains required                      | `step_up_verification`      |
| Reuse an expired or revoked session                             | Denied                                                          | `revoked_session_denial`    |
| Reuse a revoked passkey or credential                           | Denied                                                          | `revoked_credential_denial` |
| Attempt access from the wrong synthetic tenant                  | Denied                                                          | `tenant_isolation`          |
| Attempt self-approval                                           | Denied                                                          | `audit_verification`        |
| Attempt recovery from a support-only account                    | Denied; no owner impersonation or factor reset                  | `audit_verification`        |
| Enroll a new owner authenticator through the approved path      | New authenticator works; old compromised access remains revoked | `replacement_enrollment`    |
| Verify containment controls without triggering a stop condition | Controls and rollback path are ready                            | `containment`               |

### 6.3 Record evidence

For each test, use **Record redacted evidence** and select the correct type and outcome. Use only sanitized references such as an audit-event ID, ticket ID, timestamp, or synthetic object reference.

Acceptable example: `audit-event:evt_123 at 14:05 UTC`.

Never enter email addresses, tokens, cookies, passwords, credentials, challenges, private keys, JWTs, API keys, biometric data, or customer identifiers. The application rejects common secret and personal-identifier patterns, but operators remain responsible for data minimization.

The following evidence must have a **Passed** or **Contained** result before completion:

1. `containment`
2. `revoked_session_denial`
3. `revoked_credential_denial`
4. `tenant_isolation`
5. `replacement_enrollment`
6. `step_up_verification`
7. `audit_verification`

Record `rollback`, `stop_condition`, and `after_action` evidence when applicable. They are valuable but are not substitutes for the seven completion gates.

> For a successful exercise, record verification of containment capability as `containment` evidence. Select **Contain drill** only when a real stop condition occurs. Containment pauses execution and should be followed by a controlled abort under the current workflow.

## 7. Stop Conditions and Rollback

Contain immediately if any of the following occurs:

- The request reaches a production host, production tenant, customer record, or production notification destination.
- A secret, cookie, credential, recovery artifact, biometric value, or customer identifier would need to be recorded.
- Self-approval, cross-tenant access, support impersonation, or bypass of recent passkey A2 succeeds.
- Revoked sessions or credentials remain usable.
- The approver receives permissions beyond view and approve, or temporary access survives its intended window.
- Audit events are missing, the expected backup is unavailable, or rollback cannot be demonstrated.
- Any operator cannot explain the current drill state or safe next action.

### Containment procedure

1. Steve enters a sanitized reason and selects **Contain drill**.
2. Confirm the status changes to **Paused** and a `containment` record is written.
3. Stop all drill actions and preserve sanitized identifiers and timestamps.
4. Execute the approved staging rollback procedure.
5. Steve or the Independent Approver enters a sanitized reason and selects **Abort drill**.
6. Confirm the status is **Aborted** and temporary assignments and permission overrides are revoked.
7. Escalate through the published incident contact if the boundary failure could affect production.

The Independent Approver may abort an unsafe open drill even though the approver cannot start or complete it.

## 8. Complete and Close

When all required evidence is present and no stop condition occurred:

1. Steve reviews the evidence log for the seven required passing or contained evidence types.
2. Confirm the replacement authenticator works and compromised sessions and credentials remain revoked.
3. Record any sanitized `after_action` or `rollback` evidence needed before closure.
4. Select **Complete and revoke access**.
5. Confirm the status changes to **Completed**.
6. Confirm the lead engineer's temporary recovery controls disappear or become unavailable.
7. Confirm audit events exist for preparation, independent approval, start, evidence, and completion.
8. Remove or disable the staging deployment switch after the exercise window unless another approved drill is imminent.

Completion atomically closes the drill and revokes temporary staging assignments and approver overrides. If the application reports missing evidence, record the named evidence type; never fabricate or relabel a result merely to satisfy closure.

## 9. Troubleshooting

| Message or condition                | Action                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Unavailable on this host**        | Verify `RECOVERY_DRILL_MODE=staging` and the exact non-production host allowlist. Never add a production host. |
| **Recent passkey sign-in required** | Sign out, sign in with a passkey, and return within 15 minutes.                                                |
| Approver account not found          | The lead engineer must sign in to Get Phame before assignment.                                                 |
| Custodian needs two passkeys        | Steve enrolls and verifies a second independent passkey.                                                       |
| Approver needs a passkey            | The lead engineer enrolls and verifies one passkey.                                                            |
| Schedule rejected                   | Choose a time 5 minutes to 3 hours from now.                                                                   |
| Open-drill conflict                 | Complete or abort the current staging drill before preparing another.                                          |
| Narrow approver access expired      | Abort the stale drill and prepare a new request; do not extend access manually.                                |
| Completion reports missing evidence | Record a genuine passing or contained result for each named required type.                                     |

## 10. Operating Cadence

Run a **quarterly tabletop** and a **semiannual technical staging drill**. Repeat the technical drill after material authentication, authorization, session, tenant-isolation, recovery, or incident-response changes. Track every after-action item with a named owner and due date.

The authoritative release evidence is in `docs/zero-trust-release-validation.md` and `docs/github-release-verification.md`.
