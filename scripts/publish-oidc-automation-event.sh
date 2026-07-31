#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <event-json-file>" >&2
  exit 2
fi

body_file=$1
endpoint=${AUTOMATION_HEALTH_ENDPOINT:-}
audience=${AUTOMATION_HEALTH_AUDIENCE:-}

if [[ ! -r "$body_file" ]]; then
  echo "Event JSON file is not readable." >&2
  exit 2
fi

body_bytes=$(wc -c < "$body_file")
if (( body_bytes < 2 || body_bytes > 16384 )); then
  echo "Event JSON must be between 2 and 16384 bytes." >&2
  exit 2
fi

if [[ ! "$endpoint" =~ ^https://[^[:space:]]+$ ]]; then
  echo "AUTOMATION_HEALTH_ENDPOINT must be an HTTPS URL." >&2
  exit 2
fi

if [[ ! "$audience" =~ ^https://[^[:space:]]+$ ]]; then
  echo "AUTOMATION_HEALTH_AUDIENCE must be an HTTPS URL." >&2
  exit 2
fi

: "${ACTIONS_ID_TOKEN_REQUEST_URL:?GitHub OIDC request URL is unavailable}"
: "${ACTIONS_ID_TOKEN_REQUEST_TOKEN:?GitHub OIDC request token is unavailable}"

encoded_audience=$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$audience")
request_url="${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${encoded_audience}"

oidc_token=$(curl --silent --show-error --fail-with-body \
  --max-time 15 \
  --header "Authorization: bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" \
  "$request_url" | node -e '
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  const input = JSON.parse(raw);
  if (typeof input.value !== "string" || input.value.length < 32) process.exit(2);
  process.stdout.write(input.value);
});
')

curl --silent --show-error --fail-with-body \
  --retry 3 \
  --retry-delay 2 \
  --retry-all-errors \
  --max-time 20 \
  --header "Authorization: Bearer ${oidc_token}" \
  --header "Content-Type: application/json" \
  --data-binary "@${body_file}" \
  "$endpoint" >/dev/null

echo "Automation event published."
