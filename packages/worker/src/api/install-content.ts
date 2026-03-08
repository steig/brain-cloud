// Auto-generated install content for Brain Cloud CLI installer
// Contains portable hooks, curated commands, directives, and settings

export const INSTALL_VERSION = "1.0.0";

// ============================================
// HOOKS - Portable versions for ~/.claude/hooks/brain-cloud/
// ============================================

export const HOOKS: Record<string, string> = {
  "session-start.sh": `#!/bin/bash
# Session Start Hook - Brain Cloud
# Runs on the first user prompt of a session to provide
# proactive context and trigger brain_session_start.

set -e

# Portable paths
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
BRAIN_CLOUD_HOME="\${SCRIPT_DIR}"
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# ============================================
# UTILITY FUNCTIONS
# ============================================

warn() { echo "Warning: $1"; }
notice() { echo "Info: $1"; }
suggest() { echo "Suggestion: $1"; }

get_username() {
    git config user.name 2>/dev/null | tr ' ' '-' | tr '[:upper:]' '[:lower:]' || echo "\${USER:-developer}"
}

# ============================================
# SESSION DETECTION
# ============================================

SESSION_GAP_HOURS=8

is_new_session() {
    local marker_file="/tmp/.brain-cloud-last-session-\$(id -u)"

    if [[ -f "$marker_file" ]]; then
        local last_check=$(cat "$marker_file" 2>/dev/null)
        local now=$(date '+%s')
        local gap_hours=$(( (now - last_check) / 3600 ))

        if [[ $gap_hours -lt $SESSION_GAP_HOURS ]]; then
            return 1
        fi
    fi

    date '+%s' > "$marker_file"
    return 0
}

# ============================================
# GIT CHECKS
# ============================================

check_uncommitted() {
    local uncommitted=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [[ $uncommitted -gt 0 ]]; then
        notice "$uncommitted uncommitted changes in working directory"
    fi
}

check_branch_sync() {
    local tracking=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)
    if [[ -n "$tracking" ]]; then
        local behind=$(git rev-list --count HEAD..@{u} 2>/dev/null)
        if [[ $behind -gt 0 ]]; then
            warn "Current branch is $behind commits behind $tracking"
            suggest "Consider pulling latest changes"
        fi
    fi
}

check_stale_branches() {
    local stale_count=0
    while IFS='|' read -r branch date; do
        if [[ "$date" == *"week"* ]] || [[ "$date" == *"month"* ]] || [[ "$date" == *"year"* ]]; then
            if [[ $stale_count -eq 0 ]]; then
                warn "Stale branches detected:"
            fi
            echo "  $branch ($date)"
            ((stale_count++))
        fi
    done < <(git for-each-ref --sort=-committerdate --format='%(refname:short)|%(committerdate:relative)' refs/heads/)

    if [[ $stale_count -gt 0 ]]; then
        suggest "Consider cleaning up $stale_count stale branches"
    fi
}

# ============================================
# MAIN
# ============================================

main() {
    cd "$PROJECT_ROOT"

    if ! is_new_session; then
        exit 0
    fi

    echo "---"
    echo "PROACTIVE CHECKS"
    echo "---"

    check_uncommitted
    check_branch_sync
    check_stale_branches

    # Emit Brain session start trigger
    cat << 'TRIGGER_EOF'
{
  "systemMessage": "SESSION START: Call brain_session_start with your initial mood and goals for this session."
}
TRIGGER_EOF

    suggest "Run /pickup for full context restoration"
}

if [[ "\${BASH_SOURCE[0]}" == "\${0}" ]]; then
    main "$@"
fi
`,

  "auto-log-trigger.sh": `#!/bin/bash
# Auto-Log Trigger Hook - Brain Cloud
# Detects significant events and emits system messages
# requiring Claude to log to Brain MCP.
#
# Usage: auto-log-trigger.sh <tool_name> [tool_input] [tool_output]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
BRAIN_CLOUD_HOME="\${SCRIPT_DIR}"
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Source the auto-log library
if [[ -f "\${SCRIPT_DIR}/lib/auto-log-lib.sh" ]]; then
    source "\${SCRIPT_DIR}/lib/auto-log-lib.sh"
else
    # Inline minimal fallback
    CHANGE_THRESHOLD=3
    COUNTER_DIR="/tmp/.brain-cloud-counters-\$(id -u)"
    mkdir -p "$COUNTER_DIR" 2>/dev/null
    CHANGE_COUNTER_FILE="$COUNTER_DIR/.change-counter"
    ERROR_COUNTER_FILE="$COUNTER_DIR/.error-counter"

    get_change_counter() { [[ -f "$CHANGE_COUNTER_FILE" ]] && cat "$CHANGE_COUNTER_FILE" 2>/dev/null || echo "0"; }
    increment_change_counter() { local c=$(( $(get_change_counter) + 1 )); echo "$c" > "$CHANGE_COUNTER_FILE"; echo "$c"; }
    reset_change_counter() { echo "0" > "$CHANGE_COUNTER_FILE"; }
    get_error_counter() { [[ -f "$ERROR_COUNTER_FILE" ]] && cat "$ERROR_COUNTER_FILE" 2>/dev/null || echo "0"; }
    increment_error_counter() { local c=$(( $(get_error_counter) + 1 )); echo "$c" > "$ERROR_COUNTER_FILE"; echo "$c"; }
    reset_error_counter() { echo "0" > "$ERROR_COUNTER_FILE"; }

    emit_log_trigger() {
        local event_type="$1" instruction="$2"
        cat << EMIT_EOF
{
  "systemMessage": "AUTO-LOG ($event_type): $instruction. Call brain_thought with type='observation' to log."
}
EMIT_EOF
    }

    emit_sentiment_trigger() {
        local feeling="$1" target_type="$2" reason="$3"
        cat << EMIT_EOF
{
  "systemMessage": "SENTIMENT: Call brain_sentiment - feeling='$feeling', target_type='$target_type', reason='$reason'. Rate intensity 1-5."
}
EMIT_EOF
    }

    has_completed_todo() { echo "$1" | grep -qE '"status"\\s*:\\s*"completed"'; }
    is_git_commit() { echo "$1" | grep -qE 'git\\s+commit|git\\s+push'; }
    is_significant_file() {
        if echo "$1" | grep -qE '\\.(lock)$|package-lock|pnpm-lock|yarn\\.lock|node_modules|\\.git/|dist/|build/|__pycache__'; then
            return 1
        fi
        return 0
    }
fi

TOOL_NAME="\${1:-}"
TOOL_INPUT="\${2:-}"
TOOL_OUTPUT="\${3:-}"

if [[ -z "$TOOL_NAME" ]]; then
    exit 0
fi

case "$TOOL_NAME" in
    "TodoWrite")
        if has_completed_todo "$TOOL_INPUT"; then
            emit_log_trigger "task_complete" "Task marked complete - log progress and outcome"
        fi
        ;;
    "Edit"|"Write")
        if is_significant_file "$TOOL_INPUT"; then
            count=$(increment_change_counter)
            if [[ "$count" -ge "$CHANGE_THRESHOLD" ]]; then
                emit_log_trigger "code_changes" "Multiple files modified ($count changes) - log what changed and why"
                reset_change_counter
            fi
        fi
        ;;
    "Bash")
        if is_git_commit "$TOOL_INPUT"; then
            emit_log_trigger "commit" "Code committed - log the changes and reasoning"
            reset_change_counter
        fi
        if echo "$TOOL_OUTPUT" 2>/dev/null | grep -qiE "error|failed|exception"; then
            count=$(increment_error_counter)
            if [[ "$count" -ge 3 ]]; then
                emit_sentiment_trigger "frustrated" "debugging" "Multiple errors ($count)"
                reset_error_counter
            fi
        fi
        ;;
    "TaskUpdate")
        if echo "$TOOL_INPUT" | grep -qE '"status"\\s*:\\s*"completed"'; then
            emit_sentiment_trigger "satisfied" "task" "Task completed successfully"
        fi
        ;;
    *) ;;
esac

exit 0
`,

  "dx-auto-track.sh": `#!/usr/bin/env bash
# DX Auto-Tracking Hook - Brain Cloud
# Instruments slash commands for analytics via Brain MCP.

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
BRAIN_CLOUD_HOME="\${SCRIPT_DIR}"

# Try to source DX libs from local lib dir, exit gracefully if missing
LIB_DIR="\${SCRIPT_DIR}/lib"
source "\${LIB_DIR}/dx-db.sh" 2>/dev/null || exit 0
source "\${LIB_DIR}/dx-metrics.sh" 2>/dev/null || exit 0

COMMAND_NAME="\${1:-unknown}"
shift
COMMAND_ARGS="$*"
COMMAND_NAME="\${COMMAND_NAME#/}"

case "$COMMAND_NAME" in
    stats|feedback|patterns|checkpoint|health) ;;
    session_*|dx_*) exit 0 ;;
esac

if [[ -z "\${DX_SESSION_ID:-}" ]]; then
    export DX_SESSION_ID="$(date +%Y%m%d_%H%M%S)_$$"
fi

dx_start "$COMMAND_NAME" "$COMMAND_ARGS" 2>/dev/null || true
echo "$COMMAND_NAME" > /tmp/.dx-current-command 2>/dev/null || true
echo "$(dx_now_ms)" > /tmp/.dx-command-start 2>/dev/null || true

exit 0
`,

  "dx-auto-complete.sh": `#!/usr/bin/env bash
# DX Auto-Complete Hook - Brain Cloud
# Called after slash command completion to log results.

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
BRAIN_CLOUD_HOME="\${SCRIPT_DIR}"

LIB_DIR="\${SCRIPT_DIR}/lib"
source "\${LIB_DIR}/dx-db.sh" 2>/dev/null || exit 0
source "\${LIB_DIR}/dx-metrics.sh" 2>/dev/null || exit 0

OUTCOME="\${1:-success}"
ERROR_MSG="\${2:-}"

COMMAND_NAME=""
START_MS=""

if [[ -f /tmp/.dx-current-command ]]; then
    COMMAND_NAME=$(cat /tmp/.dx-current-command 2>/dev/null)
fi
if [[ -f /tmp/.dx-command-start ]]; then
    START_MS=$(cat /tmp/.dx-command-start 2>/dev/null)
fi

if [[ -n "$START_MS" ]]; then
    END_MS=$(dx_now_ms)
    DURATION_MS=$((END_MS - START_MS))
else
    DURATION_MS=0
fi

if [[ -n "$COMMAND_NAME" ]]; then
    dx_log_event "$COMMAND_NAME" "$OUTCOME" "$DURATION_MS" "" "$ERROR_MSG" 2>/dev/null || true
fi

rm -f /tmp/.dx-current-command /tmp/.dx-command-start 2>/dev/null || true

exit 0
`,

  "skill-analytics.sh": `#!/bin/bash
# Skill Analytics Hook - Brain Cloud
# Logs skill invocations to Brain MCP via brain_dx_event.
#
# Usage: skill-analytics.sh <tool_name> <tool_input> <tool_output>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
BRAIN_CLOUD_HOME="\${SCRIPT_DIR}"

TOOL_NAME="\${1:-}"
TOOL_INPUT="\${2:-}"
TOOL_OUTPUT="\${3:-}"

if [[ "$TOOL_NAME" != "Skill" ]]; then
    exit 0
fi

SKILL_NAME=$(echo "$TOOL_INPUT" | jq -r '.skill // empty' 2>/dev/null || echo "")
if [[ -z "$SKILL_NAME" ]]; then
    exit 0
fi

SKILL_ARGS=$(echo "$TOOL_INPUT" | jq -r '.args // ""' 2>/dev/null || echo "")

OUTCOME="success"
if echo "$TOOL_OUTPUT" | grep -qiE "error|failed|exception"; then
    OUTCOME="failure"
fi

TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

cat << EOF

<system-reminder>
SKILL ANALYTICS: Log this skill invocation to Brain MCP:

brain_dx_event(
  event_type="skill_invocation",
  event_data={
    "skill": "$SKILL_NAME",
    "args": "$SKILL_ARGS",
    "outcome": "$OUTCOME",
    "timestamp": "$TIMESTAMP"
  },
  tags=["skill-analytics", "skill:$SKILL_NAME"]
)

This enables tracking of command usage patterns for workflow optimization.
</system-reminder>

EOF

exit 0
`,
};

