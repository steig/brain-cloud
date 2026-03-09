#!/usr/bin/env bash

# DX Multi-Model Router
# Routes tasks to appropriate models based on complexity and cost
# Version: 1.0.0

# Get script directory (bash/zsh compatible)
if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    SCRIPT_DIR="${HOME}/.claude/lib"
fi

# Load dependencies
source "${SCRIPT_DIR}/dx-db.sh" 2>/dev/null || true

# Default model routing configuration
# Can be overridden by .claude/config/models.json
declare -A DX_MODEL_ROUTES=(
    # Free tasks → ollama (local, zero cost)
    ["boilerplate"]="ollama"
    ["simple_fix"]="ollama"
    ["test_generation"]="ollama"
    ["docstring"]="ollama"
    ["type_hints"]="ollama"
    ["simple_refactor"]="ollama"

    # Quick, simple tasks → haiku (fast, cheap)
    ["explore"]="haiku"
    ["simple_search"]="haiku"
    ["file_lookup"]="haiku"
    ["syntax_check"]="haiku"
    ["format"]="haiku"

    # Standard development tasks → sonnet (balanced)
    ["commit"]="sonnet"
    ["code_review"]="sonnet"
    ["create_pr"]="sonnet"
    ["do_task"]="sonnet"
    ["debug"]="sonnet"
    ["refactor"]="sonnet"

    # Complex reasoning tasks → opus (powerful)
    ["architecture"]="opus"
    ["complex_planning"]="opus"
    ["security_audit"]="opus"
    ["performance_analysis"]="opus"
    ["create_milestone"]="opus"
)

# Cost per 1K tokens (approximate, update as needed)
declare -A DX_MODEL_COSTS_IN=(
    ["ollama"]="0"
    ["haiku"]="0.00025"
    ["sonnet"]="0.003"
    ["opus"]="0.015"
)

declare -A DX_MODEL_COSTS_OUT=(
    ["ollama"]="0"
    ["haiku"]="0.00125"
    ["sonnet"]="0.015"
    ["opus"]="0.075"
)

# Load custom routing from config file if exists
dx_load_model_config() {
    local config_file="${SCRIPT_DIR}/../config/models.json"

    if [[ -f "$config_file" ]]; then
        # Parse JSON config (requires jq)
        if command -v jq &>/dev/null; then
            # Load routing overrides
            local routes
            routes=$(jq -r '.routing // {} | to_entries[] | "\(.key)=\(.value)"' "$config_file" 2>/dev/null)
            while IFS='=' read -r key value; do
                [[ -n "$key" ]] && DX_MODEL_ROUTES["$key"]="$value"
            done <<< "$routes"
        fi
    fi
}

# Get recommended model for a task type
dx_get_model() {
    local task_type="$1"
    local default="${2:-sonnet}"

    # Load custom config
    dx_load_model_config

    # Check for exact match
    if [[ -n "${DX_MODEL_ROUTES[$task_type]:-}" ]]; then
        echo "${DX_MODEL_ROUTES[$task_type]}"
        return
    fi

    # Check for partial matches
    for key in "${!DX_MODEL_ROUTES[@]}"; do
        if [[ "$task_type" == *"$key"* ]]; then
            echo "${DX_MODEL_ROUTES[$key]}"
            return
        fi
    done

    # Default
    echo "$default"
}

# Get model for a command (maps slash commands to task types)
dx_get_model_for_command() {
    local command="$1"

    # Command to task type mapping
    case "$command" in
        # Quick operations
        health|stats|patterns|feedback|checkpoint)
            echo "haiku"
            ;;

        # Standard operations
        commit|create_pr|code_review|pr_review|update_branch)
            echo "sonnet"
            ;;

        # Complex operations
        do_task|create_task|create_milestone|release|architecture)
            echo "opus"
            ;;

        # Exploration (fast, cheap)
        docs|help|who|claim)
            echo "haiku"
            ;;

        # Analysis (needs reasoning)
        debug|deploy-risk|security-scan)
            echo "sonnet"
            ;;

        # Default to sonnet
        *)
            echo "sonnet"
            ;;
    esac
}

# Estimate cost for a task
dx_estimate_cost() {
    local model="$1"
    local estimated_tokens_in="${2:-1000}"
    local estimated_tokens_out="${3:-2000}"

    local cost_in="${DX_MODEL_COSTS_IN[$model]:-0.003}"
    local cost_out="${DX_MODEL_COSTS_OUT[$model]:-0.015}"

    local total
    total=$(echo "scale=6; ($estimated_tokens_in * $cost_in / 1000) + ($estimated_tokens_out * $cost_out / 1000)" | bc 2>/dev/null || echo "0.01")

    echo "$total"
}

