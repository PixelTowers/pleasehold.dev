#!/bin/sh
# ABOUTME: Conditional Infisical secret injection for Docker containers.
# ABOUTME: Wraps the CMD with `infisical run` when credentials are present, passes through otherwise.

set -e

if [ -n "$INFISICAL_CLIENT_ID" ] && [ -n "$INFISICAL_CLIENT_SECRET" ]; then
  exec infisical run \
    --env="${INFISICAL_ENV:-production}" \
    --path="/" \
    --domain="${INFISICAL_DOMAIN:-https://secrets.pixeltowers.io}" \
    --projectId="${INFISICAL_PROJECT_ID}" \
    -- "$@"
else
  exec "$@"
fi
