---
category: ops
---

# /health - Project Health Dashboard

You are showing the user a comprehensive health dashboard for their project. This gives instant situational awareness.

## Purpose

Quick status check answering:
- "What's the state of things right now?"
- "Are there any problems I should know about?"
- "What needs my attention?"

## Execution Steps

### Step 1: Git Status Overview

```bash
echo "=== GIT STATUS ==="

# Current branch
BRANCH=$(git branch --show-current)
echo "Branch: $BRANCH"

# Ahead/behind
TRACKING=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)
if [[ -n "$TRACKING" ]]; then
    AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null)
    BEHIND=$(git rev-list --count HEAD..@{u} 2>/dev/null)
    echo "Tracking: $TRACKING (↑$AHEAD ↓$BEHIND)"
fi

# Working directory status
STAGED=$(git diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
UNSTAGED=$(git diff --numstat 2>/dev/null | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

echo "Changes: $STAGED staged, $UNSTAGED unstaged, $UNTRACKED untracked"

# Last commit
LAST_COMMIT=$(git log -1 --format='%h %s (%cr)' 2>/dev/null)
echo "Last commit: $LAST_COMMIT"
```

### Step 2: Branch Health

```bash
echo ""
echo "=== BRANCH HEALTH ==="

# List branches with age
echo "Recent branches:"
git for-each-ref --sort=-committerdate --format='  %(refname:short) (%(committerdate:relative))' refs/heads/ | head -5

# Stale branches warning
echo ""
echo "Stale branches (>7 days):"
STALE_COUNT=0
git for-each-ref --sort=-committerdate --format='%(refname:short)|%(committerdate:relative)' refs/heads/ | while IFS='|' read branch date; do
    if [[ "$date" == *"week"* ]] || [[ "$date" == *"month"* ]] || [[ "$date" == *"year"* ]]; then
        echo "  ⚠️ $branch ($date)"
        ((STALE_COUNT++))
    fi
done
```

### Step 3: GitHub Issues Status

```bash
echo ""
echo "=== GITHUB ISSUES ==="

# Your open issues
echo "Your open issues:"
gh issue list --assignee="@me" --state=open --limit=10 --json number,title,labels,updatedAt \
    --jq '.[] | "  #\(.number) \(.title) (\(.updatedAt | split("T")[0]))"' 2>/dev/null || echo "  (GitHub CLI not available)"

# Issues you created
echo ""
echo "Issues you created:"
gh issue list --author="@me" --state=open --limit=5 --json number,title \
    --jq '.[] | "  #\(.number) \(.title)"' 2>/dev/null || echo "  (GitHub CLI not available)"

# High priority / blocked
echo ""
echo "Blocked issues:"
gh issue list --label="blocked" --state=open --limit=5 --json number,title \
    --jq '.[] | "  ⚠️ #\(.number) \(.title)"' 2>/dev/null || echo "  (none)"
```

### Step 4: Pull Request Status

```bash
echo ""
echo "=== PULL REQUESTS ==="

# Your open PRs
echo "Your open PRs:"
gh pr list --author="@me" --state=open --json number,title,reviewDecision,statusCheckRollup \
    --jq '.[] | "  #\(.number) \(.title) [\(.reviewDecision // "PENDING")]"' 2>/dev/null || echo "  (none)"

# PRs needing your review
echo ""
echo "PRs needing your review:"
gh pr list --search "review-requested:@me" --json number,title,author \
    --jq '.[] | "  #\(.number) \(.title) by @\(.author.login)"' 2>/dev/null || echo "  (none)"

# Merged today
echo ""
echo "Merged today:"
gh pr list --state=merged --search "merged:>=$(date +%Y-%m-%d)" --limit=5 --json number,title \
    --jq '.[] | "  ✅ #\(.number) \(.title)"' 2>/dev/null || echo "  (none)"
```

### Step 5: Work Log Status

```bash
echo ""
echo "=== WORK LOGS ==="

source .claude/lib/work-log-utils.sh

# Count active work logs
ISSUE_COUNT=0
IN_PROGRESS=0
BLOCKED=0

for log_file in .ai/work/issues/*.md .ai/work/issue-*.md; do
    if [[ -f "$log_file" ]]; then
        ((ISSUE_COUNT++))
        STATUS=$(grep -m1 '^\*\*Status\*\*:' "$log_file" | sed 's/.*: //')
        if [[ "$STATUS" == *"in-progress"* ]]; then
            ((IN_PROGRESS++))
            TITLE=$(head -1 "$log_file" | sed 's/^# //')
            echo "  🔄 $TITLE"
        elif [[ "$STATUS" == *"blocked"* ]]; then
            ((BLOCKED++))
            TITLE=$(head -1 "$log_file" | sed 's/^# //')
            BLOCKER=$(grep -A2 '## Blockers' "$log_file" | tail -1)
            echo "  ⛔ $TITLE"
            echo "      Blocker: $BLOCKER"
        fi
    fi
done

echo ""
echo "Summary: $ISSUE_COUNT total, $IN_PROGRESS in-progress, $BLOCKED blocked"
```

### Step 6: Session Status

