#!/usr/bin/env bash

# DX Framework Database Library
# SQLite operations for analytics, feedback, patterns, and state management
# Version: 1.0.0

# Configuration
DX_DATA_DIR="${DX_DATA_DIR:-${HOME}/.claude/data}"
DX_DB="${DX_DB:-${DX_DATA_DIR}/dx.db}"

# Get schema directory (bash/zsh compatible)
if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
    DX_SCHEMA_DIR="${DX_SCHEMA_DIR:-$(dirname "${BASH_SOURCE[0]}")/../schema}"
else
    DX_SCHEMA_DIR="${DX_SCHEMA_DIR:-${HOME}/.claude/schema}"
fi
DX_SESSION_ID="${DX_SESSION_ID:-$(date +%Y%m%d_%H%M%S)_$$}"

# Export session ID for use by other scripts
export DX_SESSION_ID

# Ensure data directory exists with secure permissions
dx_ensure_data_dir() {
    if [[ ! -d "$DX_DATA_DIR" ]]; then
        mkdir -p "$DX_DATA_DIR"
        chmod 700 "$DX_DATA_DIR"
    fi
}

# Initialize database with schema
dx_init_db() {
    dx_ensure_data_dir

    if [[ ! -f "$DX_DB" ]]; then
        if [[ -f "${DX_SCHEMA_DIR}/dx.sql" ]]; then
            sqlite3 "$DX_DB" < "${DX_SCHEMA_DIR}/dx.sql"
            chmod 600 "$DX_DB"
            echo "DX database initialized at: $DX_DB"
        else
            echo "Error: Schema file not found at ${DX_SCHEMA_DIR}/dx.sql" >&2
            return 1
        fi
    fi
}

# Execute a query and return results
dx_query() {
    local query="$1"
    local format="${2:-column}"  # column, csv, json, line

    dx_ensure_data_dir
    [[ -f "$DX_DB" ]] || dx_init_db

    case "$format" in
        json)
            sqlite3 -json "$DX_DB" "$query" 2>/dev/null || echo "[]"
            ;;
        csv)
            sqlite3 -header -csv "$DX_DB" "$query"
            ;;
        line)
            sqlite3 -line "$DX_DB" "$query"
            ;;
        *)
            sqlite3 -header -column "$DX_DB" "$query"
            ;;
    esac
}

# Execute a query without output (for inserts/updates)
dx_exec() {
    local query="$1"

    dx_ensure_data_dir
    [[ -f "$DX_DB" ]] || dx_init_db

    sqlite3 "$DX_DB" "$query"
}

# Safely escape a string for SQL (prevent injection)
dx_escape() {
    local value="$1"
    # Replace single quotes with two single quotes
    echo "${value//\'/\'\'}"
}

# Log a command event
dx_log_event() {
    local command="$1"
    local outcome="${2:-success}"
    local duration_ms="${3:-0}"
    local args="${4:-}"
    local error_message="${5:-}"
    local tokens_in="${6:-}"
    local tokens_out="${7:-}"
    local model="${8:-}"

    # Get current context
    local branch context
    branch=$(git branch --show-current 2>/dev/null || echo "")
    context=$(cat <<EOF
{"branch": "$(dx_escape "$branch")", "cwd": "$(dx_escape "$PWD")"}
EOF
)

    local query
    query=$(cat <<EOF
INSERT INTO events (
    session_id, command, outcome, duration_ms, args,
    error_message, tokens_in, tokens_out, model, context
) VALUES (
    '$(dx_escape "$DX_SESSION_ID")',
    '$(dx_escape "$command")',
    '$(dx_escape "$outcome")',
    ${duration_ms:-0},
    $([ -n "$args" ] && echo "'$(dx_escape "$args")'" || echo "NULL"),
    $([ -n "$error_message" ] && echo "'$(dx_escape "$error_message")'" || echo "NULL"),
    $([ -n "$tokens_in" ] && echo "$tokens_in" || echo "NULL"),
    $([ -n "$tokens_out" ] && echo "$tokens_out" || echo "NULL"),
    $([ -n "$model" ] && echo "'$(dx_escape "$model")'" || echo "NULL"),
    '$(dx_escape "$context")'
);
EOF
)

    dx_exec "$query"
}

