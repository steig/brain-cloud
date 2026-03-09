#!/bin/bash
# Work Log Management Utilities
# Part of LDC AI Framework v2.0.0

# ============================================
# DIRECTORY STRUCTURE
# ============================================
# .ai/work/
# ├── _templates/           # Templates
# │   ├── session.md
# │   └── issue.md
# ├── sessions/             # Personal daily logs (isolated by developer)
# │   └── {username}/
# │       └── {YYYY-MM-DD}.md
# ├── issues/               # Shared issue work logs
# │   └── {N}.md
# └── plans/                # Shared planning docs
#     └── {topic}.md
# ============================================

WORK_DIR=".ai/work"
SESSIONS_DIR="$WORK_DIR/sessions"
ISSUES_DIR="$WORK_DIR/issues"
PLANS_DIR="$WORK_DIR/plans"
TEMPLATES_DIR="$WORK_DIR/_templates"

# Legacy paths (for migration)
TEMPLATE_FILE="$WORK_DIR/_template.md"
LEGACY_SESSION_TEMPLATE="$WORK_DIR/_session-template.md"

# ============================================
# CROSS-PLATFORM COMPATIBILITY LAYER
# ============================================

# Detect OS and set platform-specific commands
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS (BSD)
    _sed_inplace() { sed -i '' "$@"; }
    _parse_date() { date -j -f '%Y-%m-%d' "$1" '+%s' 2>/dev/null; }
    _days_ago() { date -v-${1}d '+%s'; }
else
    # Linux (GNU)
    _sed_inplace() { sed -i "$@"; }
    _parse_date() { date -d "$1" '+%s' 2>/dev/null; }
    _days_ago() { date -d "$1 days ago" '+%s'; }
fi

# Escape content for safe sed insertion (prevents injection)
_escape_for_sed() {
    printf '%s' "$1" | tr '\n' ' ' | sed 's/[\/&]/\\&/g'
}

# Cross-platform file locking using mkdir (atomic on all POSIX systems)
# Usage: _with_lock "lockfile" "command"
_acquire_lock() {
    local lockdir="$1"
    local max_attempts=50  # 5 seconds with 100ms sleep
    local attempt=0
    
    while ! mkdir "$lockdir" 2>/dev/null; do
        ((attempt++))
        if [[ $attempt -ge $max_attempts ]]; then
            return 1  # Failed to acquire lock
        fi
        sleep 0.1
    done
    return 0
}

_release_lock() {
    local lockdir="$1"
    rmdir "$lockdir" 2>/dev/null || true
}

# ============================================
# DEVELOPER IDENTITY
# ============================================

# Cache for developer username (avoid repeated lookups)
_CACHED_DEV_USERNAME=""

