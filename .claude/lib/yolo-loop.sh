#!/bin/bash
# LDC AI Framework - Yolo Loop Library v1.0.0
# Autonomous milestone runner with safeguards
#
# Usage:
#   source .claude/lib/yolo-loop.sh
#   yolo_init 5              # Start yolo for milestone 5
#   yolo_next_issue          # Get next issue to work on
#   yolo_mark_done 42 45     # Mark issue 42 done with PR 45
#   yolo_mark_failed 43 "Build failed"  # Mark failure
#   yolo_check_safeguards    # Check if should pause/stop

YOLO_DIR=".ai/work/yolo"
YOLO_STATE_FILE="$YOLO_DIR/active.json"
YOLO_HISTORY_DIR="$YOLO_DIR/history"

# Cross-platform date handling
if [[ "$OSTYPE" == "darwin"* ]]; then
    _yolo_timestamp() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }
else
    _yolo_timestamp() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }
fi

# Ensure yolo directory exists
yolo_ensure_dir() {
    mkdir -p "$YOLO_DIR"
    mkdir -p "$YOLO_HISTORY_DIR"
}

# Check if yolo session is active
yolo_is_active() {
    [[ -f "$YOLO_STATE_FILE" ]] && \
    [[ "$(jq -r '.status' "$YOLO_STATE_FILE" 2>/dev/null)" =~ ^(running|paused)$ ]]
}

# Initialize yolo session for a milestone
yolo_init() {
    local milestone="$1"
    local checkpoint_every="${2:-3}"
    local max_issues="${3:-20}"

    yolo_ensure_dir

    if yolo_is_active; then
        echo "❌ Yolo session already active. Use 'yolo resume' or 'yolo stop' first."
        return 1
    fi

    echo "🚀 Initializing yolo for milestone #${milestone}..."

    # Fetch issues from milestone
    local issues_json
    issues_json=$(gh issue list --milestone "$milestone" --state open --json number,title,labels --limit 100 2>/dev/null)

    if [[ -z "$issues_json" || "$issues_json" == "[]" ]]; then
        echo "❌ No open issues found in milestone #${milestone}"
        return 1
    fi

    # Transform to yolo format with pending status
    local yolo_issues
    yolo_issues=$(echo "$issues_json" | jq '[.[] | {number: .number, title: .title, status: "pending", pr: null, attempts: 0, lastError: null}]')

    local issue_count
    issue_count=$(echo "$yolo_issues" | jq 'length')

    # Create state file
    cat > "$YOLO_STATE_FILE" << EOF
{
  "milestone": $milestone,
  "started": "$(_yolo_timestamp)",
  "lastUpdated": "$(_yolo_timestamp)",
  "status": "running",
  "checkpointEvery": $checkpoint_every,
  "currentIssue": null,
  "issues": $yolo_issues,
  "safeguards": {
    "maxIssues": $max_issues,
    "consecutiveFailures": 0,
    "maxConsecutiveFailures": 3,
    "issuesSinceCheckpoint": 0,
    "totalCompleted": 0,
    "totalFailed": 0
  },
  "log": [
    {
      "timestamp": "$(_yolo_timestamp)",
      "event": "initialized",
      "message": "Yolo session started for milestone #$milestone with $issue_count issues"
    }
  ]
}
EOF

    echo "✅ Yolo initialized with $issue_count issues"
    echo "   Checkpoint every: $checkpoint_every issues"
    echo "   Max issues: $max_issues"
    yolo_show_status

    return 0
}

# Get current yolo state
yolo_get_state() {
    if [[ -f "$YOLO_STATE_FILE" ]]; then
        cat "$YOLO_STATE_FILE"
    else
        echo "{}"
    fi
}

# Update state file
yolo_update_state() {
    local updates="$1"
    local current
    current=$(yolo_get_state)

    echo "$current" | jq ". + {lastUpdated: \"$(_yolo_timestamp)\"} + $updates" > "$YOLO_STATE_FILE"
}

