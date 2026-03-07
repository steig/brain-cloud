# brain-cloud development commands

default:
    @just --list

# Install all workspace dependencies
install:
    pnpm install

# Start local wrangler dev server (worker + D1)
dev:
    cd packages/worker && npx wrangler dev --ip 0.0.0.0

# Build web frontend + typecheck worker
build: web-build typecheck

# Deploy to production
deploy:
    cd packages/worker && npx wrangler deploy

# Deploy to staging
deploy-staging:
    cd packages/worker && npx wrangler deploy --env staging

# Apply D1 migrations locally
migrate:
    cd packages/worker && npx wrangler d1 migrations apply brain-db --local

# Apply D1 migrations to remote D1
migrate-prod:
    cd packages/worker && npx wrangler d1 migrations apply brain-db --remote

# Create the D1 database (run once)
db-create:
    npx wrangler d1 create brain-db

# Typecheck the worker
typecheck:
    cd packages/worker && npx tsc --noEmit

# Vite dev server for frontend
web:
    cd packages/web && npx vite dev

# Build web frontend
web-build:
    cd packages/web && npx vite build

# Format code with prettier
fmt:
    pnpm exec prettier --write "packages/**/*.{ts,tsx}"

# Remove build artifacts
clean:
    rm -rf packages/worker/dist packages/web/dist

# Set a wrangler secret
secret KEY:
    cd packages/worker && npx wrangler secret put {{KEY}}

# Tail production worker logs
logs:
    cd packages/worker && npx wrangler tail --format pretty

# Tail with JSON output (for piping/filtering)
logs-json:
    cd packages/worker && npx wrangler tail --format json

# Query remote D1 database
db-query SQL:
    cd packages/worker && npx wrangler d1 execute brain-db --remote --command "{{SQL}}"

# List wrangler secrets
secrets:
    cd packages/worker && npx wrangler secret list

# Check deployment status
status:
    cd packages/worker && npx wrangler deployments list

# Full build + deploy pipeline
ship: web-build typecheck
    cd packages/worker && npx wrangler deploy

# Enter nix dev shell
shell:
    nix develop
