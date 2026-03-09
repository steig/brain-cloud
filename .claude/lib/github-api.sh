#!/bin/bash

# GitHub API Standardization Library for LDC AI Framework
# Provides consistent GitHub API interaction patterns, response handling, and fallback mechanisms

# Source dependencies
source "$(dirname "$0")/security-utils.sh"
source "$(dirname "$0")/error-handling.sh"

# GitHub API constants
readonly GITHUB_API_BASE="https://api.github.com"
readonly GITHUB_API_VERSION="2022-11-28"
readonly MAX_RETRY_ATTEMPTS=3
readonly BASE_RETRY_DELAY=2
readonly MAX_RETRY_DELAY=30

# Initialize GitHub API context
initialize_github_context() {
    local repo_path="${1:-$(pwd)}"
    
    log_debug "Initializing GitHub context from: $repo_path"
    
    # Try to get repository information
    if cd "$repo_path" 2>/dev/null && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        local remote_url=$(git remote get-url origin 2>/dev/null || echo "")
        
        if [[ "$remote_url" =~ github\.com[:/]([^/]+)/([^/]+)(\.git)?$ ]]; then
            GITHUB_OWNER="${BASH_REMATCH[1]}"
            GITHUB_REPO="${BASH_REMATCH[2]}"
            GITHUB_REPO="${GITHUB_REPO%.git}"  # Remove .git suffix if present
            
            export GITHUB_OWNER GITHUB_REPO
            log_info "GitHub context initialized: $GITHUB_OWNER/$GITHUB_REPO"
            return 0
        else
            handle_error 9 "Not a GitHub repository" "Initialize in a GitHub repository directory"
            return 9
        fi
    else
        handle_error 8 "Not a Git repository" "Initialize in a Git repository directory"
        return 8
    fi
}

# Standardized GitHub API call function
github_api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local use_mcp="${4:-auto}"
    local expected_status="${5:-200,201,204}"
    
    validate_required_param "$method" "HTTP method" || return $?
    validate_required_param "$endpoint" "API endpoint" || return $?
    
    log_debug "GitHub API call: $method $endpoint"
    
    # Sanitize endpoint to prevent injection
    endpoint=$(echo "$endpoint" | sed 's/[^a-zA-Z0-9\/\-_?=&.]//g')
    
    local response=""
    local http_status=""
    local use_cli=false
    
    # Determine whether to use MCP or CLI
    case "$use_mcp" in
        "auto")
            if is_github_mcp_available && should_try_mcp; then
                use_cli=false
            else
                use_cli=true
            fi
            ;;
        "true"|"mcp")
            if is_github_mcp_available && should_try_mcp; then
                use_cli=false
            else
                log_warn "MCP requested but not available, falling back to CLI"
                use_cli=true
            fi
            ;;
        "false"|"cli")
            use_cli=true
            ;;
        *)
            use_cli=true
            ;;
    esac
    
    # Attempt API call with retry logic
    local attempt=1
    while [[ $attempt -le $MAX_RETRY_ATTEMPTS ]]; do
        log_debug "API call attempt $attempt/$MAX_RETRY_ATTEMPTS"
        
        if [[ "$use_cli" == "false" ]]; then
            # Try MCP first
            if response=$(github_api_call_mcp "$method" "$endpoint" "$data"); then
                http_status=200  # MCP doesn't provide HTTP status, assume success
                record_mcp_success
                break
            else
                log_warn "MCP API call failed on attempt $attempt"
                handle_mcp_error "GitHub API call" "$method $endpoint"
                
                # Fall back to CLI for this attempt
                if response=$(github_api_call_cli "$method" "$endpoint" "$data"); then
                    http_status=$(echo "$response" | jq -r '.status // 200' 2>/dev/null || echo "200")
                    break
                fi
            fi
        else
            # Use CLI directly
            if result=$(github_api_call_cli "$method" "$endpoint" "$data"); then
                response=$(echo "$result" | jq -r '.response // empty' 2>/dev/null || echo "$result")
                http_status=$(echo "$result" | jq -r '.status // 200' 2>/dev/null || echo "200")
                break
            fi
        fi
        
        # If we get here, both MCP and CLI failed
        if [[ $attempt -eq $MAX_RETRY_ATTEMPTS ]]; then
            handle_error 7 "GitHub API call failed after $MAX_RETRY_ATTEMPTS attempts" "Check GitHub status and connectivity"
            return 7
        fi
        
        # Wait before retry with exponential backoff
        local delay=$((BASE_RETRY_DELAY * attempt + RANDOM % 3))
        [[ $delay -gt $MAX_RETRY_DELAY ]] && delay=$MAX_RETRY_DELAY
        
        log_info "Retrying in ${delay}s..."
        sleep "$delay"
        ((attempt++))
    done
    
    # Validate HTTP status
    if [[ ",$expected_status," != *",$http_status,"* ]]; then
        handle_github_response "$response" "$method $endpoint" "$http_status"
        return $?
    fi
    
    # Return successful response
    echo "$response"
    log_info "GitHub API call successful: $method $endpoint (HTTP $http_status)"
    return 0
}