# Add log entry
yolo_log() {
    local event="$1"
    local message="$2"
    local current
    current=$(yolo_get_state)

    local new_entry="{\"timestamp\": \"$(_yolo_timestamp)\", \"event\": \"$event\", \"message\": \"$message\"}"

    echo "$current" | jq ".log += [$new_entry] | .lastUpdated = \"$(_yolo_timestamp)\"" > "$YOLO_STATE_FILE"
}

# Get next pending issue
yolo_next_issue() {
    if ! yolo_is_active; then
        echo ""
        return 1
    fi

    local state
    state=$(yolo_get_state)

    # Check if paused
    local status
    status=$(echo "$state" | jq -r '.status')
    if [[ "$status" == "paused" ]]; then
        echo "PAUSED"
        return 2
    fi

    # Find first pending issue
    local next_issue
    next_issue=$(echo "$state" | jq -r '.issues[] | select(.status == "pending") | .number' | head -1)

    if [[ -z "$next_issue" ]]; then
        echo ""
        return 1
    fi

    # Mark as in_progress
    local updated_issues
    updated_issues=$(echo "$state" | jq --argjson num "$next_issue" \
        '.issues |= map(if .number == $num then .status = "in_progress" else . end)')

    echo "$updated_issues" | jq ". + {currentIssue: $next_issue, lastUpdated: \"$(_yolo_timestamp)\"}" > "$YOLO_STATE_FILE"

    yolo_log "issue_started" "Starting work on issue #$next_issue"

    echo "$next_issue"
}

