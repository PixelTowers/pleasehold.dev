#!/bin/sh
# ABOUTME: Conditional Infisical secret injection for Docker containers.
# ABOUTME: Wraps the CMD with `infisical run` when credentials are present, passes through otherwise.

set -e

if [ -n "$INFISICAL_CLIENT_ID" ] && [ -n "$INFISICAL_CLIENT_SECRET" ]; then
  INFISICAL_TOKEN=$(infisical login --method=universal-auth \
    --client-id="$INFISICAL_CLIENT_ID" \
    --client-secret="$INFISICAL_CLIENT_SECRET" \
    --domain="${INFISICAL_DOMAIN:-https://secrets.pixeltowers.io}" \
    --plain --silent)

  exec infisical run \
    --token="$INFISICAL_TOKEN" \
    --env="${INFISICAL_ENV:-production}" \
    --path="${INFISICAL_PATH:-/}" \
    --domain="${INFISICAL_DOMAIN:-https://secrets.pixeltowers.io}" \
    --projectId="${INFISICAL_PROJECT_ID}" \
    -- "$@"
else
  exec "$@"
fi
