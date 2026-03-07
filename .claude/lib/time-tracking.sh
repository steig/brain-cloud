#!/bin/bash

# Time Tracking and Issue Commenting System
# Tracks time spent on tasks and logs activities to GitHub issues for retrospectives

# Configuration
TIME_TRACKING_DIR="/tmp/.claude-time-tracking"

# Create secure directory with proper permissions
create_secure_tracking_dir() {
    if [[ ! -d "$TIME_TRACKING_DIR" ]]; then
        mkdir -p "$TIME_TRACKING_DIR"
        chmod 700 "$TIME_TRACKING_DIR"  # Owner-only access
    fi
}

# Filter sensitive data before logging to GitHub
filter_sensitive_data() {
    local content="$1"
    # Remove common sensitive patterns
    echo "$content" | sed -E \
        -e 's/(password|token|key|secret|auth|bearer|api_key)=[^[:space:]]*/REDACTED/gi' \
        -e 's/([A-Za-z0-9+\/]{20,}={0,2})/REDACTED_BASE64/g' \
        -e 's/(ghp_[A-Za-z0-9]{36})/REDACTED_GITHUB_TOKEN/g' \
        -e 's/(sk-[A-Za-z0-9]{48})/REDACTED_OPENAI_KEY/g'
}

# Load security utilities if available
if [[ -f ".claude/lib/security-utils.sh" ]]; then
    source .claude/lib/security-utils.sh
fi

# Safe shell quoting function (fallback if security-utils not available)
safe_quote() {
    local input="$1"
    printf '%q' "$input"
}

# Initialize secure tracking directory
create_secure_tracking_dir

# Get current timestamp in ISO 8601 format
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Get human-readable timestamp
get_readable_timestamp() {
    date +"%Y-%m-%d %H:%M:%S"
}

# Start time tracking for a command/issue
start_time_tracking() {
    local command="$1"
    local issue_number="${2:-}"
    local description="${3:-}"
    
    # Input validation
    if [[ -z "$command" ]]; then
        echo "Error: Command is required for time tracking" >&2
        return 1
    fi
    
    # Validate command format (alphanumeric, underscore, hyphen only)
    if [[ ! "$command" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        echo "Error: Invalid command format. Use alphanumeric, underscore, or hyphen only" >&2
        return 1
    fi
    
    # Validate issue number if provided
    if [[ -n "$issue_number" ]] && [[ ! "$issue_number" =~ ^[0-9]+$ ]]; then
        echo "Error: Invalid issue number format" >&2
        return 1
    fi
    
    # Filter sensitive data from description
    if [[ -n "$description" ]]; then
        description=$(filter_sensitive_data "$description")
    fi
    
    local session_id="${command}_$(date +%s)_$$"
    local start_time=$(get_timestamp)
    local readable_time=$(get_readable_timestamp)
    
    # Create session file
    cat > "$TIME_TRACKING_DIR/$session_id" << EOF
{
  "session_id": "$session_id",
  "command": "$command",
  "issue_number": "$issue_number",
  "description": "$description",
  "start_time": "$start_time",
  "start_time_readable": "$readable_time",
  "status": "in_progress",
  "activities": [],
  "issues_encountered": []
}
EOF
    
    # Ensure session file is secure (owner-only access)
    chmod 600 "$TIME_TRACKING_DIR/$session_id"
    
    # Store current session for easy access
    echo "$session_id" > "$TIME_TRACKING_DIR/current_session"
    
    # Log start to GitHub issue if issue number provided
    if [[ -n "$issue_number" ]]; then
        log_to_github_issue "$issue_number" "🚀 **Started $command** at $readable_time" "$description"
    fi
    
    echo "$session_id"
}

# Log an activity during the current session
log_activity() {
    local activity="$1"
    local level="${2:-info}"  # info, warning, error, success
    
    # Input validation
    if [[ -z "$activity" ]]; then
        echo "Error: Activity description is required" >&2
        return 1
    fi
    
    # Validate level
    case "$level" in
        info|warning|error|success) ;;
        *) 
            echo "Error: Invalid activity level. Use: info, warning, error, success" >&2
            return 1
            ;;
    esac
    
    # Filter sensitive data from activity
    activity=$(filter_sensitive_data "$activity")
    
    local session_id
    if [[ -f "$TIME_TRACKING_DIR/current_session" ]]; then
        session_id=$(cat "$TIME_TRACKING_DIR/current_session")
    else
        return 1
    fi
    
    local session_file="$TIME_TRACKING_DIR/$session_id"
    if [[ ! -f "$session_file" ]]; then
        return 1
    fi
    
    local timestamp=$(get_timestamp)
    local readable_time=$(get_readable_timestamp)
    
    # Add activity to session file using Python for JSON manipulation
    python3 << EOF
import json
import sys

try:
    with open('$session_file', 'r') as f:
        session = json.load(f)
    
    activity_entry = {
        "timestamp": "$timestamp",
        "readable_time": "$readable_time",
        "activity": "$activity",
        "level": "$level"
    }
    
    session['activities'].append(activity_entry)
    
    with open('$session_file', 'w') as f:
        json.dump(session, f, indent=2)
        
    print("Activity logged successfully")
except Exception as e:
    print(f"Error logging activity: {e}")
    sys.exit(1)
EOF
    
    # Get emoji for level
    local emoji="📝"
    case "$level" in
        "success") emoji="✅" ;;
        "warning") emoji="⚠️" ;;
        "error") emoji="❌" ;;
        "info") emoji="ℹ️" ;;
    esac
    
    echo "[$readable_time] $emoji $activity"
}