# Mark issue as completed
yolo_mark_done() {
    local issue_number="$1"
    local pr_number="$2"

    local state
    state=$(yolo_get_state)

    # Update issue status
    local updated
    updated=$(echo "$state" | jq --argjson num "$issue_number" --argjson pr "${pr_number:-null}" \
        '.issues |= map(if .number == $num then .status = "completed" | .pr = $pr else . end)')

    # Update safeguards
    updated=$(echo "$updated" | jq '
        .safeguards.consecutiveFailures = 0 |
        .safeguards.issuesSinceCheckpoint += 1 |
        .safeguards.totalCompleted += 1 |
        .currentIssue = null
    ')

    echo "$updated" | jq ". + {lastUpdated: \"$(_yolo_timestamp)\"}" > "$YOLO_STATE_FILE"

    yolo_log "issue_completed" "Completed issue #$issue_number with PR #$pr_number"

    echo "✅ Issue #$issue_number marked complete (PR #$pr_number)"
}

# Mark issue as failed
yolo_mark_failed() {
    local issue_number="$1"
    local error_msg="$2"

    local state
    state=$(yolo_get_state)

    # Update issue status and increment attempts
    local updated
    updated=$(echo "$state" | jq --argjson num "$issue_number" --arg err "$error_msg" \
        '.issues |= map(if .number == $num then .status = "failed" | .attempts += 1 | .lastError = $err else . end)')

    # Update safeguards
    updated=$(echo "$updated" | jq '
        .safeguards.consecutiveFailures += 1 |
        .safeguards.totalFailed += 1 |
        .currentIssue = null
    ')

    echo "$updated" | jq ". + {lastUpdated: \"$(_yolo_timestamp)\"}" > "$YOLO_STATE_FILE"

    yolo_log "issue_failed" "Failed issue #$issue_number: $error_msg"

    echo "❌ Issue #$issue_number marked failed: $error_msg"
}

# Skip issue (blocked, not ready, etc.)
yolo_skip_issue() {
    local issue_number="$1"
    local reason="$2"

    local state
    state=$(yolo_get_state)

    local updated
    updated=$(echo "$state" | jq --argjson num "$issue_number" --arg reason "$reason" \
        '.issues |= map(if .number == $num then .status = "skipped" | .lastError = $reason else . end)')

    updated=$(echo "$updated" | jq '.currentIssue = null')

    echo "$updated" | jq ". + {lastUpdated: \"$(_yolo_timestamp)\"}" > "$YOLO_STATE_FILE"

    yolo_log "issue_skipped" "Skipped issue #$issue_number: $reason"

    echo "⏭️  Issue #$issue_number skipped: $reason"
}

# Check safeguards - returns action needed
# Returns: "continue", "checkpoint", "pause", "stop"
yolo_check_safeguards() {
    local state
    state=$(yolo_get_state)

    local checkpoint_every consecutive_failures max_failures issues_since total_completed max_issues
    checkpoint_every=$(echo "$state" | jq -r '.checkpointEvery')
    consecutive_failures=$(echo "$state" | jq -r '.safeguards.consecutiveFailures')
    max_failures=$(echo "$state" | jq -r '.safeguards.maxConsecutiveFailures')
    issues_since=$(echo "$state" | jq -r '.safeguards.issuesSinceCheckpoint')
    total_completed=$(echo "$state" | jq -r '.safeguards.totalCompleted')
    max_issues=$(echo "$state" | jq -r '.safeguards.maxIssues')

    # Check max issues
    if [[ $total_completed -ge $max_issues ]]; then
        echo "stop"
        return 0
    fi

    # Check consecutive failures
    if [[ $consecutive_failures -ge $max_failures ]]; then
        echo "pause"
        return 0
    fi

    # Check checkpoint
    if [[ $issues_since -ge $checkpoint_every ]]; then
        echo "checkpoint"
        return 0
    fi

    # Check if any pending issues remain
    local pending_count
    pending_count=$(echo "$state" | jq '[.issues[] | select(.status == "pending")] | length')
    if [[ $pending_count -eq 0 ]]; then
        echo "done"
        return 0
    fi

    echo "continue"
}

# Pause yolo session
yolo_pause() {
    local reason="${1:-User requested pause}"

    yolo_update_state '{"status": "paused"}'
    yolo_log "paused" "$reason"

    echo "⏸️  Yolo paused: $reason"
}

# Resume yolo session
yolo_resume() {
    if ! [[ -f "$YOLO_STATE_FILE" ]]; then
        echo "❌ No yolo session to resume"
        return 1
    fi

    local status
    status=$(jq -r '.status' "$YOLO_STATE_FILE")

    if [[ "$status" != "paused" ]]; then
        echo "❌ Yolo is not paused (status: $status)"
        return 1
    fi

    # Reset checkpoint counter on resume
    local state
    state=$(yolo_get_state)
    echo "$state" | jq '.status = "running" | .safeguards.issuesSinceCheckpoint = 0 | .safeguards.consecutiveFailures = 0' > "$YOLO_STATE_FILE"

    yolo_log "resumed" "Yolo session resumed"

    echo "▶️  Yolo resumed"
    yolo_show_status
}

# Stop yolo session (archive to history)
yolo_stop() {
    if ! [[ -f "$YOLO_STATE_FILE" ]]; then
        echo "❌ No yolo session to stop"
        return 1
    fi

    local state
    state=$(yolo_get_state)
    local milestone
    milestone=$(echo "$state" | jq -r '.milestone')

    # Update status
    yolo_update_state '{"status": "stopped"}'
    yolo_log "stopped" "Yolo session stopped by user"

    # Archive to history
    local archive_file="$YOLO_HISTORY_DIR/milestone-${milestone}-$(_yolo_timestamp | tr ':' '-').json"
    mv "$YOLO_STATE_FILE" "$archive_file"

    echo "🛑 Yolo stopped. Archived to: $archive_file"
}

# Complete yolo session successfully
yolo_complete() {
    local state
    state=$(yolo_get_state)
    local milestone
    milestone=$(echo "$state" | jq -r '.milestone')

    yolo_update_state '{"status": "completed"}'
    yolo_log "completed" "All issues in milestone completed!"

    # Archive to history
    local archive_file="$YOLO_HISTORY_DIR/milestone-${milestone}-$(_yolo_timestamp | tr ':' '-').json"
    mv "$YOLO_STATE_FILE" "$archive_file"

    echo "🎉 Yolo complete! All issues done. Archived to: $archive_file"
}

# Show current status
yolo_show_status() {
    if ! [[ -f "$YOLO_STATE_FILE" ]]; then
        echo "No active yolo session."
        return 1
    fi

    local state
    state=$(yolo_get_state)

    local milestone status started
    milestone=$(echo "$state" | jq -r '.milestone')
    status=$(echo "$state" | jq -r '.status')
    started=$(echo "$state" | jq -r '.started')

    local pending completed failed skipped in_progress
    pending=$(echo "$state" | jq '[.issues[] | select(.status == "pending")] | length')
    completed=$(echo "$state" | jq '[.issues[] | select(.status == "completed")] | length')
    failed=$(echo "$state" | jq '[.issues[] | select(.status == "failed")] | length')
    skipped=$(echo "$state" | jq '[.issues[] | select(.status == "skipped")] | length')
    in_progress=$(echo "$state" | jq '[.issues[] | select(.status == "in_progress")] | length')

    local total=$((pending + completed + failed + skipped + in_progress))

    echo ""
    echo "═══════════════════════════════════════════"
    echo "  🚀 YOLO STATUS: Milestone #$milestone"
    echo "═══════════════════════════════════════════"
    echo ""
    echo "  Status:  $status"
    echo "  Started: $started"
    echo ""
    echo "  Progress:"
    echo "    ✅ Completed:   $completed"
    echo "    🔄 In Progress: $in_progress"
    echo "    ⏳ Pending:     $pending"
    echo "    ❌ Failed:      $failed"
    echo "    ⏭️  Skipped:     $skipped"
    echo "    ─────────────────"
    echo "    📊 Total:       $total"
    echo ""

    # Show current issue if any
    local current_issue
    current_issue=$(echo "$state" | jq -r '.currentIssue // empty')
    if [[ -n "$current_issue" ]]; then
        local current_title
        current_title=$(echo "$state" | jq -r --argjson num "$current_issue" '.issues[] | select(.number == $num) | .title')
        echo "  Current: #$current_issue - $current_title"
        echo ""
    fi

    # Show safeguard status
    local checkpoint_every issues_since consecutive_failures
    checkpoint_every=$(echo "$state" | jq -r '.checkpointEvery')
    issues_since=$(echo "$state" | jq -r '.safeguards.issuesSinceCheckpoint')
    consecutive_failures=$(echo "$state" | jq -r '.safeguards.consecutiveFailures')

    echo "  Safeguards:"
    echo "    Checkpoint: $issues_since / $checkpoint_every issues"
    echo "    Failures:   $consecutive_failures / 3 consecutive"
    echo ""
    echo "═══════════════════════════════════════════"
}

# Show detailed issue list
yolo_show_issues() {
    if ! [[ -f "$YOLO_STATE_FILE" ]]; then
        echo "No active yolo session."
        return 1
    fi

    local state
    state=$(yolo_get_state)

    echo ""
    echo "Issues:"
    echo "───────"

    echo "$state" | jq -r '.issues[] |
        if .status == "completed" then "  ✅ #\(.number) - \(.title) (PR #\(.pr))"
        elif .status == "in_progress" then "  🔄 #\(.number) - \(.title)"
        elif .status == "failed" then "  ❌ #\(.number) - \(.title) (\(.lastError))"
        elif .status == "skipped" then "  ⏭️  #\(.number) - \(.title) (\(.lastError))"
        else "  ⏳ #\(.number) - \(.title)"
        end'
}

# Get issue info for work log integration
yolo_get_issue_info() {
    local issue_number="$1"

    local state
    state=$(yolo_get_state)

    echo "$state" | jq --argjson num "$issue_number" '.issues[] | select(.number == $num)'
}

# Retry a failed issue (reset to pending)
yolo_retry_issue() {
    local issue_number="$1"

    local state
    state=$(yolo_get_state)

    local updated
    updated=$(echo "$state" | jq --argjson num "$issue_number" \
        '.issues |= map(if .number == $num then .status = "pending" else . end)')

    echo "$updated" | jq ". + {lastUpdated: \"$(_yolo_timestamp)\"}" > "$YOLO_STATE_FILE"

    yolo_log "issue_retry" "Issue #$issue_number reset for retry"

    echo "🔄 Issue #$issue_number queued for retry"
}
