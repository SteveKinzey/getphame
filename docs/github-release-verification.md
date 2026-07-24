# Get Phame GitHub Release Verification

**Commit:** `985cdb6e5947be470ddcdf25b2f13b9cedac89e5`

**Repository:** <https://github.com/SteveKinzey/getphame>

**Actions page:** <https://github.com/SteveKinzey/getphame/actions>

| Workflow | Run | Observed result |
| --- | --- | --- |
| API Recovery Browser Check | [Run 30109619578](https://github.com/SteveKinzey/getphame/actions/runs/30109619578) | Passed in 1m 39s. |
| Quality Gate | [Run 30109619465](https://github.com/SteveKinzey/getphame/actions/runs/30109619465) | Failed in 1m 50s because CI did not provide `JWT_SECRET` to one fingerprint test. |

The live readiness endpoint <https://getphame.app/api/health> returned HTTP 200 with `{"ok":true,"status":"ready"}` after the managed release checkpoint.

## Quality Gate Diagnosis

The application correctly fails closed when fingerprint signing material is absent. The managed release suite passed because managed secrets are injected there, while the private GitHub runner had no equivalent test-only value. The workflow now generates random ephemeral signing material for each run and exports it only to that runner through `GITHUB_ENV`. No production credential or reusable secret is stored in source, logs, or workflow configuration.
