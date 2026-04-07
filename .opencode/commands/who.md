---
category: team
---

# /who - Team Activity View

You are showing the user what their team is working on for coordination.

## Purpose

Team visibility:
- See who's working on what
- Avoid duplicate work
- Identify potential conflicts
- Coordinate with teammates

## Usage

```
/who                      # Show all active work
/who working              # Issues being worked on
/who reviewing            # PRs under review
/who blocked              # Blocked issues
```

## Execution Steps

### Step 1: Active Work Overview

```bash
echo "=== TEAM ACTIVITY ==="
echo ""

echo "In Progress:"
gh issue list --label="status:in-progress" --state=open --json number,title,assignees \
    --jq '.[] | "  #\(.number) \(.title) - @\(.assignees[0].login // "unassigned")"'
```

### Step 2: PR Activity

```bash
echo ""
echo "Open PRs:"
gh pr list --state=open --json number,title,author,reviewDecision \
    --jq '.[] | "  #\(.number) \(.title) by @\(.author.login) [\(.reviewDecision // "PENDING")]"'

echo ""
echo "PRs Needing Review:"
gh pr list --search "review:required" --json number,title,author \
    --jq '.[] | "  #\(.number) \(.title) by @\(.author.login)"'
```

### Step 3: Blocked Work

```bash
echo ""
echo "Blocked Issues:"
gh issue list --label="blocked" --state=open --json number,title,assignees \
    --jq '.[] | "  ⛔ #\(.number) \(.title) - @\(.assignees[0].login // "unassigned")"'
```

### Step 4: Conflict Detection

```bash
echo ""
echo "=== POTENTIAL CONFLICTS ==="

# Get files you're modifying
MY_FILES=$(git diff --name-only main...HEAD 2>/dev/null | sort)

if [[ -n "$MY_FILES" ]]; then
    echo "Files you're modifying:"
    echo "$MY_FILES" | head -5

    # Check against open PRs
    echo ""
    echo "Checking for overlaps with open PRs..."
    gh pr list --state=open --json number,files,author --jq '.[] | {number, author: .author.login, files: [.files[].path]}' 2>/dev/null | while read -r pr; do
        PR_NUM=$(echo "$pr" | jq -r '.number')
        PR_AUTHOR=$(echo "$pr" | jq -r '.author')
        PR_FILES=$(echo "$pr" | jq -r '.files[]' 2>/dev/null)

        for file in $MY_FILES; do
            if echo "$PR_FILES" | grep -q "^$file$"; then
                echo "  ⚠️ PR #$PR_NUM by @$PR_AUTHOR also modifies: $file"
            fi
        done
    done
else
    echo "No local changes to check for conflicts."
fi
```

## Output Format

```
╔══════════════════════════════════════════════════════════════╗
║                    👥 TEAM ACTIVITY                           ║
╚══════════════════════════════════════════════════════════════╝

🔄 IN PROGRESS
──────────────
  #42 Add user authentication - @alice
  #38 Fix dashboard loading - @bob
  #45 Implement search - @you

🔀 OPEN PRs
───────────
  #44 feat: login page by @alice [APPROVED]
  #43 fix: token refresh by @bob [CHANGES_REQUESTED]
  #46 feat: search UI by @you [PENDING]

⏳ NEEDS REVIEW
───────────────
  #44 feat: login page by @alice (waiting 2 days)

⛔ BLOCKED
──────────
  #38 Fix dashboard loading - @bob
      Waiting for: API endpoint from backend team

⚠️ POTENTIAL CONFLICTS
──────────────────────
  PR #44 by @alice also modifies: src/auth/login.ts
  Consider syncing with @alice before merging

💡 SUGGESTIONS
──────────────
- Review #44 - @alice has been waiting 2 days
- Sync with @alice about src/auth/login.ts overlap
```

---

*Part of DX Framework v2.5.0 - Team Coordination*
