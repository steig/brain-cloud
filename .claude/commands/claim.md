---
category: team
---

# /claim - Claim GitHub Issue

You are helping the user claim a GitHub issue to indicate they're working on it.

## Purpose

Team coordination:
- Mark issues as in-progress
- Prevent duplicate work
- Show what you're actively working on

## Usage

```
/claim <issue-number>     # Claim an issue
/claim                    # Show your claimed issues
/unclaim <issue-number>   # Release a claim
```

## Execution Steps

### Step 1: Parse Arguments

```bash
ISSUE_NUM="$1"
```

### Step 2: Claim Issue

If issue number provided:

```bash
if [[ -n "$ISSUE_NUM" ]]; then
    echo "Claiming issue #$ISSUE_NUM..."

    # Get current user
    USER=$(gh api user -q '.login')

    # Add in-progress label
    gh issue edit "$ISSUE_NUM" --add-label "status:in-progress"

    # Assign to self
    gh issue edit "$ISSUE_NUM" --add-assignee "@me"

    # Get issue details
    TITLE=$(gh issue view "$ISSUE_NUM" --json title -q '.title')

    echo ""
    echo "Claimed: #$ISSUE_NUM - $TITLE"
    echo ""
    echo "You are now assigned and issue is marked 'status:in-progress'"
fi
```

### Step 3: Show Claimed Issues

If no argument, show current claims:

```bash
if [[ -z "$ISSUE_NUM" ]]; then
    echo "=== YOUR CLAIMED ISSUES ==="
    echo ""

    gh issue list --assignee="@me" --label="status:in-progress" --json number,title,updatedAt \
        --jq '.[] | "#\(.number) \(.title) (updated: \(.updatedAt | split("T")[0]))"'

    echo ""
    echo "Claim with: /claim <issue-number>"
    echo "Release with: /unclaim <issue-number>"
fi
```

## Output Format

```
╔══════════════════════════════════════════════════════════════╗
║                    🎯 ISSUE CLAIMED                           ║
╚══════════════════════════════════════════════════════════════╝

Claimed: #42 - Add user authentication

  ✅ Assigned to @yourusername
  ✅ Label added: status:in-progress
  ✅ Team notified

Start working with: /do_task 42
```

---

*Part of DX Framework v2.5.0 - Team Coordination*
