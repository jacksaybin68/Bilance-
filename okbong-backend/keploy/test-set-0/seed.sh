#!/usr/bin/env bash
#
# seed.sh — traffic generator for `keploy record` on the OKBong backend.
#
# It exercises the API in create → read → update order and chains the ids
# returned by POST into the later GET / PUT / PATCH calls, so the recording
# captures a realistic end-to-end flow and obtains the downstream DB mocks
# (user / bill / wallet rows) that replay needs.
#
# Usage (while `keploy record` is capturing):
#   BASE_URL=http://localhost:3001 ./seed.sh
#
# Every run generates unique emails / amounts (RUN_ID) so each recorded query
# is unambiguous and rows never collide across recordings.
#
# NOTE: this API exposes no DELETE route, so the chain ends at update+read-back.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"
RUN_ID="$(date +%s)-${RANDOM}"
PASSWORD="Keploy#12345"

USER_EMAIL="keploy.user.${RUN_ID}@okbong.local"
ADMIN_EMAIL="keploy.admin.${RUN_ID}@okbong.local"

USER_ID="" ADMIN_ID="" USER_TOKEN="" ADMIN_TOKEN="" WALLET_ID="" BILL_ID="" KYC_ID=""

say()  { printf '\n\033[1;36m== %s\033[0m\n' "$*" >&2; }
note() { printf '  -> %s\n' "$*" >&2; }
fail() { printf '\n\033[1;31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }

# call METHOD PATH [BODY] [TOKEN] — logs to stderr, prints the JSON body to stdout.
call() {
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local args=(-sS -X "$method" "$BASE_URL$path" -H 'Accept: application/json'
              -w $'\n%{http_code}')
  [[ -n "$body" ]]  && args+=(-H 'Content-Type: application/json' -d "$body")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")

  local raw status payload
  raw="$(curl "${args[@]}")" || fail "curl $method $path (connection error)"
  status="${raw##*$'\n'}"
  payload="${raw%$'\n'*}"

  if [[ "$status" != 2* ]]; then
    printf '  -> %s %s : HTTP %s\n%s\n' "$method" "$path" "$status" "$payload" >&2
    fail "$method $path returned HTTP $status"
  fi
  note "$method $path : HTTP $status"
  printf '%s' "$payload"
}

jget() { jq -r "$1"; }

# ─── 0. liveness / public reads ──────────────────────────────────────────────
say "public probes"
call GET /health >/dev/null
call GET /price/current >/dev/null

# ─── 1. users: create → login → read → update → read back ────────────────────
say "users: create"
USER_ID="$(call POST /users \
  "{\"email\":\"$USER_EMAIL\",\"password\":\"$PASSWORD\",\"fullName\":\"Keploy User\"}" \
  | jget .id)"
[[ -n "$USER_ID" && "$USER_ID" != null ]] || fail "no user id in response"
note "userId=$USER_ID"

say "users: login (regular user)"
USER_TOKEN="$(call POST /auth/login \
  "{\"email\":\"$USER_EMAIL\",\"password\":\"$PASSWORD\"}" | jget .accessToken)"
[[ -n "$USER_TOKEN" && "$USER_TOKEN" != null ]] || fail "no accessToken in login response"

say "users: read own profile"
call GET /auth/profile "" "$USER_TOKEN" >/dev/null
call GET /users/me  "" "$USER_TOKEN" >/dev/null

say "users: create admin (role is assignable at registration)"
ADMIN_ID="$(call POST /users \
  "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PASSWORD\",\"fullName\":\"Keploy Admin\",\"role\":\"admin\"}" \
  | jget .id)"
note "adminId=$ADMIN_ID"

say "users: login (admin)"
ADMIN_TOKEN="$(call POST /auth/login \
  "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PASSWORD\"}" | jget .accessToken)"
[[ -n "$ADMIN_TOKEN" && "$ADMIN_TOKEN" != null ]] || fail "no accessToken in admin login response"

say "users: admin read list + read one (chained id)"
call GET "/users?page=1&limit=10" "" "$ADMIN_TOKEN" >/dev/null
call GET "/users/$ADMIN_ID" "" "$ADMIN_TOKEN" >/dev/null

say "users: admin update (chained id) + read back"
call PUT "/users/$ADMIN_ID" '{"fullName":"Keploy Admin Updated"}' "$ADMIN_TOKEN" >/dev/null
call GET "/users/$ADMIN_ID" "" "$ADMIN_TOKEN" >/dev/null

# ─── 2. wallet: write → read → write → read ─────────────────────────────────
say "wallet: deposit (creates the wallet) "
WALLET_ID="$(call POST /wallet/deposit '{"amount":500000,"type":"e-wallet"}' "$USER_TOKEN" | jget .id)"
note "walletId=$WALLET_ID"

say "wallet: read balance + list + withdraw + transactions"
call GET /wallet/balance "" "$USER_TOKEN" >/dev/null
call GET /wallet         "" "$USER_TOKEN" >/dev/null
call POST /wallet/withdraw '{"amount":100000,"type":"e-wallet"}' "$USER_TOKEN" >/dev/null
[[ -n "$WALLET_ID" && "$WALLET_ID" != null ]] && \
  call GET "/wallet/$WALLET_ID/transactions" "" "$USER_TOKEN" >/dev/null

# ─── 3. bills: create → read → update → read back ───────────────────────────
say "bills: create (user)"
BILL_ID="$(call POST /bill \
  '{"amount":250000,"type":"recurring","description":"Keploy recurring bill"}' \
  "$USER_TOKEN" | jget .id)"
note "billId=$BILL_ID"

say "bills: read list + read one (chained id)"
call GET /bill            "" "$USER_TOKEN" >/dev/null
call GET "/bill/$BILL_ID" "" "$USER_TOKEN" >/dev/null

say "bills: admin update status (chained id) + read back"
call PATCH "/bills/$BILL_ID" '{"status":"paid","description":"Paid via keploy seed"}' \
  "$ADMIN_TOKEN" >/dev/null
call GET "/bills/$BILL_ID" "" "$ADMIN_TOKEN" >/dev/null

# ─── 4. KYC: create → read → status update ──────────────────────────────────
say "kyc: submit (user id chained) → read → approve"
KYC_ID="$(call POST /kyc \
  "{\"userId\":\"$USER_ID\",\"idNumber\":\"079123456789\",\"documentName\":\"Keploy User\"}" \
  | jget .id)"
note "kycId=$KYC_ID"
[[ -n "$KYC_ID" && "$KYC_ID" != null ]] && {
  call GET "/kyc/$KYC_ID" "" "$ADMIN_TOKEN" >/dev/null
  call POST "/kyc/$KYC_ID/status" '{"status":"approved"}' "$ADMIN_TOKEN" >/dev/null
}
call GET /kyc/pending-count "" "$ADMIN_TOKEN" >/dev/null

say "done — flow complete (no DELETE route exists in this API)"