#!/bin/bash

# Error Handling Framework for LDC AI Framework
# Provides consistent error handling, logging, and user feedback across all commands

# Error codes for consistent handling
readonly ERR_SUCCESS=0
readonly ERR_GENERAL=1
readonly ERR_INVALID_INPUT=2
readonly ERR_NETWORK=3
readonly ERR_AUTH=4
readonly ERR_PERMISSION=5
readonly ERR_MCP=6
readonly ERR_GITHUB_API=7
readonly ERR_FILE=8
readonly ERR_VALIDATION=9
readonly ERR_TIMEOUT=10

# Logging levels
readonly LOG_DEBUG=0
readonly LOG_INFO=1
readonly LOG_WARN=2
readonly LOG_ERROR=3
readonly LOG_FATAL=4

# Default log level (INFO)
LOG_LEVEL=${LOG_LEVEL:-1}

# Log file location
LOG_FILE="${HOME}/.claude/logs/framework.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null

# Logging function with levels and timestamps
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local caller="${BASH_SOURCE[2]##*/}:${BASH_LINENO[1]}"
    
    # Convert level name to number
    local level_num
    case "$level" in
        "DEBUG") level_num=0 ;;
        "INFO") level_num=1 ;;
        "WARN") level_num=2 ;;
        "ERROR") level_num=3 ;;
        "FATAL") level_num=4 ;;
        *) level_num=1 ;; # Default to INFO
    esac
    
    # Only log if level meets threshold
    if [[ $level_num -ge $LOG_LEVEL ]]; then
        # Write to log file
        echo "[$timestamp] [$level] [$caller] $message" >> "$LOG_FILE"
        
        # Also output to stderr for ERROR and FATAL
        if [[ $level_num -ge 3 ]]; then
            echo "[$level] $message" >&2
        fi
    fi
}

# Convenience logging functions
log_debug() { log "DEBUG" "$@"; }
log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_fatal() { log "FATAL" "$@"; }

# Error handling with user-friendly messages
handle_error() {
    local error_code="$1"
    local error_context="$2"
    local suggested_action="$3"
    local raw_error="$4"
    
    log_error "Error in $error_context: Code $error_code"
    [[ -n "$raw_error" ]] && log_debug "Raw error: $raw_error"
    
    case "$error_code" in
        2) # INVALID_INPUT
            echo "❌ Invalid input: $error_context"
            [[ -n "$suggested_action" ]] && echo "💡 $suggested_action"
            ;;
        3) # NETWORK_ERROR
            echo "🌐 Network error: Unable to connect"
            echo "💡 Check internet connection and try again"
            [[ -n "$suggested_action" ]] && echo "💡 $suggested_action"
            ;;
        4) # AUTHENTICATION_ERROR
            echo "🔐 Authentication failed: $error_context"
            echo "💡 Run 'gh auth login' to authenticate with GitHub"
            [[ -n "$suggested_action" ]] && echo "💡 $suggested_action"
            ;;
        5) # PERMISSION_ERROR
            echo "🚫 Permission denied: $error_context"
            echo "💡 Check repository permissions and access rights"
            [[ -n "$suggested_action" ]] && echo "💡 $suggested_action"
            ;;
        6) # MCP_ERROR
            echo "🔌 MCP error: $error_context"
            echo "💡 Falling back to GitHub CLI"
            [[ -n "$suggested_action" ]] && echo "💡 $suggested_action"
            ;;
        7) # GITHUB_API_ERROR
            echo "🐙 GitHub API error: $error_context"
            echo "💡 Check GitHub status and API limits"
            [[ -n "$suggested_action" ]] && echo "💡 $suggested_action"
            ;;
        8) # FILE_ERROR
            echo "📁 File error: $error_context"
            echo "💡 Check file permissions and disk space"
            [[ -n "$suggested_action" ]] && echo "💡 $suggested_action"
            ;;
        9) # VALIDATION_ERROR
            echo "✅ Validation error: $error_context"
            [[ -n "$suggested_action" ]] && echo "💡 $suggested_action"
            ;;
        10) # TIMEOUT_ERROR
            echo "⏱️ Operation timed out: $error_context"
            echo "💡 Try again or increase timeout duration"
            [[ -n "$suggested_action" ]] && echo "💡 $suggested_action"
            ;;
        *) # GENERAL_ERROR
            echo "❌ Error: $error_context"
            [[ -n "$suggested_action" ]] && echo "💡 $suggested_action"
            ;;
    esac
    
    return "$error_code"
}

