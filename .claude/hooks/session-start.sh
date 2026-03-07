#!/bin/bash
# Session Start Hook
# Part of LDC AI Framework v2.0.0 - Proactive Developer Experience
#
# This hook runs on the first user prompt of a session to provide
# proactive context and warnings about what changed.
#
# Triggered by: user-prompt-submit hook (checks if new session)

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load the proactive checks library
source "$SCRIPT_DIR/lib/proactive-checks.sh"

# ============================================
# SESSION DETECTION
# ============================================

# Check if this is a new session (first prompt in >8 hours)
is_new_session() {
    local session_dir="$PROJECT_ROOT/.ai/work/sessions/$(get_username)"
    local marker_file="$session_dir/.last-session-check"

    # Create session dir if needed
    mkdir -p "$session_dir"

    # Check marker file
    if [[ -f "$marker_file" ]]; then
        local last_check=$(cat "$marker_file" 2>/dev/null)
        local now=$(date '+%s')
        local gap_hours=$(( (now - last_check) / 3600 ))

        if [[ $gap_hours -lt $SESSION_GAP_HOURS ]]; then
            return 1  # Not a new session
        fi
    fi

    # Update marker
    date '+%s' > "$marker_file"
    return 0  # New session
}

# ============================================
# MAIN
# ============================================

main() {
    cd "$PROJECT_ROOT"

    # Only run checks for new sessions
    if ! is_new_session; then
        exit 0
    fi

    # Run all session start checks
    run_session_start_checks

    # Emit Brain session start trigger for new sessions
    cat << 'EOF'
{
  "systemMessage": "SESSION START: Call brain_session_start with your initial mood and goals for this session."
}
EOF

    # Suggest /pickup if significant time has passed
    local session_gap=$(check_session_gap 2>/dev/null | grep "SESSION_GAP=" | cut -d= -f2)

    if [[ "$session_gap" == "new" ]] || [[ -n "$session_gap" && "$session_gap" -ge 24 ]]; then
        echo ""
        suggest "Run /pickup for full context restoration"
    fi
}

# Run if executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