# Log AI feedback (suggestion vs actual)
dx_log_feedback() {
    local suggestion_type="$1"
    local suggested_value="$2"
    local actual_value="${3:-$suggested_value}"
    local event_id="${4:-}"
    local context="${5:-}"

    local accepted=0
    local modified=0

    if [[ "$suggested_value" == "$actual_value" ]]; then
        accepted=1
    elif [[ -n "$actual_value" ]]; then
        modified=1
    fi

    # Generate hash for deduplication
    local suggestion_hash
    suggestion_hash=$(echo -n "$suggestion_type:$suggested_value" | sha256sum | cut -d' ' -f1)

    local query
    query=$(cat <<EOF
INSERT INTO feedback (
    session_id, event_id, suggestion_type, suggestion_hash,
    suggested_value, actual_value, accepted, modified, context
) VALUES (
    '$(dx_escape "$DX_SESSION_ID")',
    $([ -n "$event_id" ] && echo "$event_id" || echo "NULL"),
    '$(dx_escape "$suggestion_type")',
    '$(dx_escape "$suggestion_hash")',
    '$(dx_escape "$suggested_value")',
    '$(dx_escape "$actual_value")',
    $accepted,
    $modified,
    $([ -n "$context" ] && echo "'$(dx_escape "$context")'" || echo "NULL")
);
EOF
)

    dx_exec "$query"
}

# Record explicit user rating
dx_rate_last() {
    local rating="$1"  # -1, 0, or 1

    local query
    query=$(cat <<EOF
UPDATE feedback
SET explicit_rating = $rating
WHERE id = (SELECT MAX(id) FROM feedback WHERE session_id = '$(dx_escape "$DX_SESSION_ID")');
EOF
)

    dx_exec "$query"
}

# Save a checkpoint
dx_save_checkpoint() {
    local name="${1:-}"
    local checkpoint_type="${2:-manual}"
    local notes="${3:-}"

    # Generate name if not provided
    if [[ -z "$name" ]]; then
        name="checkpoint_$(date +%H%M%S)"
    fi

    # Gather state
    local branch commit_sha modified_files staged_files
    branch=$(git branch --show-current 2>/dev/null || echo "")
    commit_sha=$(git rev-parse HEAD 2>/dev/null || echo "")
    modified_files=$(git diff --name-only 2>/dev/null | jq -R . | jq -s . 2>/dev/null || echo "[]")
    staged_files=$(git diff --cached --name-only 2>/dev/null | jq -R . | jq -s . 2>/dev/null || echo "[]")

    # Build state JSON
    local state_json
    state_json=$(cat <<EOF
{
    "modified_files": $modified_files,
    "staged_files": $staged_files,
    "env": {
        "PWD": "$(dx_escape "$PWD")",
        "LAST_COMMAND": "$(dx_escape "${DX_LAST_COMMAND:-}")"
    }
}
EOF
)

    # Get current todos if available
    local todos_snapshot="[]"
    if [[ -f ".claude/state/todos.json" ]]; then
        todos_snapshot=$(cat .claude/state/todos.json 2>/dev/null || echo "[]")
    fi

    local query
    query=$(cat <<EOF
INSERT INTO checkpoints (
    session_id, checkpoint_name, checkpoint_type, branch, commit_sha,
    state_json, files_modified, todos_snapshot, notes
) VALUES (
    '$(dx_escape "$DX_SESSION_ID")',
    '$(dx_escape "$name")',
    '$(dx_escape "$checkpoint_type")',
    '$(dx_escape "$branch")',
    '$(dx_escape "$commit_sha")',
    '$(dx_escape "$state_json")',
    '$(dx_escape "$modified_files")',
    '$(dx_escape "$todos_snapshot")',
    $([ -n "$notes" ] && echo "'$(dx_escape "$notes")'" || echo "NULL")
);
EOF
)

    dx_exec "$query"
    echo "Checkpoint '$name' saved"
}

# Get a checkpoint by name or latest
dx_get_checkpoint() {
    local name="${1:-latest}"

    local query
    if [[ "$name" == "latest" ]]; then
        query="SELECT * FROM checkpoints ORDER BY timestamp DESC LIMIT 1;"
    else
        query="SELECT * FROM checkpoints WHERE checkpoint_name = '$(dx_escape "$name")' ORDER BY timestamp DESC LIMIT 1;"
    fi

    dx_query "$query" "json"
}

