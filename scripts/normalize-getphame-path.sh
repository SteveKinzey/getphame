#!/usr/bin/env bash
set -euo pipefail

parent="/Users/skinzey/code"
outer="$parent/getphame"
nested="$outer/getphame"
apply=false

if [[ "${1:-}" == "--apply" ]]; then
  apply=true
elif [[ $# -gt 0 ]]; then
  printf 'Usage: %s [--apply]\n' "$0" >&2
  exit 2
fi

git_root() {
  git -C "$1" rev-parse --show-toplevel 2>/dev/null || true
}

if [[ ! -d "$parent" ]]; then
  printf 'Stop: parent directory does not exist: %s\n' "$parent" >&2
  exit 1
fi

outer_root="$(git_root "$outer")"
nested_root="$(git_root "$nested")"

if [[ "$outer_root" == "$outer" ]]; then
  printf 'Already clean: %s is the Git root. No change needed.\n' "$outer"
  exit 0
fi

if [[ "$nested_root" != "$nested" ]]; then
  printf 'Stop: expected nested Git root was not found at %s. No files changed.\n' "$nested" >&2
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup="$parent/getphame-wrapper-backup-$timestamp"

printf 'Detected nested Git root: %s\n' "$nested"
printf 'Planned wrapper backup: %s\n' "$backup"
printf 'Planned final Git root: %s\n' "$outer"

if [[ "$apply" != true ]]; then
  printf 'Dry run only. Re-run with --apply to perform these non-destructive moves.\n'
  exit 0
fi

if [[ -e "$backup" ]]; then
  printf 'Stop: backup path already exists: %s\n' "$backup" >&2
  exit 1
fi

mv "$outer" "$backup"
mv "$backup/getphame" "$outer"

final_root="$(git_root "$outer")"
if [[ "$final_root" != "$outer" ]]; then
  printf 'Unexpected result: final Git root is %s\n' "$final_root" >&2
  printf 'The original wrapper remains preserved at %s\n' "$backup" >&2
  exit 1
fi

printf 'Complete: %s is now the Git root.\n' "$outer"
printf 'Preserved wrapper backup: %s\n' "$backup"
printf 'Review the backup manually; this script deletes nothing.\n'