// ============================================
// HOOK LIB FILES
// ============================================

export const HOOK_LIBS: Record<string, string> = {
  "lib/auto-log-lib.sh": `#!/bin/bash
# Auto-Log Library - Brain Cloud
# Shared functions for automatic Brain MCP logging.

# ============================================
# CONFIGURATION
# ============================================

CHANGE_THRESHOLD=3
COUNTER_DIR="/tmp/.brain-cloud-counters-\$(id -u)"

CHANGE_COUNTER_FILE="$COUNTER_DIR/.change-counter"
ERROR_COUNTER_FILE="$COUNTER_DIR/.error-counter"

# ============================================
# COUNTER MANAGEMENT
# ============================================

init_counter_dir() {
    mkdir -p "$COUNTER_DIR" 2>/dev/null
}

get_change_counter() {
    init_counter_dir
    [[ -f "$CHANGE_COUNTER_FILE" ]] && cat "$CHANGE_COUNTER_FILE" 2>/dev/null || echo "0"
}

increment_change_counter() {
    init_counter_dir
    local count=$(( $(get_change_counter) + 1 ))
    echo "$count" > "$CHANGE_COUNTER_FILE"
    echo "$count"
}

reset_change_counter() {
    init_counter_dir
    echo "0" > "$CHANGE_COUNTER_FILE"
}

# ============================================
# LOG TRIGGER EMISSION
# ============================================

emit_log_trigger() {
    local event_type="$1"
    local instruction="$2"
    cat << EMIT_EOF
{
  "systemMessage": "AUTO-LOG ($event_type): $instruction. Call brain_thought with type='observation' to log."
}
EMIT_EOF
}

# ============================================
# EVENT DETECTION HELPERS
# ============================================

has_completed_todo() {
    echo "$1" | grep -qE '"status"\\s*:\\s*"completed"'
}

is_git_commit() {
    echo "$1" | grep -qE 'git\\s+commit|git\\s+push'
}

is_significant_file() {
    if echo "$1" | grep -qE '\\.(lock)$|package-lock|pnpm-lock|yarn\\.lock|node_modules|\\.git/|dist/|build/|__pycache__'; then
        return 1
    fi
    return 0
}

# ============================================
# SENTIMENT TRIGGERS
# ============================================

get_error_counter() {
    init_counter_dir
    [[ -f "$ERROR_COUNTER_FILE" ]] && cat "$ERROR_COUNTER_FILE" 2>/dev/null || echo "0"
}

increment_error_counter() {
    init_counter_dir
    local count=$(( $(get_error_counter) + 1 ))
    echo "$count" > "$ERROR_COUNTER_FILE"
    echo "$count"
}

reset_error_counter() {
    init_counter_dir
    echo "0" > "$ERROR_COUNTER_FILE"
}

emit_sentiment_trigger() {
    local feeling="$1" target_type="$2" reason="$3"
    cat << EMIT_EOF
{
  "systemMessage": "SENTIMENT: Call brain_sentiment - feeling='$feeling', target_type='$target_type', reason='$reason'. Rate intensity 1-5."
}
EMIT_EOF
}
`,
};

