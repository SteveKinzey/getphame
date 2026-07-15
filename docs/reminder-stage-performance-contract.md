# Reminder Stage and Performance Contract

## Settings and Defaults

The existing `followUpEnabled` field remains the master switch. Two additive profile fields, `followUpFirstEnabled` and `followUpSecondEnabled`, independently control stage 1 and stage 2. Both default to enabled so existing users retain their current behavior after migration.

The first delay remains the number of whole days after the original request. The second delay remains the number of whole days after the stage-1 milestone. Therefore, the projected stage-2 date is always `initialSentAt + firstDelayDays + secondDelayDays`, even when stage 1 is disabled. Disabling stage 1 skips the email; it does not pull stage 2 forward.

## Scheduling and Existing Pending Rows

New requests create rows only for enabled stages. Disabling a stage cancels that user's currently pending reminders for the matching sequence step. Re-enabling a stage affects future requests and does not recreate previously cancelled reminders. Delivery processing checks the current master and stage switches again before sending, so stale rows cannot bypass a newly disabled setting.

The managed hourly callback is `/api/scheduled/reminders`. It authenticates the heartbeat request, processes all due rows idempotently, and returns JSON. The legacy in-process `setInterval` entry point is removed for reminders.

## Projected Send Dates

The settings UI previews dates from a stable `initialSentAt` anchor captured when the editor loads. It shows localized date and time for both milestones and labels the assumption: **if the original request were sent now**. Disabled stages remain visible but are marked **Skipped**. Editing either delay or stage toggle updates the preview immediately without saving.

## Performance Attribution

Each newly scheduled reminder snapshots the full timing configuration: first delay, second delay, stage-1 enabled state, and stage-2 enabled state. Legacy sent reminders without snapshots are excluded from timing-configuration reporting rather than guessed.

The report uses real sent reminders only. A successful outcome is attributed to the latest sent reminder for a request whose `sentAt` is on or before the request's `respondedAt`. This last-touch rule prevents one response from being credited to multiple stages. Each configuration reports sent reminders, attributed outcomes, and `successRate = attributedOutcomes / sentReminders × 100` for the trailing 12 months.

The UI must show sample size beside every rate, provide an empty state when no attributable snapshot data exists, and label small samples so users do not over-interpret early results.

## Validation Gates

Schema defaults, independent toggles, cancellation behavior, cumulative timing, deterministic projected dates, snapshot persistence, last-touch attribution, empty states, low-sample messaging, responsive layout, TypeScript, Vitest, production build, and managed heartbeat authentication must all be verified before publication.
