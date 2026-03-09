# Repository Setup (Private)

## Dual-Repo Architecture

Brain Cloud uses two GitHub repos: a private one for development and a public one for OSS distribution.

| | Private | Public (OSS) |
|---|---|---|
| **Repo** | `steig/brain-cloud-private` | `steig/brain-cloud` |
| **Visibility** | Private | Public |
| **Git remote** | `origin` | `public` |
| **Commit history** | Full (98+ commits) | Squashed milestones |
| **CI deploy** | Yes (Cloudflare Workers) | No (gated by `github.repository`) |
| **CI lint/test** | Yes | Yes |
| **Secrets** | CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID | None needed |
| **Issues** | On private repo | On public repo (community) |

## Remotes

```
origin  git@github.com:steig/brain-cloud-private.git   # development
public  git@github.com:steig/brain-cloud.git            # OSS distribution
```

## Syncing Private → Public

After committing to private, sync to public:

```bash
# From the brain-cloud repo root
git archive HEAD | tar -x -C /tmp/brain-cloud-public/
cd /tmp/brain-cloud-public
git add -A
git commit -m "sync: <describe changes>"
git push origin main
```

If `/tmp/brain-cloud-public` doesn't exist, clone first:
```bash
git clone git@github.com:steig/brain-cloud.git /tmp/brain-cloud-public
```

## CI Guard

The deploy job in `.github/workflows/ci.yml` is gated:
```yaml
if: ... && github.repository == 'steig/brain-cloud-private'
```

This means lint + typecheck + test run on both repos (for contributor PRs on the public repo), but deploy only runs from the private repo.

## What NOT to sync

- `.claude/local/` — gitignored, private-only notes
- `.env`, `.dev.vars` — already gitignored
- Anything in `.claude/CLAUDE.md` is shared (checked into both repos)

## Domain & Infrastructure

- **Production URL:** https://brain-ai.dev
- **Workers URL:** https://brain.steigerwald.workers.dev
- **Cloudflare:** D1 database `brain-db`, Vectorize index `brain-embeddings`
- **Deploy:** `cd packages/worker && npx wrangler deploy`
