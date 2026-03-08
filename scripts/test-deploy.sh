#!/usr/bin/env bash
set -euo pipefail

# E2E deploy test — validates the self-deploy flow works end-to-end.
# Run before releases to catch breaking changes to the deploy flow.
#
# Prerequisites:
#   - Wrangler authenticated to a TEST Cloudflare account
#   - Not your production account — this creates and destroys resources
#
# Usage:
#   ./scripts/test-deploy.sh
#
# What it does:
#   1. Creates a D1 database
#   2. Generates wrangler.toml from template
#   3. Runs migrations
#   4. Sets JWT_SECRET
#   5. Builds and deploys
#   6. Validates /health, /version, /auth/setup-status, /mcp
#   7. Tears down all resources
#
# Approximate runtime: 5-10 minutes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKER_DIR="$REPO_ROOT/packages/worker"
DB_NAME="brain-db-test-$$"
WORKER_NAME="brain-cloud-test-$$"
DEPLOY_URL=""
CLEANUP_NEEDED=false

log()  { echo "  → $*"; }
ok()   { echo "  ✓ $*"; }
fail() { echo "  ✗ $*" >&2; }

cleanup() {
  if [ "$CLEANUP_NEEDED" = false ]; then
    return
  fi

  echo ""
  log "Cleaning up..."

  # Delete worker
  if [ -n "$WORKER_NAME" ]; then
    wrangler delete --name "$WORKER_NAME" --force 2>/dev/null && ok "Deleted worker $WORKER_NAME" || true
  fi

  # Delete D1 database
  if [ -n "$DB_NAME" ]; then
    local db_id
    db_id=$(wrangler d1 list --json 2>/dev/null | jq -r ".[] | select(.name==\"$DB_NAME\") | .uuid" 2>/dev/null || true)
    if [ -n "$db_id" ]; then
      wrangler d1 delete "$DB_NAME" --skip-confirmation 2>/dev/null && ok "Deleted D1 database $DB_NAME" || true
    fi
  fi

  # Remove generated wrangler.toml
  rm -f "$WORKER_DIR/wrangler.test.toml"

  ok "Cleanup complete"
}

trap cleanup EXIT

echo ""
echo "  Brain Cloud — E2E Deploy Test"
echo "  =============================="
echo ""

# Step 1: Verify we're authenticated
log "Checking Cloudflare auth..."
if ! wrangler whoami >/dev/null 2>&1; then
  fail "Not authenticated. Run: wrangler login"
  exit 1
fi
ok "Cloudflare authenticated"

# Step 2: Create D1 database
log "Creating test D1 database: $DB_NAME"
CREATE_OUTPUT=$(wrangler d1 create "$DB_NAME" 2>&1)
DB_ID=$(echo "$CREATE_OUTPUT" | grep -oP 'database_id\s*=\s*"\K[^"]+')
if [ -z "$DB_ID" ]; then
  fail "Could not create D1 database"
  echo "$CREATE_OUTPUT"
  exit 1
fi
CLEANUP_NEEDED=true
ok "Created D1: $DB_ID"

# Step 3: Generate wrangler.toml
log "Generating wrangler.toml from template..."
JWT_SECRET=$(openssl rand -hex 32)

sed \
  -e "s/YOUR_D1_DATABASE_ID/$DB_ID/g" \
  -e "s/name = \"brain-cloud\"/name = \"$WORKER_NAME\"/" \
  "$REPO_ROOT/wrangler.toml.template" > "$WORKER_DIR/wrangler.toml"

ok "Generated wrangler.toml"

# Step 4: Run migrations
log "Running D1 migrations..."
(cd "$WORKER_DIR" && wrangler d1 migrations apply "$DB_NAME" --remote)
ok "Migrations applied"

# Step 5: Set JWT secret
log "Setting JWT_SECRET..."
echo "$JWT_SECRET" | (cd "$WORKER_DIR" && wrangler secret put JWT_SECRET)
ok "JWT_SECRET set"

# Step 6: Build web
log "Building web dashboard..."
(cd "$REPO_ROOT" && pnpm --filter brain-web build)
ok "Web built"

# Step 7: Deploy
log "Deploying worker..."
DEPLOY_OUTPUT=$(cd "$WORKER_DIR" && wrangler deploy 2>&1)
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[^\s]+\.workers\.dev' | head -1)
if [ -z "$DEPLOY_URL" ]; then
  fail "Could not extract deploy URL"
  echo "$DEPLOY_OUTPUT"
  exit 1
fi
ok "Deployed to $DEPLOY_URL"

# Step 8: Validate
echo ""
log "Validating deployment..."
sleep 3  # Give Workers a moment to propagate

# Health check
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/health")
if [ "$HTTP_STATUS" = "200" ]; then
  ok "/health → 200"
else
  fail "/health → $HTTP_STATUS (expected 200)"
fi

# Version endpoint
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/version")
if [ "$HTTP_STATUS" = "200" ]; then
  ok "/version → 200"
else
  fail "/version → $HTTP_STATUS (expected 200)"
fi

# Setup status (should show uninitialized)
SETUP_BODY=$(curl -s "$DEPLOY_URL/auth/setup-status")
INITIALIZED=$(echo "$SETUP_BODY" | jq -r '.initialized' 2>/dev/null)
if [ "$INITIALIZED" = "false" ]; then
  ok "/auth/setup-status → initialized=false (correct for fresh instance)"
else
  fail "/auth/setup-status → unexpected: $SETUP_BODY"
fi

# Auth providers
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/auth/providers")
if [ "$HTTP_STATUS" = "200" ]; then
  ok "/auth/providers → 200"
else
  fail "/auth/providers → $HTTP_STATUS"
fi

# MCP endpoint (should reject unauthenticated)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$DEPLOY_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')
if [ "$HTTP_STATUS" = "401" ]; then
  ok "/mcp → 401 (correctly rejects unauthenticated)"
else
  fail "/mcp → $HTTP_STATUS (expected 401)"
fi

# Static assets (SPA)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/")
if [ "$HTTP_STATUS" = "200" ]; then
  ok "/ → 200 (SPA loads)"
else
  fail "/ → $HTTP_STATUS"
fi

echo ""
echo "  =============================="
echo "  All checks passed!"
echo "  Deploy URL: $DEPLOY_URL"
echo "  =============================="
echo ""

# Cleanup happens via trap