```bash
echo ""
echo "=== SESSION ==="

source .claude/lib/work-log-utils.sh

DEVELOPER=$(get_developer_username)
echo "Developer: @$DEVELOPER"

SESSION_DIR=$(get_developer_session_dir)
TODAY=$(date '+%Y-%m-%d')
TODAY_SESSION="$SESSION_DIR/$TODAY.md"

if [[ -f "$TODAY_SESSION" ]]; then
    LINES=$(wc -l < "$TODAY_SESSION" | tr -d ' ')
    echo "Today's session: $LINES lines"

    # Show recent progress
    echo ""
    echo "Recent progress:"
    grep -A1 '^### ' "$TODAY_SESSION" | tail -6
else
    echo "No session log for today (run /pickup to start)"
fi

# Profile
source .claude/lib/profile-utils.sh
PROFILE=$(get_active_profile)
echo ""
echo "Active profile: $PROFILE"
```

### Step 7: CI/CD Status (if available)

```bash
echo ""
echo "=== CI/CD STATUS ==="

# Check for GitHub Actions status on current branch
BRANCH=$(git branch --show-current)
gh run list --branch="$BRANCH" --limit=3 --json status,conclusion,name,createdAt \
    --jq '.[] | "\(.status)/\(.conclusion // "running") - \(.name) (\(.createdAt | split("T")[0]))"' 2>/dev/null || echo "(not available)"

# Check for failing workflows
echo ""
echo "Failed runs (last 24h):"
gh run list --status=failure --limit=5 --json name,conclusion,headBranch \
    --jq '.[] | "  ❌ \(.name) on \(.headBranch)"' 2>/dev/null || echo "  (none)"
```

### Step 8: MCP Server Status

Check availability of expected MCP servers by attempting lightweight operations:

```
MCP Server Detection:
1. GitHub MCP     → Try mcp__github__git_status
2. Memory MCP     → Try mcp__memory__read_graph
3. Context7 MCP   → Try mcp__context7__resolve-library-id
4. Brain MCP      → Try mcp__brain__brain_session_start
5. Seq-Thinking   → Try mcp__sequential-thinking__sequentialthinking
6. Fetch MCP      → Try mcp__fetch__fetch

Report which servers responded successfully.
```

### Step 9: Global Config Status

```bash
echo ""
echo "=== CONFIG STATUS ==="

source .claude/lib/config-loader.sh

# Check global config
if has_global_config; then
    echo "Global config: ~/.config/claude-ai/config.json ✅"
    BRAIN_URL=$(get_brain_api_url)
    echo "Brain API URL: $BRAIN_URL"
else
    echo "Global config: not found ⚠️"
    echo "  Run: init_global_config (from .claude/lib/config-loader.sh)"
fi

# Framework version
VERSION=$(get_framework_version)
echo "Framework version: $VERSION"
```

### Step 10: Code Quality Metrics (quick scan)

```bash
echo ""
echo "=== QUICK CODE SCAN ==="

# Large files warning
echo "Large files (>400 lines):"
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" 2>/dev/null | \
    head -100 | while read file; do
        if [[ -f "$file" ]]; then
            LINES=$(wc -l < "$file" | tr -d ' ')
            if [[ $LINES -gt 400 ]]; then
                echo "  ⚠️ $file ($LINES lines)"
            fi
        fi
    done | head -5

# TODO/FIXME count
echo ""
TODO_COUNT=$(grep -r "TODO\|FIXME" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" . 2>/dev/null | wc -l | tr -d ' ')
echo "TODOs/FIXMEs in codebase: $TODO_COUNT"
```

## Output Format

Present as a clean dashboard:

```
╔══════════════════════════════════════════════════════════════╗
║                    🏥 PROJECT HEALTH                          ║
╚══════════════════════════════════════════════════════════════╝

📊 GIT
──────
Branch: feature/auth  (↑2 ahead of origin)
Changes: 3 staged, 1 unstaged, 0 untracked
Last commit: abc123 feat: add login (2 hours ago)

🌿 BRANCHES
───────────
  main (1 day ago)
  feature/auth (2 hours ago) ← current
  ⚠️ feature/old-experiment (3 weeks ago) - consider cleanup

📋 ISSUES (assigned to you)
────────────────────────────
  #42 Add user authentication (in-progress)
  #38 Fix dashboard loading (blocked)

🔀 PULL REQUESTS
────────────────
Your PRs:
  #45 feat: login page [APPROVED] ✅
  #43 fix: token refresh [CHANGES_REQUESTED] ⚠️

Needs your review:
  #44 docs: update README by @alice

📓 WORK LOGS
────────────
  🔄 Issue #42: Add user authentication (in-progress)
  ⛔ Issue #38: Fix dashboard loading (blocked: waiting for API)

✅ CI/CD
─────────
  ✅ Tests passing on feature/auth
  ✅ Build succeeded

🔌 MCP SERVERS
───────────────
  GitHub:     ✅
  Memory:     ✅
  Context7:   ✅
  Brain:      ✅
  Seq-Think:  ✅
  Fetch:      ✅

⚙️ CONFIG
──────────
  Global:     ~/.config/claude-ai/config.json ✅
  Version:    2.19.0
  Brain API:  http://brain-api ✅

⚠️ ATTENTION NEEDED
────────────────────
1. PR #43 has requested changes
2. Issue #38 is blocked - needs API update
3. Branch feature/old-experiment is stale (3 weeks)
```

## Flags

```
/health              # Full dashboard
/health git          # Just git status
/health issues       # Just issues and PRs
/health work         # Just work logs and session
/health ci           # Just CI/CD status
/health mcp          # Just MCP server status
/health config       # Just configuration status
```

## Quick Health Score

Calculate and display overall health:

```
HEALTH SCORE: 8/10

✅ Git: Clean working directory
✅ Issues: No blockers
⚠️ PRs: 1 needs attention
✅ CI: All passing
✅ Session: Active today
```

---

*Part of LDC AI Framework v2.0.0 - Proactive Developer Experience*