# Log an issue/problem encountered during the session
log_issue_encountered() {
    local issue_description="$1"
    local resolution="${2:-}"
    local impact="${3:-medium}"  # low, medium, high
    
    # Input validation
    if [[ -z "$issue_description" ]]; then
        echo "Error: Issue description is required" >&2
        return 1
    fi
    
    # Validate impact level
    case "$impact" in
        low|medium|high) ;;
        *)
            echo "Error: Invalid impact level. Use: low, medium, high" >&2
            return 1
            ;;
    esac
    
    # Filter sensitive data from issue description and resolution
    issue_description=$(filter_sensitive_data "$issue_description")
    if [[ -n "$resolution" ]]; then
        resolution=$(filter_sensitive_data "$resolution")
    fi
    
    local session_id
    if [[ -f "$TIME_TRACKING_DIR/current_session" ]]; then
        session_id=$(cat "$TIME_TRACKING_DIR/current_session")
    else
        return 1
    fi
    
    local session_file="$TIME_TRACKING_DIR/$session_id"
    if [[ ! -f "$session_file" ]]; then
        return 1
    fi
    
    local timestamp=$(get_timestamp)
    local readable_time=$(get_readable_timestamp)
    
    # Add issue to session file
    python3 << EOF
import json
import sys

try:
    with open('$session_file', 'r') as f:
        session = json.load(f)
    
    issue_entry = {
        "timestamp": "$timestamp",
        "readable_time": "$readable_time",
        "description": "$issue_description",
        "resolution": "$resolution",
        "impact": "$impact"
    }
    
    session['issues_encountered'].append(issue_entry)
    
    with open('$session_file', 'w') as f:
        json.dump(session, f, indent=2)
        
    print("Issue logged successfully")
except Exception as e:
    print(f"Error logging issue: {e}")
    sys.exit(1)
EOF
    
    # Get impact emoji
    local impact_emoji="🟡"
    case "$impact" in
        "low") impact_emoji="🟢" ;;
        "high") impact_emoji="🔴" ;;
    esac
    
    echo "[$readable_time] $impact_emoji Issue: $issue_description"
    if [[ -n "$resolution" ]]; then
        echo "[$readable_time] 🔧 Resolution: $resolution"
    fi
    
    # Log to activity as well
    log_activity "Issue encountered: $issue_description" "warning"
}

