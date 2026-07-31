# Tone Comparison QA Notes

- Desktop `/send` at 1280×720: the Send Request composer, AI tone entry point, and current email preview render without visual regressions.
- Mobile `/send` at 375×812: the composer remains readable above the mobile navigation; the AI tone entry point remains reachable in the editing flow.
- The comparison modal is covered by focused helper, UI-contract, and localization tests. Its desktop two-column grid collapses to a stacked mobile layout through the `md:grid-cols-2` breakpoint.
- Enhanced comparison release: desktop and mobile `/send` captures confirm that the AI tone-adjustment entry point, composer controls, and surrounding hierarchy remain readable and reachable after adding the changed-only, clipboard, and rationale behaviors.
- The response-dependent dialog states are covered by focused diff-helper, AI-response, UI-contract, and localization regression tests; the dialog preserves its existing responsive two-column/stacked layout behavior.