# List checkpoints
dx_list_checkpoints() {
    local limit="${1:-10}"

    dx_query "SELECT checkpoint_name, checkpoint_type, branch, timestamp FROM checkpoints ORDER BY timestamp DESC LIMIT $limit;"
}

# Record a pattern (or update if exists)
dx_record_pattern() {
    local pattern_type="$1"
    local pattern_key="$2"
    local pattern_value="$3"
    local context="${4:-}"

    local query
    query=$(cat <<EOF
INSERT INTO patterns (pattern_type, pattern_key, pattern_value, context, occurrences, confidence)
VALUES (
    '$(dx_escape "$pattern_type")',
    '$(dx_escape "$pattern_key")',
    '$(dx_escape "$pattern_value")',
    $([ -n "$context" ] && echo "'$(dx_escape "$context")'" || echo "NULL"),
    1,
    0.5
)
ON CONFLICT(pattern_type, pattern_key, pattern_value) DO UPDATE SET
    occurrences = occurrences + 1,
    last_seen = datetime('now'),
    confidence = MIN(0.99, confidence + (1.0 - confidence) * 0.1);
EOF
)

    dx_exec "$query"
}

# Get suggested next action based on patterns
dx_suggest_next() {
    local current_command="$1"
    local threshold="${2:-0.3}"

    dx_query "
        SELECT pattern_value as next_command,
               occurrences,
               ROUND(confidence * 100, 1) as confidence_pct
        FROM patterns
        WHERE pattern_type = 'sequence'
          AND pattern_key = '$(dx_escape "$current_command")'
          AND confidence >= $threshold
        ORDER BY confidence DESC, occurrences DESC
        LIMIT 3;
    "
}

# Get command stats
dx_get_stats() {
    local days="${1:-7}"

    echo "=== Command Stats (Last $days days) ==="
    dx_query "
        SELECT command,
               COUNT(*) as runs,
               SUM(CASE WHEN outcome='success' THEN 1 ELSE 0 END) as success,
               ROUND(100.0 * SUM(CASE WHEN outcome='success' THEN 1 ELSE 0 END) / COUNT(*), 1) as rate,
               ROUND(AVG(duration_ms)/1000.0, 2) as avg_sec
        FROM events
        WHERE timestamp > datetime('now', '-$days days')
          AND outcome IS NOT NULL
        GROUP BY command
        ORDER BY runs DESC
        LIMIT 15;
    "

    echo ""
    echo "=== Daily Activity ==="
    dx_query "
        SELECT DATE(timestamp) as date,
               COUNT(*) as commands,
               COUNT(DISTINCT session_id) as sessions
        FROM events
        WHERE timestamp > datetime('now', '-$days days')
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
        LIMIT 7;
    "
}

# Get feedback stats
dx_get_feedback_stats() {
    echo "=== AI Suggestion Acceptance ==="
    dx_query "SELECT * FROM v_feedback_acceptance;"

    echo ""
    echo "=== Recent Rejections ==="
    dx_query "
        SELECT suggestion_type,
               substr(suggested_value, 1, 50) as suggested,
               substr(actual_value, 1, 50) as actual,
               timestamp
        FROM feedback
        WHERE accepted = 0
        ORDER BY timestamp DESC
        LIMIT 5;
    "
}

# Update cost tracking
dx_log_cost() {
    local model="$1"
    local tokens_in="$2"
    local tokens_out="$3"

    # Rough cost estimates (update these based on actual pricing)
    local cost_per_1k_in cost_per_1k_out
    case "$model" in
        *opus*)   cost_per_1k_in=0.015;  cost_per_1k_out=0.075 ;;
        *sonnet*) cost_per_1k_in=0.003;  cost_per_1k_out=0.015 ;;
        *haiku*)  cost_per_1k_in=0.00025; cost_per_1k_out=0.00125 ;;
        *)        cost_per_1k_in=0.003;  cost_per_1k_out=0.015 ;;
    esac

    local cost
    cost=$(echo "scale=6; ($tokens_in * $cost_per_1k_in / 1000) + ($tokens_out * $cost_per_1k_out / 1000)" | bc)

    local query
    query=$(cat <<EOF
INSERT INTO cost_tracking (date, model, tokens_in, tokens_out, estimated_cost_usd, command_count)
VALUES (DATE('now'), '$(dx_escape "$model")', $tokens_in, $tokens_out, $cost, 1)
ON CONFLICT(date, model) DO UPDATE SET
    tokens_in = tokens_in + $tokens_in,
    tokens_out = tokens_out + $tokens_out,
    estimated_cost_usd = estimated_cost_usd + $cost,
    command_count = command_count + 1;
EOF
)

    dx_exec "$query"
}

