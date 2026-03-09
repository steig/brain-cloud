#!/bin/bash
# Auto-Log Library
# Part of Claude DX Framework v2.19.0 - Event-Based Brain MCP Logging
#
# This library provides shared functions for automatic Brain MCP logging.
# Used by auto-log-trigger.sh to emit logging requirements on significant events.

# ============================================
# CONFIGURATION
# ============================================

CHANGE_THRESHOLD=3          # Number of file changes before triggering log
COUNTER_DIR="${PROJECT_ROOT:-.}/.ai/work"
CHANGE_COUNTER_FILE="$COUNTER_DIR/.change-counter"

# ============================================
# COUNTER MANAGEMENT
# ============================================

# Initialize counter directory if needed
init_counter_dir() {
    mkdir -p "$COUNTER_DIR" 2>/dev/null
}

# Get current change counter value
get_change_counter() {
    init_counter_dir
    if [[ -f "$CHANGE_COUNTER_FILE" ]]; then
        cat "$CHANGE_COUNTER_FILE" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Increment change counter
increment_change_counter() {
    init_counter_dir
    local count
    count=$(get_change_counter)
    count=$((count + 1))
    echo "$count" > "$CHANGE_COUNTER_FILE"
    echo "$count"
}

# Reset change counter
reset_change_counter() {
    init_counter_dir
    echo "0" > "$CHANGE_COUNTER_FILE"
}

# ============================================
# LOG TRIGGER EMISSION
# ============================================

# Emit a system message requiring Claude to log to Brain MCP
# Usage: emit_log_trigger <event_type> <instruction>
emit_log_trigger() {
    local event_type="$1"
    local instruction="$2"

    cat << EOF
{
  "systemMessage": "AUTO-LOG ($event_type): $instruction. Call brain_thought with type='observation' to log."
}
EOF
}

# ============================================
# EVENT DETECTION HELPERS
# ============================================

# Check if input contains a completed todo
has_completed_todo() {
    local input="$1"
    echo "$input" | grep -qE '"status"\s*:\s*"completed"'
}

# Check if input is a git commit command
is_git_commit() {
    local input="$1"
    echo "$input" | grep -qE 'git\s+commit|git\s+push'
}

# Check if this is a significant file (not lock files, not generated)
is_significant_file() {
    local input="$1"
    # Skip lock files and generated directories (but allow config files like .json, .yaml)
    if echo "$input" | grep -qE '\.(lock)$|package-lock|pnpm-lock|yarn\.lock|node_modules|\.git/|dist/|build/|__pycache__'; then
        return 1
    fi
    return 0
}

# ============================================
# SENTIMENT TRIGGERS
# ============================================

ERROR_COUNTER_FILE="$COUNTER_DIR/.error-counter"

get_error_counter() {
    init_counter_dir
    [[ -f "$ERROR_COUNTER_FILE" ]] && cat "$ERROR_COUNTER_FILE" 2>/dev/null || echo "0"
}

increment_error_counter() {
    init_counter_dir
    local count=$(($(get_error_counter) + 1))
    echo "$count" > "$ERROR_COUNTER_FILE"
    echo "$count"
}

reset_error_counter() {
    init_counter_dir
    echo "0" > "$ERROR_COUNTER_FILE"
}

emit_sentiment_trigger() {
    local feeling="$1" target_type="$2" reason="$3"
    cat << EOF
{
  "systemMessage": "SENTIMENT: Call brain_sentiment - feeling='$feeling', target_type='$target_type', reason='$reason'. Rate intensity 1-5."
}
EOF
}
