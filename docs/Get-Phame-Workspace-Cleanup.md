# Get Phame Workspace Cleanup

**Prepared:** July 22, 2026
**Objective:** Use `getphame` as the workspace name without breaking the managed deployment or destroying local files.

## Managed workspace

The managed application is registered internally at `/home/ubuntu/review-rocket`. Its project metadata, canonical remote, preview service, checkpoint history, and rollback flow depend on that path. Physically renaming the managed directory would create avoidable deployment risk.

A safe developer-facing alias now exists:

```text
/home/ubuntu/getphame -> /home/ubuntu/review-rocket
```

Commands can use `/home/ubuntu/getphame`, while the managed platform continues using its registered path. The alias resolves to the same Git worktree, branch, files, and history; it is not a duplicate checkout.

The package is already correctly named `get-phame` with display name `Get Phame`. The selected private GitHub repository is `SteveKinzey/getphame`, and its repository root is not nested inside another `getphame` directory.

## Mac workspace

The desired local root is:

```text
/Users/skinzey/code/getphame
```

The desktop folder binding did not expose this path to the managed Linux workspace, so the cleanup was completed locally with guarded commands and user-confirmed output. A dry-run-first normalizer remains included as `normalize-getphame-path.sh` for repeatable use. It handles three cases safely:

| Detected state                                          | Result                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/Users/skinzey/code/getphame` is already the Git root  | No change.                                                                                                   |
| The Git root is `/Users/skinzey/code/getphame/getphame` | The outer folder is renamed to a timestamped backup, and the inner Git root is promoted to the desired path. |
| The structure is ambiguous                              | The script stops without changing anything.                                                                  |

The script never deletes the old wrapper. Any outer-folder files remain in a timestamped sibling backup for manual review.

### Verified outcome

The local Git root is now `/Users/skinzey/code/getphame`. The prior outer checkout at commit `26bca7225ecb5448c22c2a85e1acc729dbd35151` was verified as an ancestor of the canonical checkout at commit `caad25ec6778da7cc13bfa0c18598b9e27eecc5a`, with no tracked or staged changes, before removal.

The prior checkout's unique `zero_trust_docs/` content was preserved under the canonical repository's `docs/zero-trust/` directory for review. Six untracked Get Phame brand assets were moved out of deployable `client/public` into the sibling staging directory `/Users/skinzey/code/getphame-assets/icons`. The redundant timestamped checkout was then removed. No Git history or unique untracked content was discarded.

## Recommended use

First run a dry inspection:

```bash
bash normalize-getphame-path.sh
```

If the printed plan is correct, apply it:

```bash
bash normalize-getphame-path.sh --apply
```

Afterward, verify:

```bash
cd /Users/skinzey/code/getphame
git rev-parse --show-toplevel
git status --short
```

The expected Git root is `/Users/skinzey/code/getphame`. On July 22, 2026, the preserved wrapper content was reviewed and consolidated, and the redundant checkout was removed only after its tracked state and unique untracked files were accounted for.