# MCP-based GitHub API call
github_api_call_mcp() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    local temp_file=$(mktemp)
    chmod 600 "$temp_file"
    
    # Create secure MCP request
    cat > "$temp_file" << 'EOF'
Please make a GitHub API call with the following details:
- Method: __METHOD_PLACEHOLDER__
- Endpoint: __ENDPOINT_PLACEHOLDER__
- Data: __DATA_PLACEHOLDER__

Return the response in JSON format.
Use the GitHub MCP to make this API call.
EOF

    # Safe replacement of placeholders
    local safe_method=$(printf '%s' "$method" | sed 's/[[\\.*^$()+?{|]/\\\\&/g')
    local safe_endpoint=$(printf '%s' "$endpoint" | sed 's/[[\\.*^$()+?{|]/\\\\&/g')
    local safe_data=$(printf '%s' "$data" | sed 's/[[\\.*^$()+?{|]/\\\\&/g')
    
    sed -i "s/__METHOD_PLACEHOLDER__/$safe_method/g" "$temp_file"
    sed -i "s/__ENDPOINT_PLACEHOLDER__/$safe_endpoint/g" "$temp_file"
    sed -i "s/__DATA_PLACEHOLDER__/$safe_data/g" "$temp_file"
    
    # Execute MCP call
    local result
    if result=$(claude < "$temp_file" 2>/dev/null); then
        cleanup_temp_resources "$temp_file"
        echo "$result"
        return 0
    else
        cleanup_temp_resources "$temp_file"
        return 1
    fi
}

# CLI-based GitHub API call
github_api_call_cli() {
    local method="$1"
    local endpoint="$2" 
    local data="$3"
    
    local gh_args=()
    
    # Build GitHub CLI command
    case "$method" in
        "GET")
            gh_args=("api" "$endpoint")
            ;;
        "POST")
            gh_args=("api" "$endpoint" "--method" "POST")
            if [[ -n "$data" ]]; then
                gh_args+=("--input" "-")
            fi
            ;;
        "PUT")
            gh_args=("api" "$endpoint" "--method" "PUT")
            if [[ -n "$data" ]]; then
                gh_args+=("--input" "-")
            fi
            ;;
        "PATCH")
            gh_args=("api" "$endpoint" "--method" "PATCH")
            if [[ -n "$data" ]]; then
                gh_args+=("--input" "-")
            fi
            ;;
        "DELETE")
            gh_args=("api" "$endpoint" "--method" "DELETE")
            ;;
        *)
            handle_error 2 "Unsupported HTTP method: $method" "Use GET, POST, PUT, PATCH, or DELETE"
            return 2
            ;;
    esac
    
    # Execute GitHub CLI command
    local result
    if [[ -n "$data" ]]; then
        result=$(echo "$data" | gh "${gh_args[@]}" 2>&1)
    else
        result=$(gh "${gh_args[@]}" 2>&1)
    fi
    
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        # Wrap response with metadata
        echo "{\"response\": $result, \"status\": 200}"
        return 0
    else
        # Parse error response
        local http_status=500
        if [[ "$result" =~ HTTP\ ([0-9]+) ]]; then
            http_status="${BASH_REMATCH[1]}"
        fi
        
        echo "{\"response\": $(echo "$result" | jq -R -s .), \"status\": $http_status}"
        return $exit_code
    fi
}

# Convenience functions for common GitHub operations

# Create GitHub issue
github_create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    local assignees="$4"
    local milestone="$5"
    
    validate_required_param "$title" "issue title" "github_title" || return $?
    
    # Build issue data
    local issue_data=$(jq -n \
        --arg title "$title" \
        --arg body "${body:-}" \
        --argjson labels "$(echo "${labels:-[]}" | jq -R 'split(",") | map(select(length > 0))')" \
        --argjson assignees "$(echo "${assignees:-[]}" | jq -R 'split(",") | map(select(length > 0))')" \
        '{title: $title, body: $body, labels: $labels, assignees: $assignees}')
    
    if [[ -n "$milestone" ]]; then
        issue_data=$(echo "$issue_data" | jq --arg milestone "$milestone" '. + {milestone: ($milestone | tonumber)}')
    fi
    
    github_api_call "POST" "repos/$GITHUB_OWNER/$GITHUB_REPO/issues" "$issue_data" "auto" "201"
}