# Trap function for unexpected errors
error_trap() {
    local exit_code=$?
    local line_number=$1
    local command="$2"
    
    log_error "Unexpected error at line $line_number: exit code $exit_code"
    log_debug "Failed command: $command"
    
    echo "💥 Unexpected error occurred"
    echo "📋 Check logs at: $LOG_FILE"
    echo "🐛 If this persists, please report at: https://github.com/anthropics/claude-code/issues"
    
    exit $exit_code
}

# Set up error trapping
set -eE
trap 'error_trap ${LINENO} "$BASH_COMMAND"' ERR

# Retry mechanism with exponential backoff
retry_with_backoff() {
    local max_attempts="$1"
    local base_delay="$2"
    local max_delay="$3"
    local attempt=1
    local delay="$base_delay"
    
    shift 3
    local command=("$@")
    
    while [[ $attempt -le $max_attempts ]]; do
        log_debug "Attempt $attempt of $max_attempts: ${command[*]}"
        
        if "${command[@]}"; then
            log_info "Command succeeded on attempt $attempt"
            return 0
        else
            local exit_code=$?
            log_warn "Attempt $attempt failed with exit code $exit_code"
            
            if [[ $attempt -eq $max_attempts ]]; then
                log_error "All $max_attempts attempts failed"
                return $exit_code
            fi
            
            log_info "Waiting ${delay}s before retry..."
            sleep "$delay"
            
            # Exponential backoff with jitter and max cap
            delay=$(( delay * 2 + RANDOM % 5 ))
            [[ $delay -gt $max_delay ]] && delay=$max_delay
            
            ((attempt++))
        fi
    done
}

# GitHub API response handler
handle_github_response() {
    local response="$1"
    local operation="$2"
    local http_status="$3"
    
    log_debug "GitHub API response for $operation: HTTP $http_status"
    
    case "$http_status" in
        200|201|204)
            log_info "GitHub API $operation: Success"
            return 0
            ;;
        400)
            local error_msg=$(echo "$response" | jq -r '.message // "Bad request"' 2>/dev/null || echo "Bad request")
            handle_error 7 "$operation failed: $error_msg" "Check request parameters"
            return 7
            ;;
        401)
            handle_error 4 "$operation failed: Unauthorized" "Run 'gh auth login' to authenticate"
            return 4
            ;;
        403)
            local error_msg=$(echo "$response" | jq -r '.message // "Forbidden"' 2>/dev/null || echo "Forbidden")
            if [[ "$error_msg" == *"rate limit"* ]]; then
                handle_error 7 "$operation failed: API rate limit exceeded" "Wait before retrying or use authenticated requests"
            else
                handle_error 5 "$operation failed: $error_msg" "Check repository permissions"
            fi
            return 5
            ;;
        404)
            handle_error 7 "$operation failed: Not found" "Check resource exists and you have access"
            return 7
            ;;
        422)
            local error_msg=$(echo "$response" | jq -r '.message // "Unprocessable entity"' 2>/dev/null || echo "Validation failed")
            handle_error 9 "$operation failed: $error_msg" "Check input data format"
            return 9
            ;;
        500|502|503|504)
            handle_error 7 "$operation failed: GitHub server error" "Try again later"
            return 7
            ;;
        *)
            handle_error 7 "$operation failed: HTTP $http_status" "Check GitHub status page"
            return 7
            ;;
    esac
}

