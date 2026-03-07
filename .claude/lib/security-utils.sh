#!/bin/bash

# Security Utilities for LDC AI Framework
# Provides input validation, sanitization, and secure MCP communication

# Input sanitization function
sanitize_shell_input() {
    local input="$1"
    # Remove dangerous shell metacharacters
    echo "$input" | sed 's/[`$(){}|&;<>]/\\&/g' | tr -d '\0\r'
}

# Validate input length
validate_input_length() {
    local input="$1"
    local max_length="${2:-1000}"
    if [[ ${#input} -gt $max_length ]]; then
        echo "❌ Error: Input exceeds maximum length of $max_length characters"
        return 1
    fi
    return 0
}

# Validate GitHub-specific inputs
validate_github_input() {
    local input="$1"
    local input_type="${2:-general}"
    
    # Check length first
    if ! validate_input_length "$input" 1000; then
        return 1
    fi
    
    case "$input_type" in
        "title")
            # GitHub issue/PR titles should not contain certain characters
            if [[ "$input" =~ [\$\`\;\|\&\<\>\!\~] ]]; then
                echo "❌ Error: Invalid characters in title. Avoid: \$ \` ; | & < > ! ~"
                return 1
            fi
            ;;
        "body")
            # Body text is more permissive but still needs basic protection
            if [[ "$input" =~ [\`\$\(] ]]; then
                echo "❌ Error: Potentially unsafe characters detected in body text"
                return 1
            fi
            ;;
        "label")
            # Labels should be alphanumeric with hyphens and underscores
            if [[ ! "$input" =~ ^[a-zA-Z0-9_,-]+$ ]]; then
                echo "❌ Error: Labels must be alphanumeric with hyphens, underscores, or commas only"
                return 1
            fi
            ;;
        *)
            # General validation
            if [[ "$input" =~ [\$\`\;\|\&\<\>\!\~] ]]; then
                echo "❌ Error: Invalid characters detected"
                return 1
            fi
            ;;
    esac
    
    return 0
}

# Validate GitHub token format
validate_github_token() {
    local token="$1"
    # GitHub Personal Access Token format: ghp_[36 alphanumeric characters]
    # GitHub fine-grained token format: github_pat_[alphanumeric + underscore]
    if [[ "$token" =~ ^ghp_[a-zA-Z0-9]{36}$ ]] || [[ "$token" =~ ^github_pat_[a-zA-Z0-9_]{82}$ ]]; then
        return 0
    else
        echo "❌ Error: Invalid GitHub token format"
        return 1
    fi
}

# Safe quote function for shell arguments
safe_quote() {
    local input="$1"
    printf '%q' "$input"
}

# Sanitize error messages to prevent information disclosure
sanitize_error_message() {
    local message="$1"
    # Remove GitHub tokens
    echo "$message" | sed 's/ghp_[a-zA-Z0-9]\{36\}/[REDACTED]/g' | sed 's/github_pat_[a-zA-Z0-9_]\{82\}/[REDACTED]/g'
}

# Secure MCP communication wrapper
secure_mcp_call() {
    local operation="$1"
    local title="$2"
    local body="$3" 
    local labels="$4"
    
    # Validate all inputs
    if ! validate_github_input "$title" "title"; then
        return 1
    fi
    
    if [[ -n "$body" ]] && ! validate_github_input "$body" "body"; then
        return 1
    fi
    
    if [[ -n "$labels" ]] && ! validate_github_input "$labels" "label"; then
        return 1
    fi
    
    # Sanitize inputs
    local safe_title=$(sanitize_shell_input "$title")
    local safe_body=$(sanitize_shell_input "$body")
    local safe_labels=$(sanitize_shell_input "$labels")
    
    # Create temporary file for secure MCP communication
    local temp_file=$(mktemp)
    chmod 600 "$temp_file"
    
    case "$operation" in
        "create_issue")
            cat > "$temp_file" << 'EOF'
Please create a GitHub issue with the following details:
- Title: __TITLE_PLACEHOLDER__
- Body: __BODY_PLACEHOLDER__
- Labels: __LABELS_PLACEHOLDER__
- Assignee: @me

Use the GitHub MCP to create this issue.
EOF
            # Safe replacement of placeholders
            sed -i "s/__TITLE_PLACEHOLDER__/$(printf '%s' "$safe_title" | sed 's/[[\.*^$()+?{|]/\\&/g')/g" "$temp_file"
            sed -i "s/__BODY_PLACEHOLDER__/$(printf '%s' "$safe_body" | sed 's/[[\.*^$()+?{|]/\\&/g')/g" "$temp_file"
            sed -i "s/__LABELS_PLACEHOLDER__/$(printf '%s' "$safe_labels" | sed 's/[[\.*^$()+?{|]/\\&/g')/g" "$temp_file"
            ;;
        *)
            echo "❌ Error: Unknown MCP operation: $operation"
            rm -f "$temp_file"
            return 1
            ;;
    esac
    
    # Execute MCP call with temporary file
    claude < "$temp_file"
    local result=$?
    
    # Clean up
    rm -f "$temp_file"
    return $result
}

# MCP availability caching
MCP_STATUS_CACHE=""
MCP_CACHE_TIMESTAMP=""
MCP_CACHE_TTL=60  # Cache for 60 seconds

get_mcp_status() {
    local current_time=$(date +%s)
    
    # Check if cache is valid
    if [[ -n "$MCP_CACHE_TIMESTAMP" ]] && [[ -n "$MCP_STATUS_CACHE" ]]; then
        local cache_age=$((current_time - MCP_CACHE_TIMESTAMP))
        if [[ $cache_age -lt $MCP_CACHE_TTL ]]; then
            echo "$MCP_STATUS_CACHE"
            return
        fi
    fi
    
    # Update cache
    if command -v claude &> /dev/null && claude mcp list 2>/dev/null | grep -q "github.*✓ Connected"; then
        MCP_STATUS_CACHE="available"
    else
        MCP_STATUS_CACHE="unavailable"
    fi
    MCP_CACHE_TIMESTAMP="$current_time"
    
    echo "$MCP_STATUS_CACHE"
}

# Check if GitHub MCP is available
is_github_mcp_available() {
    local status=$(get_mcp_status)
    [[ "$status" == "available" ]]
}

# Circuit breaker for MCP failures
MCP_FAILURE_COUNT=0
MCP_CIRCUIT_OPEN_UNTIL=""
MCP_CIRCUIT_TIMEOUT=300  # 5 minutes

should_try_mcp() {
    local current_time=$(date +%s)
    
    # Check if circuit is open and should remain open
    if [[ -n "$MCP_CIRCUIT_OPEN_UNTIL" ]] && [[ $current_time -lt $MCP_CIRCUIT_OPEN_UNTIL ]]; then
        return 1  # Circuit open, don't try MCP
    fi
    
    # Reset circuit if timeout expired
    if [[ -n "$MCP_CIRCUIT_OPEN_UNTIL" ]] && [[ $current_time -ge $MCP_CIRCUIT_OPEN_UNTIL ]]; then
        MCP_CIRCUIT_OPEN_UNTIL=""
        MCP_FAILURE_COUNT=0
    fi
    
    return 0  # OK to try MCP
}

# Record MCP failure for circuit breaker
record_mcp_failure() {
    ((MCP_FAILURE_COUNT++))
    
    # Open circuit after 3 consecutive failures
    if [[ $MCP_FAILURE_COUNT -ge 3 ]]; then
        local current_time=$(date +%s)
        MCP_CIRCUIT_OPEN_UNTIL=$((current_time + MCP_CIRCUIT_TIMEOUT))
        echo "⚠️ MCP circuit breaker opened - using CLI for next $((MCP_CIRCUIT_TIMEOUT/60)) minutes"
    fi
}

# Record MCP success (reset failure count)
record_mcp_success() {
    MCP_FAILURE_COUNT=0
    MCP_CIRCUIT_OPEN_UNTIL=""
}

# Export functions for use in other scripts
export -f sanitize_shell_input
export -f validate_input_length  
export -f validate_github_input
export -f validate_github_token
export -f safe_quote
export -f sanitize_error_message
export -f secure_mcp_call
export -f get_mcp_status
export -f is_github_mcp_available
export -f should_try_mcp
export -f record_mcp_failure
export -f record_mcp_success