# End time tracking and create summary
end_time_tracking() {
    local outcome="${1:-completed}"  # completed, failed, cancelled
    local final_notes="${2:-}"
    
    local session_id
    if [[ -f "$TIME_TRACKING_DIR/current_session" ]]; then
        session_id=$(cat "$TIME_TRACKING_DIR/current_session")
        rm -f "$TIME_TRACKING_DIR/current_session"
    else
        return 1
    fi
    
    local session_file="$TIME_TRACKING_DIR/$session_id"
    if [[ ! -f "$session_file" ]]; then
        return 1
    fi
    
    local end_time=$(get_timestamp)
    local readable_end_time=$(get_readable_timestamp)
    
    # Calculate duration and update session file
    local duration_summary
    duration_summary=$(python3 << EOF
import json
import sys
from datetime import datetime

try:
    with open('$session_file', 'r') as f:
        session = json.load(f)
    
    # Parse timestamps
    start_time = datetime.fromisoformat(session['start_time'].replace('Z', '+00:00'))
    end_time = datetime.fromisoformat('$end_time'.replace('Z', '+00:00'))
    
    # Calculate duration
    duration = end_time - start_time
    total_seconds = int(duration.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    
    # Format duration
    if hours > 0:
        duration_str = f"{hours}h {minutes}m {seconds}s"
    elif minutes > 0:
        duration_str = f"{minutes}m {seconds}s"
    else:
        duration_str = f"{seconds}s"
    
    # Update session
    session['end_time'] = '$end_time'
    session['end_time_readable'] = '$readable_end_time'
    session['duration_seconds'] = total_seconds
    session['duration_formatted'] = duration_str
    session['status'] = '$outcome'
    session['final_notes'] = '$final_notes'
    
    with open('$session_file', 'w') as f:
        json.dump(session, f, indent=2)
    
    print(duration_str)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
EOF
)
    
    echo "⏱️ Session completed in: $duration_summary"
    
    # Generate and post summary to GitHub issue
    local session_data
    session_data=$(cat "$session_file")
    local issue_number
    issue_number=$(echo "$session_data" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('issue_number', ''))")
    
    if [[ -n "$issue_number" ]]; then
        post_session_summary_to_github "$session_file" "$issue_number"
    fi
    
    # Return session file path for further analysis
    echo "$session_file"
}

# Post session summary to GitHub issue
post_session_summary_to_github() {
    local session_file="$1"
    local issue_number="$2"
    
    if [[ ! -f "$session_file" ]]; then
        return 1
    fi
    
    # Generate summary using Python
    local summary
    summary=$(python3 << EOF
import json
import sys

session_file = '$session_file'

try:
    with open(session_file, 'r') as f:
        session = json.load(f)
    
    command = session['command']
    duration = session.get('duration_formatted', 'Unknown')
    status = session['status']
    activities = session.get('activities', [])
    issues = session.get('issues_encountered', [])
    final_notes = session.get('final_notes', '')
    
    # Status emoji
    status_emoji = "✅" if status == "completed" else "❌" if status == "failed" else "⏹️"
    
    print(f"## {status_emoji} {command.title()} Session Summary")
    print(f"")
    print(f"**Duration:** {duration}")
    print(f"**Status:** {status.title()}")
    print(f"**Completed:** {session.get('end_time_readable', 'Unknown')}")
    print(f"")
    
    if activities:
        print(f"### 📋 Activities ({len(activities)} total)")
        for activity in activities[-5:]:  # Show last 5 activities
            level_emoji = {"success": "✅", "warning": "⚠️", "error": "❌", "info": "ℹ️"}.get(activity['level'], "📝")
            print(f"- {level_emoji} {activity['activity']} _{activity['readable_time']}_")
        if len(activities) > 5:
            print(f"- _... and {len(activities) - 5} more activities_")
        print("")
    
    if issues:
        print(f"### ⚠️ Issues Encountered ({len(issues)} total)")
        for issue in issues:
            impact_emoji = {"low": "🟢", "medium": "🟡", "high": "🔴"}.get(issue['impact'], "🟡")
            print(f"- {impact_emoji} **{issue['description']}**")
            if issue.get('resolution'):
                print(f"  - 🔧 _Resolution: {issue['resolution']}_")
            print(f"  - ⏰ _{issue['readable_time']}_")
        print("")
    
    if final_notes:
        print(f"### 📝 Notes")
        print(f"{final_notes}")
        print("")
    
    print("---")
    print("_Generated by LDC AI Framework Time Tracking_")

except Exception as e:
    print(f"Error generating summary: {e}")
    sys.exit(1)
EOF
)
    
    if [[ -n "$summary" ]]; then
        log_to_github_issue "$issue_number" "$summary" ""
    fi
}

# Log a message to a GitHub issue
log_to_github_issue() {
    local issue_number="$1"
    local message="$2"
    local context="${3:-}"
    
    # Input validation
    if [[ -z "$issue_number" ]] || [[ ! "$issue_number" =~ ^[0-9]+$ ]]; then
        echo "Error: Valid issue number is required" >&2
        return 1
    fi
    
    if [[ -z "$message" ]]; then
        echo "Error: Message is required" >&2
        return 1
    fi
    
    # Filter sensitive data from message and context
    message=$(filter_sensitive_data "$message")
    if [[ -n "$context" ]]; then
        context=$(filter_sensitive_data "$context")
    fi
    
    # Check if GitHub CLI is available
    if ! command -v gh &> /dev/null; then
        return 1
    fi
    
    if ! gh auth status &> /dev/null; then
        return 1
    fi
    
    # Format the comment
    local comment="$message"
    if [[ -n "$context" ]]; then
        comment="$comment

_Context: $context_"
    fi
    
    # Filter sensitive data before posting
    local filtered_comment
    filtered_comment=$(filter_sensitive_data "$comment")
    
    # Post comment to GitHub issue (no shell escaping needed for --body parameter)
    if gh issue comment "$issue_number" --body "$filtered_comment" &>/dev/null; then
        echo "📝 Logged to GitHub issue #$issue_number"
        return 0
    else
        echo "⚠️ Failed to log to GitHub issue #$issue_number"
        return 1
    fi
}

# Get current session info
get_current_session() {
    if [[ -f "$TIME_TRACKING_DIR/current_session" ]]; then
        local session_id
        session_id=$(cat "$TIME_TRACKING_DIR/current_session")
        local session_file="$TIME_TRACKING_DIR/$session_id"
        
        if [[ -f "$session_file" ]]; then
            cat "$session_file"
        fi
    fi
}

# Analyze actual vs estimated story points after completion
analyze_story_points() {
    local session_file="$1"
    local actual_duration_minutes="$2"
    
    if [[ ! -f "$session_file" ]]; then
        return 1
    fi
    
    # Extract session data and calculate points
    python3 << 'EOF'
import json
import sys

session_file = sys.argv[1]
actual_minutes = int(sys.argv[2]) if len(sys.argv) > 2 else 0

try:
    with open(session_file, 'r') as f:
        session = json.load(f)
    
    # Estimate actual story points based on time spent
    # Rough estimation: 1 point = 1-2 hours, 2 points = 2-4 hours, etc.
    if actual_minutes <= 60:  # 1 hour
        actual_points = 1
    elif actual_minutes <= 120:  # 2 hours
        actual_points = 2
    elif actual_minutes <= 240:  # 4 hours
        actual_points = 3
    elif actual_minutes <= 480:  # 8 hours
        actual_points = 5
    elif actual_minutes <= 960:  # 16 hours
        actual_points = 8
    elif actual_minutes <= 1920:  # 32 hours
        actual_points = 13
    else:
        actual_points = 21
    
    # Consider issues encountered (increase points for complexity)
    issues_count = len(session.get('issues_encountered', []))
    high_impact_issues = sum(1 for issue in session.get('issues_encountered', []) if issue.get('impact') == 'high')
    
    # Adjust for complexity based on issues
    if high_impact_issues > 0:
        # High impact issues suggest underestimation
        if actual_points < 8:
            actual_points = min(actual_points * 2, 21)
    elif issues_count > 3:
        # Many issues suggest complexity
        if actual_points < 5:
            actual_points = min(actual_points + 1, 21)
    
    # Fibonacci adjustment
    fibonacci_points = [1, 2, 3, 5, 8, 13, 21]
    actual_points = min(fibonacci_points, key=lambda x: abs(x - actual_points))
    
    print(f"Estimated actual story points: {actual_points}")
    print(f"Based on: {actual_minutes} minutes, {issues_count} issues ({high_impact_issues} high impact)")
    
    return actual_points

except Exception as e:
    print(f"Error analyzing story points: {e}")
    sys.exit(1)
EOF
"$session_file" "$actual_duration_minutes"
}

# Clean up old session files (older than 7 days)
cleanup_old_sessions() {
    find "$TIME_TRACKING_DIR" -name "*.json" -type f -mtime +7 -delete 2>/dev/null || true
    find "$TIME_TRACKING_DIR" -name "*_*" -type f -mtime +7 -delete 2>/dev/null || true
}

# Generate retrospective report
generate_retrospective_report() {
    local days="${1:-7}"  # Default to last 7 days
    
    echo "# Retrospective Report (Last $days days)"
    echo "Generated: $(get_readable_timestamp)"
    echo ""
    
    # Find all session files from the specified period
    local session_files=()
    while IFS= read -r file; do
        [[ -n "$file" ]] || continue
        session_files+=("$file")
    done <<< "$(find "$TIME_TRACKING_DIR" -name "*.json" -type f -mtime -$days 2>/dev/null)"
    
    if [[ ${#session_files[@]} -eq 0 ]]; then
        echo "No sessions found in the last $days days."
        return
    fi
    
    # Generate report using Python
    python3 << 'EOF'
import json
import sys
import os
from collections import defaultdict, Counter

session_files = []
for i in range(1, len(sys.argv)):
    session_files.append(sys.argv[i])

if not session_files:
    print("No session files provided")
    sys.exit(0)

sessions = []
for file_path in session_files:
    try:
        with open(file_path, 'r') as f:
            session = json.load(f)
            sessions.append(session)
    except:
        continue

if not sessions:
    print("No valid sessions found")
    sys.exit(0)

print(f"## Summary")
print(f"- **Total Sessions:** {len(sessions)}")

# Calculate total time
total_seconds = sum(session.get('duration_seconds', 0) for session in sessions)
total_hours = total_seconds / 3600
print(f"- **Total Time:** {total_hours:.1f} hours")

# Command breakdown
command_stats = Counter(session['command'] for session in sessions)
print(f"- **Most Used Commands:** {', '.join([f'{cmd} ({count})' for cmd, count in command_stats.most_common(3)])}")

# Success rate
completed = sum(1 for session in sessions if session.get('status') == 'completed')
success_rate = (completed / len(sessions)) * 100
print(f"- **Success Rate:** {success_rate:.1f}% ({completed}/{len(sessions)})")

print(f"\n## Command Performance")
for command, count in command_stats.items():
    cmd_sessions = [s for s in sessions if s['command'] == command]
    avg_duration = sum(s.get('duration_seconds', 0) for s in cmd_sessions) / len(cmd_sessions) / 60
    cmd_success = sum(1 for s in cmd_sessions if s.get('status') == 'completed')
    cmd_success_rate = (cmd_success / count) * 100
    
    print(f"- **{command}:** {count} sessions, {avg_duration:.1f}min avg, {cmd_success_rate:.0f}% success")

print(f"\n## Issues Analysis")
all_issues = []
for session in sessions:
    all_issues.extend(session.get('issues_encountered', []))

if all_issues:
    print(f"- **Total Issues:** {len(all_issues)}")
    
    impact_counts = Counter(issue['impact'] for issue in all_issues)
    print(f"- **By Impact:** High: {impact_counts.get('high', 0)}, Medium: {impact_counts.get('medium', 0)}, Low: {impact_counts.get('low', 0)}")
    
    # Most common issue patterns
    issue_descriptions = [issue['description'].lower() for issue in all_issues]
    
    print(f"\n### Common Issue Patterns")
    patterns = defaultdict(int)
    for desc in issue_descriptions:
        if 'test' in desc or 'testing' in desc:
            patterns['Testing Issues'] += 1
        elif 'auth' in desc or 'permission' in desc:
            patterns['Authentication Issues'] += 1
        elif 'config' in desc or 'configuration' in desc:
            patterns['Configuration Issues'] += 1
        elif 'api' in desc or 'endpoint' in desc:
            patterns['API Issues'] += 1
        elif 'build' in desc or 'compile' in desc:
            patterns['Build Issues'] += 1
        else:
            patterns['Other Issues'] += 1
    
    for pattern, count in sorted(patterns.items(), key=lambda x: x[1], reverse=True):
        if count > 0:
            print(f"- {pattern}: {count}")
else:
    print("- No issues encountered! 🎉")

EOF
"${session_files[@]}"
}

# Main function for testing
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-}" in
        "start")
            start_time_tracking "${2:-test}" "${3:-}" "${4:-Test session}"
            ;;
        "log")
            log_activity "${2:-Test activity}" "${3:-info}"
            ;;
        "issue")
            log_issue_encountered "${2:-Test issue}" "${3:-}" "${4:-medium}"
            ;;
        "end")
            end_time_tracking "${2:-completed}" "${3:-}"
            ;;
        "current")
            get_current_session
            ;;
        "report")
            generate_retrospective_report "${2:-7}"
            ;;
        "cleanup")
            cleanup_old_sessions
            ;;
        *)
            echo "Usage: $0 {start|log|issue|end|current|report|cleanup}"
            echo "  start <command> [issue_number] [description] - Start time tracking"
            echo "  log <activity> [level]                       - Log an activity"
            echo "  issue <description> [resolution] [impact]    - Log an issue"
            echo "  end [outcome] [notes]                        - End time tracking"
            echo "  current                                      - Show current session"
            echo "  report [days]                                - Generate retrospective report"
            echo "  cleanup                                      - Clean up old sessions"
            ;;
    esac
fi