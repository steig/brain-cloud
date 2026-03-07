---
category: ops
---

# /pickup - Morning Context Restoration

You are helping the user pick up where they left off. This command restores context from the previous session and shows what changed while they were away.

## Purpose

This is the **first command to run each day**. It answers:
- "What was I working on?"
- "What happened while I was away?"
- "What should I do next?"

## Execution Steps

### Step 1: Load Utilities and Get Developer Info

```bash
# Load work log utilities
source .claude/lib/work-log-utils.sh

# Get developer username
DEVELOPER=$(get_developer_username)
echo "Developer: @$DEVELOPER"

# Get session directory
SESSION_DIR=$(get_developer_session_dir)
```

### Step 2: Find Last Session

```bash
# Find the most recent session log
LAST_SESSION=$(ls -t "$SESSION_DIR"/*.md 2>/dev/null | head -1)

# Also check legacy location
if [[ -z "$LAST_SESSION" ]]; then
    LAST_SESSION=$(ls -t .ai/work/session-*.md 2>/dev/null | head -1)
fi

if [[ -n "$LAST_SESSION" ]]; then
    SESSION_DATE=$(basename "$LAST_SESSION" .md)
    echo "Last session: $SESSION_DATE"
else
    echo "No previous session found."
fi
```

### Step 3: Read Last Session Context

If a session log exists, read and summarize:

```bash
if [[ -f "$LAST_SESSION" ]]; then
    cat "$LAST_SESSION"
fi
```

**Extract and present:**
- **Context**: What was the starting point?
- **Progress**: What was accomplished?
- **Decisions Made**: Key choices (don't re-decide these)
- **Didn't Work**: Failed approaches (don't retry these)
- **Key Files**: Files that were being worked on
- **Handoff Notes**: Any notes left for next session

### Step 4: Check What Changed Overnight

```bash
# Get timestamp of last session
if [[ -f "$LAST_SESSION" ]]; then
    LAST_MODIFIED=$(stat -f '%m' "$LAST_SESSION" 2>/dev/null || stat -c '%Y' "$LAST_SESSION" 2>/dev/null)

    # Get commits since then
    echo "=== Commits since last session ==="
    git log --oneline --since="@$LAST_MODIFIED" --all

    # Get commits by others
    echo ""
    echo "=== Commits by others ==="
    git log --oneline --since="@$LAST_MODIFIED" --all --not --author="$DEVELOPER"
fi
```

### Step 5: Check for Overlapping Changes

```bash
# Get files you touched in last session
if [[ -f "$LAST_SESSION" ]]; then
    YOUR_FILES=$(grep -E '^\s*-\s*`' "$LAST_SESSION" | sed 's/.*`\([^`]*\)`.*/\1/' | sort -u)

    if [[ -n "$YOUR_FILES" ]]; then
        echo "=== Files you were working on ==="
        echo "$YOUR_FILES"

        echo ""
        echo "=== Changes to your files by others ==="
        for file in $YOUR_FILES; do
            if [[ -f "$file" ]]; then
                CHANGES=$(git log --oneline --since="@$LAST_MODIFIED" --not --author="$DEVELOPER" -- "$file" 2>/dev/null)
                if [[ -n "$CHANGES" ]]; then
                    echo "⚠️ $file was modified:"
                    echo "$CHANGES"
                fi
            fi
        done
    fi
fi
```

### Step 6: Check Open Issues and PRs

```bash
echo "=== Your Open Issues ==="
gh issue list --assignee="@me" --state=open --limit=5 2>/dev/null || echo "(GitHub CLI not available)"

echo ""
echo "=== PRs Needing Your Review ==="
gh pr list --search "review-requested:@me" --limit=5 2>/dev/null || echo "(GitHub CLI not available)"

echo ""
echo "=== Your Open PRs ==="
gh pr list --author="@me" --state=open --limit=5 2>/dev/null || echo "(GitHub CLI not available)"
```

### Step 7: Check Repository Health

```bash
echo "=== Repository Health ==="

# Uncommitted changes
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [[ "$UNCOMMITTED" -gt 0 ]]; then
    echo "⚠️ $UNCOMMITTED uncommitted changes"
fi

# Stale branches (older than 7 days)
echo ""
echo "Stale branches (>7 days):"
git for-each-ref --sort=-committerdate --format='%(refname:short) %(committerdate:relative)' refs/heads/ | while read branch date; do
    if [[ "$date" == *"weeks"* ]] || [[ "$date" == *"month"* ]]; then
        echo "  ⚠️ $branch ($date)"
    fi
done

# Current branch info
CURRENT_BRANCH=$(git branch --show-current)
echo ""
echo "Current branch: $CURRENT_BRANCH"
```

### Step 8: Check Active Work Logs

```bash
source .claude/lib/work-log-utils.sh

echo "=== Active Work Logs ==="

# Check for in-progress issues
for log_file in .ai/work/issues/*.md .ai/work/issue-*.md; do
    if [[ -f "$log_file" ]]; then
        STATUS=$(grep -m1 '^\*\*Status\*\*:' "$log_file" | sed 's/.*: //')
        if [[ "$STATUS" == *"in-progress"* ]] || [[ "$STATUS" == *"blocked"* ]]; then
            TITLE=$(head -1 "$log_file" | sed 's/^# //')
            echo "📋 $TITLE"
            echo "   Status: $STATUS"
            echo "   File: $log_file"
        fi
    fi
done
```

