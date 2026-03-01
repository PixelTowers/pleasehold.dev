#!/bin/bash
# ABOUTME: Interactive script to populate Infisical with pleasehold secrets.
# ABOUTME: Prompts for required and optional values, auto-generates secure defaults where possible.

set -e

INFISICAL_DOMAIN="${INFISICAL_DOMAIN:-https://app.infisical.com}"

echo "============================================================"
echo "  pleasehold - Infisical Secret Setup"
echo "============================================================"
echo ""
echo "This script will populate your Infisical project with the"
echo "secrets required to run pleasehold."
echo ""

# Check infisical CLI is installed
if ! command -v infisical &> /dev/null; then
  echo "Error: infisical CLI not found."
  echo "Install it: https://infisical.com/docs/cli/overview"
  exit 1
fi

# Check .infisical.json is configured
if [ ! -f ".infisical.json" ]; then
  echo "Error: .infisical.json not found."
  echo "Run 'make infisical-init' first."
  exit 1
fi

WORKSPACE_ID=$(grep -o '"workspaceId":\s*"[^"]*"' .infisical.json | cut -d'"' -f4)
if [ "$WORKSPACE_ID" = "CHANGEME" ]; then
  echo "Error: workspaceId in .infisical.json is still 'CHANGEME'."
  echo "Run 'make infisical-init' to configure your workspace."
  exit 1
fi

# Prompt for environment
read -rp "Environment to populate [dev/staging/prod] (default: dev): " ENV
ENV=${ENV:-dev}

echo ""
echo "--- Required Secrets ---"
echo ""

# Database URL
DEFAULT_DB_URL="postgresql://pleasehold:pleasehold@localhost:5434/pleasehold"
read -rp "DATABASE_URL (default: $DEFAULT_DB_URL): " DATABASE_URL
DATABASE_URL=${DATABASE_URL:-$DEFAULT_DB_URL}

# Better Auth Secret (auto-generate)
DEFAULT_AUTH_SECRET=$(openssl rand -base64 32)
read -rp "BETTER_AUTH_SECRET (default: auto-generated): " BETTER_AUTH_SECRET
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET:-$DEFAULT_AUTH_SECRET}

# Postgres
read -rp "POSTGRES_DB (default: pleasehold): " POSTGRES_DB
POSTGRES_DB=${POSTGRES_DB:-pleasehold}

read -rp "POSTGRES_USER (default: pleasehold): " POSTGRES_USER
POSTGRES_USER=${POSTGRES_USER:-pleasehold}

DEFAULT_PG_PASS=$(openssl rand -base64 16)
read -rp "POSTGRES_PASSWORD (default: auto-generated): " POSTGRES_PASSWORD
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$DEFAULT_PG_PASS}

# Redis
DEFAULT_REDIS_PASS=$(openssl rand -base64 16)
read -rp "REDIS_PASSWORD (default: auto-generated): " REDIS_PASSWORD
REDIS_PASSWORD=${REDIS_PASSWORD:-$DEFAULT_REDIS_PASS}

# MinIO
read -rp "MINIO_ROOT_USER (default: minioadmin): " MINIO_ROOT_USER
MINIO_ROOT_USER=${MINIO_ROOT_USER:-minioadmin}

DEFAULT_MINIO_PASS=$(openssl rand -base64 16)
read -rp "MINIO_ROOT_PASSWORD (default: auto-generated): " MINIO_ROOT_PASSWORD
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-$DEFAULT_MINIO_PASS}

echo ""
echo "--- Optional Secrets ---"
echo "(Press Enter to skip)"
echo ""

read -rp "RESEND_API_KEY: " RESEND_API_KEY
read -rp "EMAIL_FROM (default: noreply@example.com): " EMAIL_FROM
EMAIL_FROM=${EMAIL_FROM:-noreply@example.com}

read -rp "GITHUB_CLIENT_ID: " GITHUB_CLIENT_ID
read -rp "GITHUB_CLIENT_SECRET: " GITHUB_CLIENT_SECRET
read -rp "GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
read -rp "GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET

echo ""
echo "--- URLs ---"
echo ""

read -rp "API_URL (default: http://localhost:3001): " API_URL
API_URL=${API_URL:-http://localhost:3001}

read -rp "WEB_URL (default: http://localhost:8080): " WEB_URL
WEB_URL=${WEB_URL:-http://localhost:8080}

echo ""
echo "Setting secrets in Infisical (env: $ENV)..."
echo ""

set_secret() {
  local key="$1"
  local value="$2"
  if [ -n "$value" ]; then
    infisical secrets set "$key=$value" \
      --env="$ENV" \
      --domain="$INFISICAL_DOMAIN" 2>/dev/null && \
      echo "  Set $key" || \
      echo "  Failed to set $key"
  fi
}

# Required
set_secret "DATABASE_URL" "$DATABASE_URL"
set_secret "BETTER_AUTH_SECRET" "$BETTER_AUTH_SECRET"
set_secret "POSTGRES_DB" "$POSTGRES_DB"
set_secret "POSTGRES_USER" "$POSTGRES_USER"
set_secret "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD"
set_secret "REDIS_PASSWORD" "$REDIS_PASSWORD"
set_secret "MINIO_ROOT_USER" "$MINIO_ROOT_USER"
set_secret "MINIO_ROOT_PASSWORD" "$MINIO_ROOT_PASSWORD"
set_secret "API_URL" "$API_URL"
set_secret "WEB_URL" "$WEB_URL"
set_secret "EMAIL_FROM" "$EMAIL_FROM"

# Optional (only set if provided)
set_secret "RESEND_API_KEY" "$RESEND_API_KEY"
set_secret "GITHUB_CLIENT_ID" "$GITHUB_CLIENT_ID"
set_secret "GITHUB_CLIENT_SECRET" "$GITHUB_CLIENT_SECRET"
set_secret "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
set_secret "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"

echo ""
echo "Done! Secrets are stored in Infisical (env: $ENV)."
echo ""
echo "Next steps:"
echo "  make dev              # Start dev with Infisical secrets"
echo "  make infisical-secrets  # View stored secrets"
echo "  make infisical-export   # Export to .env file"