# Get developer's GitHub username (or fallback to git config)
get_developer_username() {
    # Return cached value if available
    if [[ -n "$_CACHED_DEV_USERNAME" ]]; then
        echo "$_CACHED_DEV_USERNAME"
        return 0
    fi

    local username=""

    # Try gh CLI first (most reliable for GitHub username)
    if command -v gh &>/dev/null; then
        username=$(gh api user --jq '.login' 2>/dev/null)
    fi

    # Fallback to git config user.name
    if [[ -z "$username" ]]; then
        username=$(git config user.name 2>/dev/null | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
    fi

    # Fallback to system username
    if [[ -z "$username" ]]; then
        username="${USER:-developer}"
    fi

    # Sanitize username (alphanumeric, dash, underscore only)
    username=$(echo "$username" | tr -cd '[:alnum:]-_')

    # Cache and return
    _CACHED_DEV_USERNAME="$username"
    echo "$username"
}

# Get developer's session directory
get_developer_session_dir() {
    local username=$(get_developer_username)
    echo "$SESSIONS_DIR/$username"
}

# ============================================
# SECTION HEADER CONSTANTS (for maintainability)
# ============================================

readonly SECTION_CURRENT_STATE="## Current State"
readonly SECTION_NEXT_STEPS="## Next Steps"
readonly SECTION_DECISIONS="## Decisions Made"
readonly SECTION_FAILED="## What Didn't Work"
readonly SECTION_KEY_FILES="## Key Files"
readonly SECTION_BLOCKERS="## Blockers"
readonly SECTION_CONTEXT="## Context for Next Agent"
readonly SECTION_SESSION_LOG="## Session Log"

# Session log sections
readonly SESSION_SECTION_CONTEXT="## Context"
readonly SESSION_SECTION_PROGRESS="## Progress"
readonly SESSION_SECTION_DECISIONS="## Decisions Made"
readonly SESSION_SECTION_FAILED="## Didn't Work"
readonly SESSION_SECTION_FILES="## Key Files"
readonly SESSION_SECTION_HANDOFF="## Handoff Notes"

# Ensure work directory structure exists
ensure_work_dir() {
    mkdir -p "$WORK_DIR"
    mkdir -p "$ISSUES_DIR"
    mkdir -p "$PLANS_DIR"
    mkdir -p "$TEMPLATES_DIR"
}

# Ensure developer's session directory exists
ensure_session_dir() {
    local session_dir=$(get_developer_session_dir)
    mkdir -p "$session_dir"
    echo "$session_dir"
}

# Get work log path for an issue (now in issues/ subdirectory)
get_work_log_path() {
    local issue_number="$1"
    # Check for legacy path first (migration support)
    local legacy_path="$WORK_DIR/issue-${issue_number}.md"
    if [[ -f "$legacy_path" ]]; then
        echo "$legacy_path"
        return 0
    fi
    echo "$ISSUES_DIR/${issue_number}.md"
}

# Get work log path for a PR (now in issues/ subdirectory)
get_pr_log_path() {
    local pr_number="$1"
    # Check for legacy path first (migration support)
    local legacy_path="$WORK_DIR/pr-${pr_number}.md"
    if [[ -f "$legacy_path" ]]; then
        echo "$legacy_path"
        return 0
    fi
    echo "$ISSUES_DIR/pr-${pr_number}.md"
}

# Check if work log exists for issue
work_log_exists() {
    local issue_number="$1"
    [[ -f "$(get_work_log_path "$issue_number")" ]]
}

# Get issue template path (check new location, fallback to legacy)
get_issue_template() {
    local new_path="$TEMPLATES_DIR/issue.md"
    if [[ -f "$new_path" ]]; then
        echo "$new_path"
    elif [[ -f "$TEMPLATE_FILE" ]]; then
        echo "$TEMPLATE_FILE"
    else
        echo ""
    fi
}

# Create work log from template
create_work_log() {
    local issue_number="$1"
    local title="$2"
    local branch="${3:-$(git branch --show-current 2>/dev/null || echo 'main')}"
    local repo_url="${4:-$(git remote get-url origin 2>/dev/null | sed 's/\.git$//' || echo 'https://github.com/owner/repo')}"
    
    ensure_work_dir
    
    local log_path="$(get_work_log_path "$issue_number")"
    local timestamp="$(date -u '+%Y-%m-%d %H:%M UTC')"
    local date_only="$(date '+%Y-%m-%d')"
    local issue_url="${repo_url}/issues/${issue_number}"
    
    local template=$(get_issue_template)
    local username=$(get_developer_username)

    if [[ -n "$template" && -f "$template" ]]; then
        # Use template
        sed -e "s|{{NUMBER}}|${issue_number}|g" \
            -e "s|{{TITLE}}|${title}|g" \
            -e "s|{{BRANCH_NAME}}|${branch}|g" \
            -e "s|{{ISSUE_URL}}|${issue_url}|g" \
            -e "s|{{TIMESTAMP}}|${timestamp}|g" \
            -e "s|{{DATE}}|${date_only}|g" \
            -e "s|{{AGENT/USER}}|@${username}|g" \
            -e "s|{{USERNAME}}|${username}|g" \
            "$template" > "$log_path"
    else
        # Fallback if template missing
        cat > "$log_path" << EOF
# Issue #${issue_number}: ${title}

**Status**: in-progress  
**Branch**: \`${branch}\`  
**GitHub**: ${issue_url}  
**Last Updated**: ${timestamp}

---

## Current State

- [ ] Initial investigation

## Next Steps

1. Understand the requirements
2. Plan implementation
3. Execute and test

## Decisions Made

- *None yet*

## What Didn't Work

- *None yet*

## Key Files

- *To be determined*

## Blockers

None

## Context for Next Agent

*Starting fresh — no prior context.*

---

## Session Log

### ${date_only} — Claude Agent

- Created work log
- Starting investigation

---

*Work log created by LDC AI Framework*
EOF
    fi
    
    echo "$log_path"
}

# Read work log content
read_work_log() {
    local issue_number="$1"
    local log_path="$(get_work_log_path "$issue_number")"
    
    if [[ -f "$log_path" ]]; then
        cat "$log_path"
    else
        echo ""
    fi
}

# Update work log timestamp
update_work_log_timestamp() {
    local issue_number="$1"
    local log_path="$(get_work_log_path "$issue_number")"
    local timestamp="$(date -u '+%Y-%m-%d %H:%M UTC')"
    
    if [[ -f "$log_path" ]]; then
        # Update the Last Updated line
        _sed_inplace "s|^\*\*Last Updated\*\*:.*|\*\*Last Updated\*\*: ${timestamp}|" "$log_path"
    fi
}

# Update work log status
update_work_log_status() {
    local issue_number="$1"
    local new_status="$2"  # pending, in-progress, blocked, ready-for-review
    local log_path="$(get_work_log_path "$issue_number")"
    
    if [[ -f "$log_path" ]]; then
        _sed_inplace "s|^\*\*Status\*\*:.*|\*\*Status\*\*: ${new_status}|" "$log_path"
        update_work_log_timestamp "$issue_number"
    fi
}

# Add session entry to work log
add_session_entry() {
    local issue_number="$1"
    local entry="$2"
    local log_path="$(get_work_log_path "$issue_number")"
    local date_only="$(date '+%Y-%m-%d')"
    local time_only="$(date '+%H:%M')"
    
    if [[ -f "$log_path" ]]; then
        # Insert new session entry after "## Session Log" header
        local session_entry="### ${date_only} ${time_only} — Claude Agent\n\n${entry}\n"
        
        # Use awk to insert after the Session Log header
        awk -v entry="$session_entry" '
            /^## Session Log/ {
                print
                getline
                print
                print entry
                next
            }
            {print}
        ' "$log_path" > "${log_path}.tmp" && mv "${log_path}.tmp" "$log_path"
        
        update_work_log_timestamp "$issue_number"
    fi
}

# Add decision to work log
add_decision() {
    local issue_number="$1"
    local decision="$2"
    local log_path="$(get_work_log_path "$issue_number")"
    
    if [[ -f "$log_path" ]]; then
        # Remove "None yet" placeholder if present
        _sed_inplace 's/^- \*None yet\*$//' "$log_path"
        
        # Add decision after "## Decisions Made" header
        awk -v decision="- ${decision}" '
            /^## Decisions Made/ {
                print
                getline
                if (/^$/) print
                print decision
                next
            }
            {print}
        ' "$log_path" > "${log_path}.tmp" && mv "${log_path}.tmp" "$log_path"
        
        update_work_log_timestamp "$issue_number"
    fi
}

# Add failed approach to work log
add_failed_approach() {
    local issue_number="$1"
    local approach="$2"
    local log_path="$(get_work_log_path "$issue_number")"
    
    if [[ -f "$log_path" ]]; then
        # Remove "None yet" placeholder if present
        _sed_inplace 's/^- \*None yet\*$//' "$log_path"
        
        # Add failed approach after "## What Didn't Work" header
        awk -v approach="- ${approach}" '
            /^## What Didn.*t Work/ {
                print
                getline
                if (/^$/) print
                print approach
                next
            }
            {print}
        ' "$log_path" > "${log_path}.tmp" && mv "${log_path}.tmp" "$log_path"
        
        update_work_log_timestamp "$issue_number"
    fi
}

# Delete work log (when issue is closed)
delete_work_log() {
    local issue_number="$1"
    local log_path="$(get_work_log_path "$issue_number")"
    
    if [[ -f "$log_path" ]]; then
        rm "$log_path"
        echo "Deleted work log for issue #${issue_number}"
    fi
}

# Archive work log (optional - move to archive instead of delete)
archive_work_log() {
    local issue_number="$1"
    local log_path="$(get_work_log_path "$issue_number")"
    local archive_dir="$WORK_DIR/.archive"
    
    if [[ -f "$log_path" ]]; then
        mkdir -p "$archive_dir"
        mv "$log_path" "$archive_dir/"
        echo "Archived work log for issue #${issue_number}"
    fi
}

# List active work logs (checks both new and legacy locations)
list_work_logs() {
    ensure_work_dir

    echo "Active Work Logs:"
    echo "================="

    local count=0

    # Helper function to display a log file
    _display_log() {
        local log_file="$1"
        local filename=$(basename "$log_file")
        local title=$(head -1 "$log_file" | sed 's/^# //')
        local status=$(grep -m1 '^\*\*Status\*\*:' "$log_file" | sed 's/.*: //')
        local updated=$(grep -m1 '^\*\*Last Updated\*\*:' "$log_file" | sed 's/.*: //')

        echo ""
        echo "📋 $filename"
        echo "   Title: $title"
        echo "   Status: $status"
        echo "   Updated: $updated"
    }

    # Check new location: issues/*.md
    if [[ -d "$ISSUES_DIR" ]]; then
        for log_file in "$ISSUES_DIR"/*.md "$ISSUES_DIR"/pr-*.md; do
            if [[ -f "$log_file" ]]; then
                _display_log "$log_file"
                ((count++))
            fi
        done
    fi

    # Check legacy location: issue-*.md, pr-*.md in root work dir
    for log_file in "$WORK_DIR"/issue-*.md "$WORK_DIR"/pr-*.md; do
        if [[ -f "$log_file" ]]; then
            _display_log "$log_file"
            ((count++))
        fi
    done

    if [[ $count -eq 0 ]]; then
        echo ""
        echo "No active work logs found."
    else
        echo ""
        echo "Total: $count active work log(s)"
    fi
}

# Get summary of work log for quick handoff
get_work_log_summary() {
    local issue_number="$1"
    local log_path="$(get_work_log_path "$issue_number")"
    
    if [[ -f "$log_path" ]]; then
        echo "=== WORK LOG SUMMARY: Issue #${issue_number} ==="
        echo ""
        
        # Extract key sections
        echo "📊 STATUS:"
        grep -m1 '^\*\*Status\*\*:' "$log_path" | sed 's/\*\*Status\*\*: /  /'
        echo ""
        
        echo "📍 CURRENT STATE:"
        awk '/^## Current State/,/^## Next Steps/' "$log_path" | grep -E '^\s*-\s*\[' | head -10
        echo ""
        
        echo "➡️ NEXT STEPS:"
        awk '/^## Next Steps/,/^## Decisions Made/' "$log_path" | grep -E '^\s*[0-9]+\.' | head -5
        echo ""
        
        echo "✅ DECISIONS MADE:"
        awk '/^## Decisions Made/,/^## What Didn/' "$log_path" | grep -E '^\s*-' | grep -v 'None yet' | head -5
        echo ""
        
        echo "❌ WHAT DIDN'T WORK:"
        awk '/^## What Didn/,/^## Key Files/' "$log_path" | grep -E '^\s*-' | grep -v 'None yet' | head -5
        echo ""
        
        echo "🚧 BLOCKERS:"
        awk '/^## Blockers/,/^## Context/' "$log_path" | grep -v '^##' | grep -v '^$' | head -3
        echo ""
        
        echo "💡 CONTEXT FOR NEXT AGENT:"
        awk '/^## Context for Next Agent/,/^---/' "$log_path" | grep -v '^##' | grep -v '^---' | head -5
        
        echo ""
        echo "========================================="
    else
        echo "No work log found for issue #${issue_number}"
    fi
}

# ============================================
# SESSION LOG FUNCTIONS (Ambient logging)
# ============================================
# Sessions are isolated per developer to prevent conflicts
# Path: .ai/work/sessions/{username}/{YYYY-MM-DD}.md
# ============================================

# Get session template path (check new location, fallback to legacy)
get_session_template() {
    local new_path="$TEMPLATES_DIR/session.md"
    if [[ -f "$new_path" ]]; then
        echo "$new_path"
    elif [[ -f "$LEGACY_SESSION_TEMPLATE" ]]; then
        echo "$LEGACY_SESSION_TEMPLATE"
    else
        echo ""
    fi
}

# Get today's session log path (now per-developer)
get_session_log_path() {
    local date_str="${1:-$(date '+%Y-%m-%d')}"
    local session_dir=$(get_developer_session_dir)
    echo "$session_dir/${date_str}.md"
}

# Check if today's session log exists
session_log_exists() {
    [[ -f "$(get_session_log_path)" ]]
}

# Create today's session log (fast operation)
create_session_log() {
    local session_dir=$(ensure_session_dir)
    local log_path="$(get_session_log_path)"
    local date_str="$(date '+%Y-%m-%d')"
    local time_str="$(date '+%H:%M')"
    local username=$(get_developer_username)

    if [[ -f "$log_path" ]]; then
        # Already exists, just return path
        echo "$log_path"
        return 0
    fi

    local template=$(get_session_template)
    if [[ -n "$template" && -f "$template" ]]; then
        sed -e "s|{{DATE}}|${date_str}|g" \
            -e "s|{{TIME}}|${time_str}|g" \
            -e "s|{{USERNAME}}|${username}|g" \
            "$template" > "$log_path"
    else
        # Minimal fallback with username in header
        cat > "$log_path" << EOF
# Session Log - ${date_str}
**Developer**: @${username}

## Context


## Progress

### ${time_str}
- Session started

## Decisions Made


## Didn't Work


## Key Files


## Handoff Notes

EOF
    fi

    echo "$log_path"
}

# Ensure session log exists (idempotent)
ensure_session_log() {
    if ! session_log_exists; then
        create_session_log > /dev/null
    fi
    get_session_log_path
}

# Add quick note to session log (append after Progress section header)
session_note() {
    local note="$1"
    local log_path="$(ensure_session_log)"
    local time_str="$(date '+%H:%M')"
    local safe_note=$(_escape_for_sed "$note")
    local lockdir="${log_path}.lockdir"
    
    # Acquire lock and insert after Progress section header
    if _acquire_lock "$lockdir"; then
        if grep -q "^${SESSION_SECTION_PROGRESS}" "$log_path"; then
            _sed_inplace "/${SESSION_SECTION_PROGRESS}/a\\
\\
### ${time_str}\\
- ${safe_note}
" "$log_path"
        fi
        _release_lock "$lockdir"
    fi
}

# Add decision to session log (with injection protection)
session_decision() {
    local decision="$1"
    local log_path="$(ensure_session_log)"
    local safe_decision=$(_escape_for_sed "$decision")
    local lockdir="${log_path}.lockdir"
    
    # Acquire lock and append to Decisions Made section
    if _acquire_lock "$lockdir"; then
        if grep -q "^${SESSION_SECTION_DECISIONS}" "$log_path"; then
            _sed_inplace "/${SESSION_SECTION_DECISIONS}/a\\
- ${safe_decision}
" "$log_path"
        fi
        _release_lock "$lockdir"
    fi
}

# Add failed approach to session log (with injection protection)
session_failed() {
    local approach="$1"
    local log_path="$(ensure_session_log)"
    local safe_approach=$(_escape_for_sed "$approach")
    local lockdir="${log_path}.lockdir"
    
    # Acquire lock and append to Didn't Work section
    if _acquire_lock "$lockdir"; then
        if grep -q "^${SESSION_SECTION_FAILED}" "$log_path"; then
            _sed_inplace "/${SESSION_SECTION_FAILED}/a\\
- ${safe_approach}
" "$log_path"
        fi
        _release_lock "$lockdir"
    fi
}

# Add key file to session log (with injection protection)
session_file() {
    local file_path="$1"
    local reason="${2:-touched}"
    local log_path="$(ensure_session_log)"
    local safe_path=$(_escape_for_sed "$file_path")
    local safe_reason=$(_escape_for_sed "$reason")
    local lockdir="${log_path}.lockdir"
    
    # Acquire lock and append to Key Files section
    if _acquire_lock "$lockdir"; then
        if grep -q "^${SESSION_SECTION_FILES}" "$log_path"; then
            _sed_inplace "/${SESSION_SECTION_FILES}/a\\
- \\\`${safe_path}\\\` - ${safe_reason}
" "$log_path"
        fi
        _release_lock "$lockdir"
    fi
}

# Get session log summary (for handoff)
get_session_summary() {
    local log_path="$(get_session_log_path)"
    
    if [[ -f "$log_path" ]]; then
        echo "=== TODAY'S SESSION ===" 
        echo ""
        cat "$log_path"
    else
        echo "No session log for today."
    fi
}

# Read session log content
read_session_log() {
    local date_str="${1:-$(date '+%Y-%m-%d')}"
    local log_path="$(get_session_log_path "$date_str")"
    
    if [[ -f "$log_path" ]]; then
        cat "$log_path"
    else
        echo ""
    fi
}

# Clean up old session logs (default: older than 14 days)
# Uses find -mtime for 10x faster cleanup (cross-platform)
cleanup_session_logs() {
    local days="${1:-14}"
    local total_deleted=0

    # Clean up new structure: sessions/{username}/*.md
    if [[ -d "$SESSIONS_DIR" ]]; then
        local deleted_files=$(find "$SESSIONS_DIR" -name "*.md" -type f -mtime +${days} 2>/dev/null)
        if [[ -n "$deleted_files" ]]; then
            local count=$(echo "$deleted_files" | wc -l | tr -d ' ')
            find "$SESSIONS_DIR" -name "*.md" -type f -mtime +${days} -delete 2>/dev/null
            ((total_deleted += count))
        fi
        # Clean up empty developer directories
        find "$SESSIONS_DIR" -type d -empty -delete 2>/dev/null
    fi

    # Also clean up legacy structure: session-*.md in root work dir
    local legacy_files=$(find "$WORK_DIR" -maxdepth 1 -name "session-*.md" -type f -mtime +${days} 2>/dev/null)
    if [[ -n "$legacy_files" ]]; then
        local count=$(echo "$legacy_files" | wc -l | tr -d ' ')
        find "$WORK_DIR" -maxdepth 1 -name "session-*.md" -type f -mtime +${days} -delete 2>/dev/null
        ((total_deleted += count))
    fi

    if [[ $total_deleted -gt 0 ]]; then
        echo "Cleaned up $total_deleted session log(s) older than $days days"
    fi

    # Also clean up stale lock directories
    find "$WORK_DIR" -name "*.lockdir" -type d -mtime +1 -exec rmdir {} \; 2>/dev/null
}

# List session logs (grouped by developer)
list_session_logs() {
    ensure_work_dir

    echo "Session Logs:"
    echo "============="

    local total_count=0

    # List new structure: sessions/{username}/*.md
    if [[ -d "$SESSIONS_DIR" ]]; then
        for user_dir in "$SESSIONS_DIR"/*/; do
            if [[ -d "$user_dir" ]]; then
                local username=$(basename "$user_dir")
                local user_count=0
                echo ""
                echo "  👤 @$username"

                for log_file in "$user_dir"*.md; do
                    if [[ -f "$log_file" ]]; then
                        local filename=$(basename "$log_file" .md)
                        local size=$(wc -l < "$log_file" | tr -d ' ')
                        echo "     📅 $filename ($size lines)"
                        ((user_count++))
                        ((total_count++))
                    fi
                done

                if [[ $user_count -eq 0 ]]; then
                    echo "     (no sessions)"
                fi
            fi
        done
    fi

    # List legacy structure: session-*.md in root
    local legacy_count=0
    for log_file in "$WORK_DIR"/session-*.md; do
        if [[ -f "$log_file" ]]; then
            if [[ $legacy_count -eq 0 ]]; then
                echo ""
                echo "  📁 Legacy (unmigrated)"
            fi
            local filename=$(basename "$log_file")
            local date_str=$(echo "$filename" | sed 's/session-//' | sed 's/\.md//')
            local size=$(wc -l < "$log_file" | tr -d ' ')
            echo "     📅 $date_str ($size lines)"
            ((legacy_count++))
            ((total_count++))
        fi
    done

    if [[ $total_count -eq 0 ]]; then
        echo "  No session logs found."
    else
        echo ""
        echo "Total: $total_count session log(s)"
    fi
}