// ============================================
// COMMANDS - Curated standalone versions
// ============================================

export const COMMANDS: Record<string, string> = {
  "pickup.md": `---
category: ops
---

# /pickup - Morning Context Restoration

You are helping the user pick up where they left off. This command restores context from Brain Cloud and shows what changed while they were away.

## Purpose

This is the **first command to run each day**. It answers:
- "What was I working on?"
- "What happened while I was away?"
- "What should I do next?"

## Execution Steps

### Step 1: Recall Last Session from Brain

Use Brain MCP to recall recent context:

\`\`\`
brain_recall(query="last session summary", limit=3)
brain_search(query="todo deferred", limit=5)
\`\`\`

Extract and present:
- **Context**: What was the starting point?
- **Progress**: What was accomplished?
- **Decisions Made**: Key choices (don't re-decide these)
- **Deferred TODOs**: Work that was identified but deferred

### Step 2: Check What Changed Overnight

\`\`\`bash
BRANCH=$(git branch --show-current)
echo "Current branch: $BRANCH"

# Recent commits
echo "=== Recent commits ==="
git log --oneline -10

# Uncommitted changes
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [[ "$UNCOMMITTED" -gt 0 ]]; then
    echo "$UNCOMMITTED uncommitted changes"
fi
\`\`\`

### Step 3: Check for Pending Handoffs

\`\`\`
brain_search(query="handoff pending", limit=5)
\`\`\`

If handoffs found, display them:
\`\`\`
PENDING HANDOFFS:
- From {project}: "{message}"

Run /handoff --list for details.
\`\`\`

### Step 4: Check Brain for Blockers

\`\`\`
brain_recall(query="blocker", limit=3)
\`\`\`

### Step 5: Start Today's Session

\`\`\`
brain_session_start(mood="picking-up", goals=["restore context", "continue from yesterday"])
\`\`\`

## Output Format

Present findings in this structure:

\`\`\`
PICKUP SUMMARY
==============
Last Session: {date/time from brain}

WHERE YOU LEFT OFF
------------------
{Summary from brain recall}

DECISIONS ALREADY MADE (don't re-decide)
-----------------------------------------
{Recent decisions from brain}

DEFERRED WORK
-------------
{TODOs tagged as deferred}

WHAT CHANGED
------------
Branch: {current branch}
Recent commits: {count}
Uncommitted changes: {count}

PENDING HANDOFFS
----------------
{Any pending handoffs from other projects}

SUGGESTED NEXT ACTION
---------------------
Based on context: {specific suggestion}
\`\`\`

## Usage

\`\`\`
/pickup              # Full context restoration
/pickup quick        # Just show brain summary and next action
\`\`\`
`,

  "commit.md": `---
category: daily
---

# /commit - Smart Commits

You are helping the user create intelligent commits with conventional commit formatting, smart multi-commit splitting, and emoji enhancement.

## Your Role

Act as a Git expert who creates clean, meaningful commits. Analyze changes, detect when to split into multiple commits, and generate appropriate commit messages.

## Workflow

### 1. Analyze Changes

\`\`\`bash
# Check for staged changes
STAGED=$(git diff --cached --name-only)
if [[ -z "$STAGED" ]]; then
    echo "No staged changes found."
    echo ""
    echo "Current status:"
    git status --short
    echo ""
    echo "Stage files first, then run /commit again."
    exit 0
fi

echo "Staged files:"
echo "$STAGED"
echo ""
git diff --cached --stat
\`\`\`

### 2. Detect Commit Type

Analyze staged files to determine commit type:
- **feat**: New functionality (mostly new files)
- **fix**: Bug fixes (modifications to existing files)
- **docs**: Documentation changes (*.md, docs/)
- **test**: Test changes (*.test.*, *.spec.*)
- **refactor**: Code restructuring without behavior change
- **chore**: Maintenance, config, dependencies
- **style**: Formatting, whitespace
- **perf**: Performance improvements
- **ci**: CI/CD changes

### 3. Detect Scope

Auto-detect scope from file paths:
- \`src/auth/\` -> auth
- \`src/api/\` -> api
- \`src/components/\` -> ui
- \`docs/\` -> docs
- \`tests/\` -> test

### 4. Multi-Commit Detection

If staged changes span multiple types or scopes, offer to split:

\`\`\`
Change Analysis:
- src/auth/Login.js (feat) - New auth logic
- README.md (docs) - Updated guide
- tests/auth.test.js (test) - Auth tests

Option 1: Single commit
  feat: implement user authentication with docs and tests

Option 2: Multiple commits (recommended)
  1. feat(auth): implement user login component
  2. docs: update installation guide for auth setup
  3. test(auth): add authentication tests

Choose: [1] Single [2] Multiple [Enter for recommended]
\`\`\`

### 5. Generate Commit

Format: \`type(scope): description\`

Emoji mapping:
- feat -> new feature
- fix -> bug fix
- docs -> documentation
- style -> formatting
- refactor -> restructuring
- perf -> performance
- test -> tests
- chore -> maintenance

### 6. Branch Context

\`\`\`bash
BRANCH=$(git branch --show-current)
# Extract issue number from branch name if present
if [[ "$BRANCH" =~ issue-([0-9]+) ]]; then
    ISSUE_NUM=\${BASH_REMATCH[1]}
    # Add "Refs #N" to commit body
fi
\`\`\`

### 7. Log to Brain

After successful commit:
\`\`\`
brain_thought(
  content="Committed: {commit message} ({hash})",
  type="note",
  tags=["commit"]
)
\`\`\`

## Important

- **Commits use \`Refs #N\`** - reference issues but don't close them
- **PRs use \`Closes #N\`** - close issues when merged
- Always validate shell safety of commit messages
- Exclude .git files from staging
`,

  "health.md": `---
category: ops
---

# /health - Project Health Dashboard

You are showing the user a comprehensive health dashboard for their project.

## Purpose

Quick status check answering:
- "What's the state of things right now?"
- "Are there any problems I should know about?"
- "What needs my attention?"

## Execution Steps

### Step 1: Git Status

\`\`\`bash
echo "=== GIT STATUS ==="

BRANCH=$(git branch --show-current)
echo "Branch: $BRANCH"

# Ahead/behind
TRACKING=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)
if [[ -n "$TRACKING" ]]; then
    AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null)
    BEHIND=$(git rev-list --count HEAD..@{u} 2>/dev/null)
    echo "Tracking: $TRACKING (ahead $AHEAD, behind $BEHIND)"
fi

STAGED=$(git diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
UNSTAGED=$(git diff --numstat 2>/dev/null | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
echo "Changes: $STAGED staged, $UNSTAGED unstaged, $UNTRACKED untracked"

LAST_COMMIT=$(git log -1 --format='%h %s (%cr)' 2>/dev/null)
echo "Last commit: $LAST_COMMIT"
\`\`\`

### Step 2: Branch Health

\`\`\`bash
echo ""
echo "=== BRANCHES ==="

echo "Recent:"
git for-each-ref --sort=-committerdate --format='  %(refname:short) (%(committerdate:relative))' refs/heads/ | head -5

echo ""
echo "Stale (>7 days):"
git for-each-ref --sort=-committerdate --format='%(refname:short)|%(committerdate:relative)' refs/heads/ | while IFS='|' read branch date; do
    if [[ "$date" == *"week"* ]] || [[ "$date" == *"month"* ]] || [[ "$date" == *"year"* ]]; then
        echo "  $branch ($date)"
    fi
done
\`\`\`

### Step 3: Brain MCP Status

Check Brain MCP connectivity:

\`\`\`
brain_recall(query="recent activity", limit=1)
\`\`\`

Report whether Brain MCP responded successfully.

### Step 4: Code Quality Quick Scan

\`\`\`bash
echo ""
echo "=== QUICK SCAN ==="

# Large files
echo "Large files (>400 lines):"
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.py" 2>/dev/null | \\
    head -100 | while read file; do
        if [[ -f "$file" ]]; then
            LINES=$(wc -l < "$file" | tr -d ' ')
            if [[ $LINES -gt 400 ]]; then
                echo "  $file ($LINES lines)"
            fi
        fi
    done | head -5

# TODO count
TODO_COUNT=$(grep -r "TODO\\|FIXME" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" . 2>/dev/null | wc -l | tr -d ' ')
echo "TODOs/FIXMEs: $TODO_COUNT"
\`\`\`

## Output Format

\`\`\`
PROJECT HEALTH
==============

GIT
---
Branch: {branch} (ahead {n} of origin)
Changes: {staged} staged, {unstaged} unstaged, {untracked} untracked
Last commit: {hash} {message} ({time ago})

BRANCHES
--------
  {branch1} ({age})
  {branch2} ({age})
  Stale: {branch3} ({age}) - consider cleanup

BRAIN MCP
---------
  Status: connected / not available

CODE QUALITY
------------
  Large files: {count}
  TODOs: {count}

ATTENTION NEEDED
----------------
1. {issue needing attention}
2. {another issue}
\`\`\`

## Flags

\`\`\`
/health              # Full dashboard
/health git          # Just git status
/health brain        # Just Brain MCP status
\`\`\`
`,

  "handoff.md": `---
category: collaboration
---

# /handoff - Cross-Project Context Handoff

Pass context, decisions, or work to another agent in a different project via Brain Cloud.

## Usage

\`\`\`bash
/handoff "project-name" "context message"     # Send context to another project
/handoff --list                               # Show pending handoffs for this project
/handoff --claim ID                           # Mark a handoff as received
\`\`\`

## Examples

\`\`\`bash
/handoff brain "Added brain_recall to /do_task - you'll need to add the recall endpoint"
/handoff frontend "API endpoint /users/profile is ready - returns {name, email, avatar}"
/handoff --list
/handoff --claim abc123
\`\`\`

## How It Works

### Sending a Handoff

When you run \`/handoff {project} "{message}"\`:

1. Gather git context:
\`\`\`bash
CURRENT_PROJECT=$(basename $(git rev-parse --show-toplevel))
CURRENT_BRANCH=$(git branch --show-current)
RECENT_COMMITS=$(git log --oneline -3)
CHANGED_FILES=$(git diff --name-only HEAD~3 2>/dev/null | head -10)
\`\`\`

2. Send via Brain MCP:
\`\`\`
brain_handoff(
  to_project="{target_project}",
  message="{message}",
  handoff_type="context",
  metadata={
    "branch": "{branch}",
    "commits": "{recent commits}",
    "files": "{changed files}"
  }
)
\`\`\`

### Receiving Handoffs

When you run \`/handoff --list\`:

\`\`\`
brain_handoffs(project="{current_project}")
\`\`\`

Display:
\`\`\`
PENDING HANDOFFS
================

1. [{id}] From: {source_project} ({time ago})
   "{message}"

2. [{id}] From: {source_project} ({time ago})
   "{message}"

Run /handoff --claim {id} after addressing each handoff.
\`\`\`

### Claiming a Handoff

When you run \`/handoff --claim {id}\`:

\`\`\`
brain_handoff_claim(handoff_id="{id}", note="Acknowledged and working on it")
\`\`\`

## Handoff Types

- **Context**: General context passing (default)
- **Decision**: Needs a decision from receiving project
- **Blocker**: Blocked, urgent attention needed
- **Task**: Actionable work item

## Cross-Machine Support

Handoffs work across machines because they are stored in Brain Cloud:
- Work on laptop, handoff to yourself for desktop
- Handoff between dev VM and local machine
- Team handoffs (if sharing Brain Cloud instance)
`,

  "onboard.md": `---
category: meta
---

# /onboard - Welcome to Brain Cloud

You are guiding a new user through their first experience with Brain Cloud.

## Purpose

Provide a welcoming, guided introduction that:
- Explains what Brain Cloud does
- Introduces the most important commands
- Gets them productive quickly
- Doesn't overwhelm with information

## Execution Flow

### Step 1: Welcome

\`\`\`
WELCOME TO BRAIN CLOUD
=======================

I'm Claude, and I'll help you get set up in about 2 minutes.

Brain Cloud gives you:
- Persistent memory that survives between sessions
- Smart commands for commits, context restoration, and project health
- Cross-project handoffs and knowledge sharing
- Developer experience analytics

Let's get you started!
\`\`\`

### Step 2: Check Brain MCP Connection

\`\`\`
IF Brain MCP available:
  -> "Brain Cloud connected! Your thoughts, decisions, and sessions will be remembered."

IF Brain MCP not available:
  -> "Brain MCP not detected. Check your MCP server configuration."
  -> "See https://brain.steig.me for setup instructions."
  -> Continue with limited onboarding
\`\`\`

### Step 3: Introduce Key Commands

\`\`\`
THE COMMANDS YOU'LL USE MOST
----------------------------

1. /pickup - Start Your Day
   Recalls what you were working on, shows what changed overnight.
   Use it every morning!

2. /commit - Save Your Work
   Creates smart commits with conventional formatting and scope detection.

3. /health - Project Overview
   Shows git status, branch health, Brain MCP status, and code quality.

4. /handoff - Cross-Project Context
   Pass context between projects. Works across machines via Brain Cloud.

5. /onboard - This Guide
   Run it again anytime for a refresher.
\`\`\`

### Step 4: Quick Brain Tour

\`\`\`
YOUR BRAIN CLOUD
----------------

Brain Cloud remembers everything:

What it tracks:
- Thoughts      <- Observations and insights
- Decisions     <- Choices and rationale
- Sessions      <- Work sessions and context
- Sentiments    <- How things are going
- DX Events     <- Developer experience metrics
- Handoffs      <- Cross-project context passing

I automatically:
- Start sessions when you begin working
- Log decisions and learnings
- Track patterns in your workflow

You don't need to do anything - just work naturally!
\`\`\`

### Step 5: Try It Now

\`\`\`
LET'S TRY IT!
--------------

Run this command to see your project status:

  /health

This shows:
- Current branch and git status
- Branch health
- Brain MCP connectivity
- Code quality scan

Go ahead, try it now!
\`\`\`

### Step 6: Wrap Up

\`\`\`
YOU'RE ALL SET!
===============

Quick reference:
- /pickup    - Morning catch-up
- /commit    - Smart commits
- /health    - Project overview
- /handoff   - Cross-project context

Pro tip: Start tomorrow with /pickup to see how
Brain Cloud remembers your context across sessions.

Happy coding!
\`\`\`

## Arguments

\`\`\`
/onboard           - Full guided onboarding
/onboard quick     - Abbreviated version (skip details)
\`\`\`
`,
};