## Output Format

Present findings in this structure:

```
╔══════════════════════════════════════════════════════════════╗
║                    🌅 PICKUP SUMMARY                          ║
╠══════════════════════════════════════════════════════════════╣
║ Developer: @{username}                                        ║
║ Last Session: {date} ({time_ago})                             ║
╚══════════════════════════════════════════════════════════════╝

📍 WHERE YOU LEFT OFF
─────────────────────
{Summary from last session's Context and Progress sections}

✅ DECISIONS ALREADY MADE (don't re-decide)
────────────────────────────────────────────
{List from Decisions Made section}

❌ WHAT DIDN'T WORK (don't retry)
─────────────────────────────────
{List from Didn't Work section}

📁 KEY FILES
────────────
{List of files you were working on}

🔄 WHAT CHANGED WHILE YOU WERE AWAY
────────────────────────────────────
{N} commits since your last session
{M} by others (highlighted if touching your files)

⚠️ POTENTIAL CONFLICTS
──────────────────────
{Files you worked on that others also modified}

📋 OPEN WORK
────────────
{In-progress issues}
{PRs needing review}
{Your open PRs}

💡 SUGGESTED NEXT ACTION
─────────────────────────
Based on context: {specific suggestion}
```

## Suggested Next Actions Logic

Based on findings, suggest ONE specific action:

1. **If blocked issue exists**: "Resolve blocker on Issue #{N}: {blocker description}"
2. **If conflict detected**: "Review changes to {file} by @{author} before continuing"
3. **If PR needs review**: "Review PR #{N}: {title}"
4. **If in-progress issue**: "Continue Issue #{N}: {next step from work log}"
5. **If session had handoff notes**: "Follow handoff note: {note}"
6. **Default**: "Start fresh - run /create_task to begin new work"

## Profile Integration

```bash
source .claude/lib/profile-utils.sh
PROFILE=$(get_active_profile)
echo "Active profile: $PROFILE"
```

## DX Analytics Integration

### Step 9: Check Checkpoints

```bash
source .claude/lib/dx-db.sh

echo "=== SAVED CHECKPOINTS ==="

# Get recent checkpoints
dx_query "
    SELECT checkpoint_name as name,
           checkpoint_type as type,
           branch,
           strftime('%Y-%m-%d %H:%M', timestamp) as created
    FROM checkpoints
    WHERE timestamp > datetime('now', '-7 days')
    ORDER BY timestamp DESC
    LIMIT 5;
" 2>/dev/null || echo "(no checkpoints)"

# Get latest checkpoint state
LATEST_CHECKPOINT=$(dx_query "
    SELECT state_json FROM checkpoints
    ORDER BY timestamp DESC LIMIT 1;
" "line" 2>/dev/null)

if [[ -n "$LATEST_CHECKPOINT" ]]; then
    echo ""
    echo "Latest checkpoint state available for restore."
fi
```

### Step 10: Check Yesterday's Command Patterns

```bash
echo ""
echo "=== YESTERDAY'S ACTIVITY ==="

dx_query "
    SELECT command,
           COUNT(*) as runs,
           MAX(strftime('%H:%M', timestamp)) as last_run
    FROM events
    WHERE DATE(timestamp) = DATE('now', '-1 day')
    GROUP BY command
    ORDER BY runs DESC
    LIMIT 5;
" 2>/dev/null || echo "(no data)"

# Show what you usually do first thing
echo ""
echo "Your typical morning commands:"
dx_query "
    SELECT pattern_value as command,
           occurrences as times
    FROM patterns
    WHERE pattern_type = 'sequence'
      AND pattern_key = 'pickup'
    ORDER BY occurrences DESC
    LIMIT 3;
" 2>/dev/null || echo "(learning...)"
```

### Step 11: Create Morning Checkpoint

```bash
# Auto-save a morning checkpoint
dx_save_checkpoint "morning_pickup_$(date +%Y%m%d)" "auto" 2>/dev/null || true
echo ""
echo "Morning checkpoint saved."
```

## Memory Integration

Query Memory MCP for relevant context:

```
Use mcp__memory__search_nodes to find:
- Recent decisions about current work area
- Known issues or gotchas in files being worked on
- Patterns established for this type of work
```

If relevant memories found, include in output:

```
🧠 REMEMBERED CONTEXT
─────────────────────
{Relevant memories from previous sessions}
```

## Usage Examples

```
/pickup              # Full context restoration
/pickup quick        # Just show last session summary and next action
/pickup changes      # Focus on what changed overnight
```

## Notes

- This command is designed to be run at the START of each session
- It reads but does not modify any files
- Creates today's session log if it doesn't exist
- All timestamps are in local timezone

---

*Part of LDC AI Framework v2.0.0 - Proactive Developer Experience*