# Check if we're within budget
dx_check_budget() {
    local model="$1"
    local daily_limit="${2:-10}"  # Default $10/day

    local today_cost
    today_cost=$(dx_query "
        SELECT COALESCE(SUM(estimated_cost_usd), 0)
        FROM cost_tracking
        WHERE date = DATE('now');
    " "line" 2>/dev/null | grep -oE '[0-9.]+' || echo "0")

    local result
    result=$(echo "$today_cost < $daily_limit" | bc 2>/dev/null || echo "1")

    if [[ "$result" == "1" ]]; then
        echo "OK"
    else
        echo "LIMIT_REACHED"
    fi
}

# Get fallback model (cheaper alternative)
dx_get_fallback() {
    local current_model="$1"

    case "$current_model" in
        opus)
            echo "sonnet"
            ;;
        sonnet)
            echo "haiku"
            ;;
        ollama)
            echo "haiku"  # Fallback to haiku if Ollama unavailable
            ;;
        *)
            echo "haiku"
            ;;
    esac
}

# Check if Ollama is available
dx_check_ollama() {
    local ollama_url="${OLLAMA_BASE_URL:-http://ollama:11434}"
    curl -s --connect-timeout 2 "${ollama_url}/api/tags" >/dev/null 2>&1
}

# Get model with Ollama availability check
dx_get_model_with_fallback() {
    local task_type="$1"
    local model
    model=$(dx_get_model "$task_type")

    # If model is ollama, check availability
    if [[ "$model" == "ollama" ]]; then
        if ! dx_check_ollama; then
            echo "haiku"  # Fallback if Ollama down
            return
        fi
    fi

    echo "$model"
}

# Smart model selection with budget awareness
dx_select_model() {
    local task_type="$1"
    local daily_limit="${2:-10}"

    # Get recommended model
    local recommended
    recommended=$(dx_get_model "$task_type")

    # Check budget
    local budget_status
    budget_status=$(dx_check_budget "$recommended" "$daily_limit")

    if [[ "$budget_status" == "OK" ]]; then
        echo "$recommended"
    else
        # Try fallback
        local fallback
        fallback=$(dx_get_fallback "$recommended")
        echo "$fallback"
        echo "WARN: Budget limit reached, using $fallback instead of $recommended" >&2
    fi
}

# Log model usage for cost tracking
dx_log_model_usage() {
    local model="$1"
    local tokens_in="$2"
    local tokens_out="$3"
    local command="${4:-unknown}"

    # Calculate cost
    local cost_in="${DX_MODEL_COSTS_IN[$model]:-0.003}"
    local cost_out="${DX_MODEL_COSTS_OUT[$model]:-0.015}"
    local cost
    cost=$(echo "scale=6; ($tokens_in * $cost_in / 1000) + ($tokens_out * $cost_out / 1000)" | bc 2>/dev/null || echo "0.01")

    # Log to database
    dx_log_cost "$model" "$tokens_in" "$tokens_out" 2>/dev/null || true
}

# Get model recommendations for current context
dx_get_model_recommendations() {
    echo "=== MODEL RECOMMENDATIONS ==="
    echo ""
    echo "Based on your typical usage patterns:"
    echo ""

    # Get command frequency by model
    echo "Command → Recommended Model:"
    echo ""

    for cmd in commit create_pr do_task code_review debug release; do
        local model
        model=$(dx_get_model_for_command "$cmd")
        local cost
        cost=$(dx_estimate_cost "$model" 500 1500)
        echo "  /$cmd → $model (~\$$cost)"
    done

    echo ""
    echo "Today's usage:"
    dx_query "
        SELECT model,
               SUM(tokens_in) as input,
               SUM(tokens_out) as output,
               ROUND(SUM(estimated_cost_usd), 4) as cost
        FROM cost_tracking
        WHERE date = DATE('now')
        GROUP BY model;
    " 2>/dev/null || echo "  (no data yet)"
}

# CLI interface
if [[ "${BASH_SOURCE[0]}" == "${0}" ]] || [[ "${0}" == *"dx-model-router.sh" ]]; then
    case "${1:-help}" in
        get)
            dx_get_model "${2:-default}"
            ;;
        command)
            dx_get_model_for_command "${2:-commit}"
            ;;
        select)
            dx_select_model "${2:-default}" "${3:-10}"
            ;;
        estimate)
            cost=$(dx_estimate_cost "${2:-sonnet}" "${3:-1000}" "${4:-2000}")
            echo "Estimated cost: \$$cost"
            ;;
        budget)
            dx_check_budget "${2:-sonnet}" "${3:-10}"
            ;;
        recommendations)
            dx_get_model_recommendations
            ;;
        *)
            echo "DX Model Router"
            echo ""
            echo "Usage: $0 <command> [args]"
            echo ""
            echo "Commands:"
            echo "  get <task>           Get model for task type"
            echo "  command <cmd>        Get model for slash command"
            echo "  select <task> [lim]  Select model with budget check"
            echo "  estimate <m> [i] [o] Estimate cost for tokens"
            echo "  budget <model> [lim] Check if within budget"
            echo "  recommendations      Show model recommendations"
            ;;
    esac
fi

# Export functions
export -f dx_load_model_config dx_get_model dx_get_model_for_command
export -f dx_estimate_cost dx_check_budget dx_get_fallback
export -f dx_select_model dx_log_model_usage dx_get_model_recommendations
export -f dx_check_ollama dx_get_model_with_fallback