# Get cost summary
dx_get_costs() {
    local days="${1:-30}"

    echo "=== Cost Summary (Last $days days) ==="
    dx_query "
        SELECT model,
               SUM(tokens_in) as total_in,
               SUM(tokens_out) as total_out,
               ROUND(SUM(estimated_cost_usd), 4) as total_usd,
               SUM(command_count) as commands
        FROM cost_tracking
        WHERE date > DATE('now', '-$days days')
        GROUP BY model
        ORDER BY total_usd DESC;
    "

    echo ""
    echo "=== Daily Costs ==="
    dx_query "
        SELECT date,
               SUM(tokens_in + tokens_out) as total_tokens,
               ROUND(SUM(estimated_cost_usd), 4) as cost_usd
        FROM cost_tracking
        WHERE date > DATE('now', '-7 days')
        GROUP BY date
        ORDER BY date DESC;
    "
}

# Record test correlation
dx_record_test_failure() {
    local source_file="$1"
    local test_file="$2"

    local query
    query=$(cat <<EOF
INSERT INTO test_correlations (source_file, test_file, co_failures, total_changes, last_failure)
VALUES ('$(dx_escape "$source_file")', '$(dx_escape "$test_file")', 1, 1, datetime('now'))
ON CONFLICT(source_file, test_file) DO UPDATE SET
    co_failures = co_failures + 1,
    last_failure = datetime('now'),
    correlation_strength = CAST(co_failures + 1 AS REAL) / total_changes;
EOF
)

    dx_exec "$query"
}

# Get affected tests for files
dx_get_affected_tests() {
    local files="$1"  # Comma-separated file list

    # Convert to SQL IN clause
    local in_clause
    in_clause=$(echo "$files" | tr ',' '\n' | sed "s/^/'/" | sed "s/$/'/" | tr '\n' ',' | sed 's/,$//')

    dx_query "
        SELECT DISTINCT test_file,
               ROUND(correlation_strength * 100, 1) as confidence
        FROM test_correlations
        WHERE source_file IN ($in_clause)
          AND correlation_strength > 0.3
        ORDER BY correlation_strength DESC;
    "
}

# CLI interface for testing
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-help}" in
        init)
            dx_init_db
            ;;
        stats)
            dx_get_stats "${2:-7}"
            ;;
        feedback)
            dx_get_feedback_stats
            ;;
        costs)
            dx_get_costs "${2:-30}"
            ;;
        checkpoints)
            dx_list_checkpoints "${2:-10}"
            ;;
        query)
            shift
            dx_query "$*"
            ;;
        log-event)
            dx_log_event "$2" "${3:-success}" "${4:-0}"
            echo "Event logged"
            ;;
        *)
            echo "DX Database CLI"
            echo ""
            echo "Usage: $0 <command> [args]"
            echo ""
            echo "Commands:"
            echo "  init              Initialize database"
            echo "  stats [days]      Show command statistics"
            echo "  feedback          Show feedback/acceptance stats"
            echo "  costs [days]      Show cost summary"
            echo "  checkpoints [n]   List recent checkpoints"
            echo "  query <sql>       Run arbitrary query"
            echo "  log-event <cmd> [outcome] [duration_ms]  Log an event"
            ;;
    esac
fi

# Export functions
export -f dx_init_db dx_query dx_exec dx_escape
export -f dx_log_event dx_log_feedback dx_rate_last
export -f dx_save_checkpoint dx_get_checkpoint dx_list_checkpoints
export -f dx_record_pattern dx_suggest_next
export -f dx_get_stats dx_get_feedback_stats
export -f dx_log_cost dx_get_costs
export -f dx_record_test_failure dx_get_affected_tests