# Get GitHub issue
github_get_issue() {
    local issue_number="$1"
    
    validate_required_param "$issue_number" "issue number" || return $?
    
    # Validate issue number is numeric
    if [[ ! "$issue_number" =~ ^[0-9]+$ ]]; then
        handle_error 9 "Issue number must be numeric" "Provide a valid issue number"
        return 9
    fi
    
    github_api_call "GET" "repos/$GITHUB_OWNER/$GITHUB_REPO/issues/$issue_number"
}

# Create GitHub milestone
github_create_milestone() {
    local title="$1"
    local description="$2"
    local due_date="$3"
    
    validate_required_param "$title" "milestone title" "github_title" || return $?
    
    local milestone_data=$(jq -n \
        --arg title "$title" \
        --arg description "${description:-}" \
        '{title: $title, description: $description}')
    
    if [[ -n "$due_date" ]]; then
        milestone_data=$(echo "$milestone_data" | jq --arg due_on "$due_date" '. + {due_on: $due_on}')
    fi
    
    github_api_call "POST" "repos/$GITHUB_OWNER/$GITHUB_REPO/milestones" "$milestone_data" "auto" "201"
}

# Get repository information
github_get_repo() {
    github_api_call "GET" "repos/$GITHUB_OWNER/$GITHUB_REPO"
}

# Create pull request
github_create_pr() {
    local title="$1"
    local body="$2"
    local head="$3"
    local base="${4:-main}"
    
    validate_required_param "$title" "PR title" "github_title" || return $?
    validate_required_param "$head" "head branch" || return $?
    
    local pr_data=$(jq -n \
        --arg title "$title" \
        --arg body "${body:-}" \
        --arg head "$head" \
        --arg base "$base" \
        '{title: $title, body: $body, head: $head, base: $base}')
    
    github_api_call "POST" "repos/$GITHUB_OWNER/$GITHUB_REPO/pulls" "$pr_data" "auto" "201"
}

# Get pull request
github_get_pr() {
    local pr_number="$1"
    
    validate_required_param "$pr_number" "PR number" || return $?
    
    if [[ ! "$pr_number" =~ ^[0-9]+$ ]]; then
        handle_error 9 "PR number must be numeric" "Provide a valid PR number"
        return 9
    fi
    
    github_api_call "GET" "repos/$GITHUB_OWNER/$GITHUB_REPO/pulls/$pr_number"
}

# Add comment to issue or PR
github_add_comment() {
    local issue_number="$1"
    local comment_body="$2"
    
    validate_required_param "$issue_number" "issue/PR number" || return $?
    validate_required_param "$comment_body" "comment body" || return $?
    
    local comment_data=$(jq -n --arg body "$comment_body" '{body: $body}')
    
    github_api_call "POST" "repos/$GITHUB_OWNER/$GITHUB_REPO/issues/$issue_number/comments" "$comment_data" "auto" "201"
}

# List repository issues
github_list_issues() {
    local state="${1:-open}"
    local labels="$2"
    local milestone="$3"
    
    local endpoint="repos/$GITHUB_OWNER/$GITHUB_REPO/issues?state=$state"
    
    if [[ -n "$labels" ]]; then
        endpoint="$endpoint&labels=$(echo "$labels" | sed 's/ /%20/g')"
    fi
    
    if [[ -n "$milestone" ]]; then
        endpoint="$endpoint&milestone=$milestone"
    fi
    
    github_api_call "GET" "$endpoint"
}

# GitHub API health check
github_api_health_check() {
    log_info "Performing GitHub API health check..."
    
    # Check GitHub API status
    if response=$(github_api_call "GET" "rate_limit" "" "auto" "200"); then
        local remaining=$(echo "$response" | jq -r '.rate.remaining // 0' 2>/dev/null || echo "0")
        local reset_time=$(echo "$response" | jq -r '.rate.reset // 0' 2>/dev/null || echo "0")
        
        log_info "GitHub API health check passed"
        log_info "Rate limit remaining: $remaining"
        
        if [[ "$remaining" -lt 100 ]]; then
            local reset_date=$(date -d "@$reset_time" 2>/dev/null || date -r "$reset_time" 2>/dev/null || echo "Unknown")
            log_warn "GitHub API rate limit low: $remaining requests remaining (resets: $reset_date)"
        fi
        
        return 0
    else
        log_error "GitHub API health check failed"
        return 1
    fi
}

# Export functions for use in other scripts
export -f initialize_github_context github_api_call
export -f github_create_issue github_get_issue github_create_milestone
export -f github_get_repo github_create_pr github_get_pr
export -f github_add_comment github_list_issues github_api_health_check

# Export GitHub context variables
export GITHUB_OWNER GITHUB_REPO