// ============================================
// DIRECTIVES - CLAUDE.md content for Brain Cloud users
// ============================================

export const DIRECTIVES = `# Brain Cloud

<brain_logging>
Log to Brain MCP. If unavailable, note and continue.

## Session Lifecycle
- brain_session_start() - First message of conversation
- brain_session_end() + suggest "/clear" - When task complete, topic switch, or conversation long

## brain_thought - BE SELECTIVE

**LOG these (high value):**
- \`insight\` - Learned something non-obvious about codebase, patterns, gotchas
- \`todo\` - Work identified but deferred (include WHY deferred)
- \`blocker\` - Stuck, needs external input or decision

**SKIP these (noise):**
- "Starting to look at X" - No value
- "Reading file Y" - No value
- Routine progress updates - No value

**Content must be specific and retrievable:**
\`\`\`
GOOD: "Auth at src/auth.ts:45 skips expiry check - relies on /verify endpoint"
BAD:  "Found auth issue"
\`\`\`

## brain_decide - Log when choosing between approaches
Only when you actually considered alternatives. Include: options, chosen, rationale.

## brain_sentiment - Log frustration/satisfaction sparingly
Only for strong signals (confusing code, elegant solution).
</brain_logging>
`;

// ============================================
// SETTINGS FRAGMENT - Claude Code settings.json additions
// ============================================

export const SETTINGS_FRAGMENT = {
  hooks: {
    UserPromptSubmit: [
      {
        matcher: "",
        hooks: [
          {
            type: "command" as const,
            command: "~/.claude/hooks/brain-cloud/session-start.sh",
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: "",
        hooks: [
          {
            type: "command" as const,
            command:
              '~/.claude/hooks/brain-cloud/auto-log-trigger.sh "$TOOL_NAME" "$TOOL_INPUT" "$TOOL_OUTPUT"',
          },
          {
            type: "command" as const,
            command:
              '~/.claude/hooks/brain-cloud/skill-analytics.sh "$TOOL_NAME" "$TOOL_INPUT" "$TOOL_OUTPUT"',
          },
        ],
      },
    ],
  },
};