# MCP error handler
handle_mcp_error() {
    local operation="$1"
    local error_details="$2"
    
    log_error "MCP error during $operation: $error_details"
    
    # Record MCP failure for circuit breaker
    if command -v record_mcp_failure &> /dev/null; then
        record_mcp_failure
    fi
    
    handle_error 6 "$operation via MCP failed" "Falling back to GitHub CLI"
    return 6
}

# Validation helper with detailed error messages
validate_required_param() {
    local param_value="$1"
    local param_name="$2"
    local validation_type="${3:-general}"
    
    if [[ -z "$param_value" ]]; then
        handle_error 2 "Missing required parameter: $param_name" "Provide a value for $param_name"
        return 2
    fi
    
    case "$validation_type" in
        "github_title")
            if [[ ${#param_value} -gt 256 ]]; then
                handle_error 9 "$param_name too long (max 256 characters)" "Shorten the $param_name"
                return 9
            fi
            if [[ "$param_value" =~ [\$\`\;\|\&\<\>\!\~] ]]; then
                handle_error 9 "$param_name contains invalid characters" "Remove special characters: \$ \` ; | & < > ! ~"
                return 9
            fi
            ;;
        "github_label")
            if [[ ! "$param_value" =~ ^[a-zA-Z0-9_,-]+$ ]]; then
                handle_error 9 "$param_name contains invalid characters" "Use only alphanumeric characters, hyphens, underscores, and commas"
                return 9
            fi
            ;;
        "url")
            if [[ ! "$param_value" =~ ^https?:// ]]; then
                handle_error 9 "$param_name must be a valid URL" "Provide a URL starting with http:// or https://"
                return 9
            fi
            ;;
    esac
    
    log_debug "Parameter validation passed: $param_name"
    return 0
}

# Progress indicator for long operations
show_progress() {
    local message="$1"
    local duration="${2:-5}"
    
    echo -n "$message"
    for ((i=0; i<duration; i++)); do
        echo -n "."
        sleep 1
    done
    echo " ✅"
}

# Cleanup function for temporary resources
cleanup_temp_resources() {
    local temp_files=("$@")
    
    for file in "${temp_files[@]}"; do
        if [[ -f "$file" ]]; then
            rm -f "$file"
            log_debug "Cleaned up temporary file: $file"
        fi
    done
}

# Recovery suggestions based on error patterns
suggest_recovery() {
    local error_pattern="$1"
    
    case "$error_pattern" in
        *"permission denied"*|*"403"*)
            echo "🔧 Recovery suggestions:"
            echo "  • Check repository permissions"
            echo "  • Ensure you're a collaborator on the repository"
            echo "  • Verify GitHub token has appropriate scopes"
            ;;
        *"not found"*|*"404"*)
            echo "🔧 Recovery suggestions:"
            echo "  • Verify resource exists (issue, PR, repository)"
            echo "  • Check spelling of repository/resource name"
            echo "  • Ensure repository is public or you have access"
            ;;
        *"rate limit"*|*"429"*)
            echo "🔧 Recovery suggestions:"
            echo "  • Wait for rate limit to reset"
            echo "  • Use authenticated requests for higher limits"
            echo "  • Consider GitHub Enterprise for higher limits"
            ;;
        *"network"*|*"connection"*)
            echo "🔧 Recovery suggestions:"
            echo "  • Check internet connection"
            echo "  • Verify GitHub is accessible"
            echo "  • Try again in a few moments"
            ;;
    esac
}

# Export all functions for use in other scripts
export -f log log_debug log_info log_warn log_error log_fatal
export -f handle_error error_trap retry_with_backoff
export -f handle_github_response handle_mcp_error
export -f validate_required_param show_progress cleanup_temp_resources
export -f suggest_recovery

# Export log file location
export LOG_FILE