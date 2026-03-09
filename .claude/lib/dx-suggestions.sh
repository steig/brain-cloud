#!/usr/bin/env bash

# DX Proactive Suggestions Engine
# Suggests next actions based on learned patterns and context
# Version: 1.0.0

# Get script directory (bash/zsh compatible)
if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    SCRIPT_DIR="${HOME}/.claude/lib"
fi

# Load dependencies
source "${SCRIPT_DIR}/dx-db.sh" 2>/dev/null || true

# Suggest next command based on current command and patterns
dx_suggest_next_command() {
    local current_command="$1"
    local threshold="${2:-0.5}"

    local result
    result=$(dx_query "
        SELECT pattern_value as next_cmd,
               occurrences,
               ROUND(confidence * 100, 0) as pct
        FROM patterns
        WHERE pattern_type = 'sequence'
          AND pattern_key = '$(dx_escape "$current_command")'
          AND confidence >= $threshold
        ORDER BY confidence DESC, occurrences DESC
        LIMIT 1;
    " "csv" 2>/dev/null | tail -n +2)

    if [[ -n "$result" ]]; then
        local next_cmd occurrences pct
        IFS=',' read -r next_cmd occurrences pct <<< "$result"
        echo "$next_cmd|$pct"
    fi
}

# Get multiple suggestions with confidence
dx_get_suggestions() {
    local current_command="$1"
    local limit="${2:-3}"

    dx_query "
        SELECT pattern_value as command,
               occurrences as times,
               ROUND(confidence * 100, 0) as confidence
        FROM patterns
        WHERE pattern_type = 'sequence'
          AND pattern_key = '$(dx_escape "$current_command")'
          AND confidence > 0.3
        ORDER BY confidence DESC, occurrences DESC
        LIMIT $limit;
    " 2>/dev/null
}

# Suggest based on time of day
dx_suggest_by_time() {
    local hour
    hour=$(date +%H)

    # Morning suggestions (before 10am)
    if [[ $hour -lt 10 ]]; then
        echo "Morning routine: Consider running /pickup to restore context"
    # End of day (after 5pm)
    elif [[ $hour -ge 17 ]]; then
        echo "End of day: Consider running /checkpoint to save your work state"
    fi
}

# Suggest based on git state
dx_suggest_by_git_state() {
    local staged unstaged untracked
    staged=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
    unstaged=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
    untracked=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

    if [[ $staged -gt 0 ]]; then
        echo "You have $staged staged files. Consider: /commit"
    elif [[ $unstaged -gt 5 ]]; then
        echo "You have $unstaged modified files. Consider: /checkpoint save before-changes"
    fi
}

# Suggest based on branch state
dx_suggest_by_branch() {
    local branch ahead behind

    branch=$(git branch --show-current 2>/dev/null)
    if [[ -z "$branch" ]]; then
        return
    fi

    # Check if we have an upstream
    if git rev-parse --abbrev-ref "@{upstream}" &>/dev/null; then
        ahead=$(git rev-list --count "@{upstream}..HEAD" 2>/dev/null || echo "0")
        behind=$(git rev-list --count "HEAD..@{upstream}" 2>/dev/null || echo "0")

        if [[ $ahead -gt 5 ]]; then
            echo "Branch is $ahead commits ahead. Consider: /create_pr"
        elif [[ $behind -gt 10 ]]; then
            echo "Branch is $behind commits behind. Consider: /update_branch"
        fi
    fi

    # Check for feature branch without PR
    if [[ "$branch" == feature/* ]] || [[ "$branch" == fix/* ]]; then
        local has_pr
        has_pr=$(gh pr list --head "$branch" --state open --json number -q '.[0].number' 2>/dev/null)
        if [[ -z "$has_pr" ]] && [[ $ahead -gt 0 ]]; then
            echo "Feature branch without PR. Consider: /create_pr"
        fi
    fi
}

# Suggest based on recent errors
dx_suggest_by_errors() {
    local recent_failures
    recent_failures=$(dx_query "
        SELECT command, COUNT(*) as fails
        FROM events
        WHERE outcome = 'failure'
          AND timestamp > datetime('now', '-1 hour')
        GROUP BY command
        ORDER BY fails DESC
        LIMIT 1;
    " "csv" 2>/dev/null | tail -n +2)

    if [[ -n "$recent_failures" ]]; then
        local cmd fails
        IFS=',' read -r cmd fails <<< "$recent_failures"
        if [[ $fails -gt 2 ]]; then
            echo "/$cmd has failed $fails times recently. Consider: /debug"
        fi
    fi
}

# Get all contextual suggestions
dx_get_all_suggestions() {
    local current_command="${1:-}"

    echo "=== SUGGESTIONS ==="
    echo ""

    # Time-based
    local time_suggestion
    time_suggestion=$(dx_suggest_by_time)
    [[ -n "$time_suggestion" ]] && echo "⏰ $time_suggestion"

    # Git state
    local git_suggestion
    git_suggestion=$(dx_suggest_by_git_state)
    [[ -n "$git_suggestion" ]] && echo "📝 $git_suggestion"

    # Branch state
    local branch_suggestion
    branch_suggestion=$(dx_suggest_by_branch)
    [[ -n "$branch_suggestion" ]] && echo "🌿 $branch_suggestion"

    # Error patterns
    local error_suggestion
    error_suggestion=$(dx_suggest_by_errors)
    [[ -n "$error_suggestion" ]] && echo "⚠️ $error_suggestion"

    # Pattern-based (if current command provided)
    if [[ -n "$current_command" ]]; then
        local pattern_suggestion
        pattern_suggestion=$(dx_suggest_next_command "$current_command" 0.6)
        if [[ -n "$pattern_suggestion" ]]; then
            local next_cmd pct
            IFS='|' read -r next_cmd pct <<< "$pattern_suggestion"
            echo "🔮 Based on patterns: /$next_cmd ($pct% confidence)"
        fi
    fi
}

# Interactive suggestion prompt
dx_prompt_suggestion() {
    local current_command="$1"
    local suggestion
    suggestion=$(dx_suggest_next_command "$current_command" 0.7)

    if [[ -n "$suggestion" ]]; then
        local next_cmd pct
        IFS='|' read -r next_cmd pct <<< "$suggestion"

        echo ""
        echo "💡 You usually run /$next_cmd after /$current_command ($pct%)"
        read -p "Run /$next_cmd? [Y/n]: " -r response

        if [[ "$response" != "n" ]] && [[ "$response" != "N" ]]; then
            echo "EXECUTE:/$next_cmd"
            return 0
        fi
    fi
    return 1
}

# Smart defaults for common operations
dx_get_smart_default() {
    local operation="$1"
    local context="$2"

    case "$operation" in
        branch_prefix)
            # Get most used branch prefix
            dx_query "
                SELECT pattern_value
                FROM patterns
                WHERE pattern_type = 'branch_prefix'
                ORDER BY occurrences DESC
                LIMIT 1;
            " "line" 2>/dev/null | grep -v '^$' | head -1
            ;;
        commit_type)
            # Get most common commit type for this context
            dx_query "
                SELECT pattern_value
                FROM patterns
                WHERE pattern_type = 'commit_type'
                  AND (pattern_key = '$context' OR pattern_key = 'default')
                ORDER BY occurrences DESC
                LIMIT 1;
            " "line" 2>/dev/null | grep -v '^$' | head -1
            ;;
        test_command)
            # Get preferred test command
            dx_query "
                SELECT pattern_value
                FROM patterns
                WHERE pattern_type = 'preference'
                  AND pattern_key = 'test_command'
                ORDER BY occurrences DESC
                LIMIT 1;
            " "line" 2>/dev/null | grep -v '^$' | head -1
            ;;
    esac
}

# Learn a preference
dx_learn_preference() {
    local preference_key="$1"
    local preference_value="$2"

    dx_record_pattern "preference" "$preference_key" "$preference_value" 2>/dev/null || true
}

# CLI interface
if [[ "${BASH_SOURCE[0]}" == "${0}" ]] || [[ "${0}" == *"dx-suggestions.sh" ]]; then
    case "${1:-help}" in
        next)
            result=$(dx_suggest_next_command "${2:-commit}")
            if [[ -n "$result" ]]; then
                IFS='|' read -r cmd pct <<< "$result"
                echo "Suggested: /$cmd ($pct% confidence)"
            else
                echo "No strong suggestion for ${2:-commit}"
            fi
            ;;
        all)
            dx_get_all_suggestions "${2:-}"
            ;;
        prompt)
            dx_prompt_suggestion "${2:-commit}"
            ;;
        default)
            dx_get_smart_default "${2:-branch_prefix}" "${3:-}"
            ;;
        *)
            echo "DX Suggestions Engine"
            echo ""
            echo "Usage: $0 <command> [args]"
            echo ""
            echo "Commands:"
            echo "  next <cmd>         Get next command suggestion"
            echo "  all [cmd]          Get all contextual suggestions"
            echo "  prompt <cmd>       Interactive suggestion prompt"
            echo "  default <op> [ctx] Get smart default for operation"
            ;;
    esac
fi

# Export functions
export -f dx_suggest_next_command dx_get_suggestions
export -f dx_suggest_by_time dx_suggest_by_git_state dx_suggest_by_branch
export -f dx_get_all_suggestions dx_prompt_suggestion
export -f dx_get_smart_default dx_learn_preference
