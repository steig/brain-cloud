# Self-Hosting Brain Cloud

Deploy your own Brain Cloud instance on Cloudflare Workers. Free tier covers solo developers.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm i -g wrangler`

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/steig/brain-cloud.git
cd brain-cloud
pnpm install

# 2. Authenticate with Cloudflare
wrangler login

# 3. Create your D1 database
wrangler d1 create brain-db
# Note the database_id from the output

# 4. Configure your instance
cp wrangler.toml.template packages/worker/wrangler.toml
# Edit wrangler.toml:
#   - Set database_id to your D1 ID
#   - Set FRONTEND_URL to your domain (or leave as workers.dev)
#   - Set JWT_ISSUER to your domain
#   - Set callback URLs to match your domain

# 5. Run database migrations
wrangler d1 migrations apply brain-db --remote

# 6. Set secrets
wrangler secret put JWT_SECRET
# Generate with: openssl rand -hex 32

# 7. Set up GitHub OAuth (see OAuth Setup below)
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

# 8. Build and deploy
pnpm --filter brain-web build
cd packages/worker && wrangler deploy
```

Your instance will be live at `https://brain-cloud.YOUR_SUBDOMAIN.workers.dev`.

## OAuth Setup

### GitHub (recommended)

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: Brain Cloud
   - **Homepage URL**: `https://YOUR_DOMAIN`
   - **Authorization callback URL**: `https://YOUR_DOMAIN/auth/github/callback`
4. Copy the Client ID and Client Secret
5. Set as secrets:
   ```bash
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   ```

### Google (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://YOUR_DOMAIN/auth/google/callback`
4. Set as secrets:
   ```bash
   wrangler secret put GOOGLE_CLIENT_ID
   wrangler secret put GOOGLE_CLIENT_SECRET
   ```

### No OAuth (API key only)

If you don't configure any OAuth provider, Brain Cloud runs in API-key-only mode. The first user is created during initial setup and authenticates via API key. This works well for single-user self-hosted instances.

## Optional Features

### Vectorize (Semantic Search)

Enables similarity-based search across your thoughts and decisions.

```bash
# Create the index
wrangler vectorize create brain-embeddings --dimensions 768 --metric cosine

# Uncomment in wrangler.toml:
# [[vectorize]]
# binding = "VECTORIZE"
# index_name = "brain-embeddings"

# Redeploy
wrangler deploy
```

### Workers AI (Coaching & Digests)

Enables AI-powered daily digests, coaching insights, and embedding generation.

```bash
# Uncomment in wrangler.toml:
# [ai]
# binding = "AI"

# Redeploy
wrangler deploy
```

Workers AI free tier includes 10,000 neurons per day — sufficient for personal use.

## Custom Domain

1. Add your domain to Cloudflare (DNS must be on Cloudflare)
2. Add to `wrangler.toml`:
   ```toml
   routes = [
     { pattern = "brain.yourdomain.com", custom_domain = true },
   ]
   ```
3. Update `FRONTEND_URL`, `JWT_ISSUER`, and callback URLs in `[vars]`
4. Update your GitHub/Google OAuth app callback URLs
5. Redeploy: `wrangler deploy`

## Updating

One command from your brain-cloud directory:

```bash
npx create-brain-cloud update
```

Or manually:

```bash
git pull origin main
pnpm install
wrangler d1 migrations apply brain-db --remote
pnpm --filter brain-web build
cd packages/worker && wrangler deploy
```

## Configuration Reference

### Environment Variables (`[vars]` in wrangler.toml)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_ISSUER` | Yes | Your domain (e.g., `brain.example.com`) |
| `FRONTEND_URL` | Yes | Full URL (e.g., `https://brain.example.com`) |
| `GITHUB_CALLBACK_URL` | If using GitHub OAuth | `https://YOUR_DOMAIN/auth/github/callback` |
| `GOOGLE_CALLBACK_URL` | If using Google OAuth | `https://YOUR_DOMAIN/auth/google/callback` |

### Secrets (via `wrangler secret put`)

| Secret | Required | Description |
|--------|----------|-------------|
| `JWT_SECRET` | Yes | 256-bit hex string for JWT signing |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth app client secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `SENTRY_DSN` | No | Sentry error tracking DSN |

### Bindings

| Binding | Required | Description |
|---------|----------|-------------|
| `DB` (D1) | Yes | SQLite database |
| `AI` (Workers AI) | No | Coaching, digests, embeddings |
| `VECTORIZE` | No | Semantic search index |
| `ASSETS` | Yes | Static SPA files (auto-configured) |

## Troubleshooting

### CORS errors in browser console
Your `FRONTEND_URL` doesn't match the domain you're accessing from. Update `FRONTEND_URL` in wrangler.toml to match your actual URL.

### OAuth redirect mismatch
The callback URL in your GitHub/Google app must exactly match `GITHUB_CALLBACK_URL` / `GOOGLE_CALLBACK_URL` in wrangler.toml.

### D1 migration errors
Run migrations manually: `wrangler d1 execute brain-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"` to check what tables exist.

### "AI features require Workers AI binding"
Enable Workers AI by uncommenting the `[ai]` section in wrangler.toml and redeploying.

### Worker not found after deploy
Check `wrangler whoami` to verify you're authenticated. Check `wrangler deploy` output for the URL.
