#!/bin/bash

# LDC AI Framework - Git Worktree Management Library
# Version: 1.9.0
# Purpose: Core worktree detection, creation, and management functionality

set -euo pipefail

# Source security utilities for input validation (with fallback)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
if [[ -f "$SCRIPT_DIR/security-utils.sh" ]]; then
    source "$SCRIPT_DIR/security-utils.sh" 2>/dev/null || {
        echo "⚠️ Warning: security-utils.sh could not be loaded, using fallback functions"
        # Fallback validation functions
        validate_input_length() { 
            local input="$1" 
            local max_length="${2:-1000}"
            [[ ${#input} -le $max_length ]]
        }
        validate_github_input() {
            local input="$1"
            [[ -n "$input" ]] && [[ ${#input} -le 1000 ]]
        }
    }
else
    echo "⚠️ Warning: security-utils.sh not found, using fallback functions"
    # Fallback validation functions
    validate_input_length() { 
        local input="$1" 
        local max_length="${2:-1000}"
        [[ ${#input} -le $max_length ]]
    }
    validate_github_input() {
        local input="$1"
        [[ -n "$input" ]] && [[ ${#input} -le 1000 ]]
    }
fi

# Global configuration
WORKTREE_METADATA_FILE=".ai/worktrees.json"
WORKTREE_NAME_PREFIX="wt"
MAX_WORKTREE_NAME_LENGTH=50

# ============================================================================
# WORKTREE DETECTION FUNCTIONS
# ============================================================================

# Comprehensive worktree context detection
detect_worktree_context() {
    local git_dir=$(git rev-parse --git-dir 2>/dev/null)
    local git_common_dir=$(git rev-parse --git-common-dir 2>/dev/null)
    local toplevel=$(git rev-parse --show-toplevel 2>/dev/null)
    
    if [[ -z "$git_dir" ]]; then
        echo "not_git_repo"
        return 1
    fi
    
    # Check if we're in a worktree (git-dir != git-common-dir)
    if [[ "$git_dir" != "$git_common_dir" ]]; then
        local worktree_name=$(basename "$git_dir")
        local main_repo_path=$(dirname "$git_common_dir")
        echo "worktree:$worktree_name:$main_repo_path:$toplevel"
        return 0
    else
        echo "main_repo:$toplevel"
        return 0
    fi
}

# Check if currently in a worktree
is_in_worktree() {
    local context
    context=$(detect_worktree_context)
    [[ "$context" == worktree:* ]]
}

# Get main repository path from any context
get_main_repo_path() {
    local context
    context=$(detect_worktree_context)
    
    case "$context" in
        worktree:*)
            IFS=':' read -r type name main_path current_path <<< "$context"
            echo "$main_path"
            ;;
        main_repo:*)
            echo "${context#main_repo:}"
            ;;
        not_git_repo)
            echo "❌ Error: Not in a git repository"
            return 1
            ;;
    esac
}

# Get current worktree info
get_current_worktree_info() {
    local context
    context=$(detect_worktree_context)
    
    if [[ "$context" == worktree:* ]]; then
        IFS=':' read -r type name main_path current_path <<< "$context"
        echo "name:$name"
        echo "main_repo:$main_path"
        echo "path:$current_path"
        return 0
    else
        echo "❌ Not in a worktree"
        return 1
    fi
}

# ============================================================================
# WORKTREE METADATA MANAGEMENT
# ============================================================================

# Initialize worktree metadata file
init_worktree_metadata() {
    local main_repo_path
    main_repo_path=$(get_main_repo_path)
    local metadata_file="$main_repo_path/$WORKTREE_METADATA_FILE"
    
    if [[ ! -f "$metadata_file" ]]; then
        mkdir -p "$(dirname "$metadata_file")"
        echo "{}" > "$metadata_file"
        echo "✅ Initialized worktree metadata: $metadata_file"
    fi
}

# Add worktree entry to metadata
add_worktree_metadata() {
    local issue_number="$1"
    local worktree_path="$2"
    local branch_name="$3"
    local issue_title="$4"
    local status="${5:-in_progress}"
    
    # Validate inputs
    if ! validate_input_length "$issue_number" 10; then
        echo "❌ Error: Invalid issue number"
        return 1
    fi
    
    if ! validate_github_input "$issue_title" "title"; then
        echo "❌ Error: Invalid issue title"
        return 1
    fi
    
    local main_repo_path
    main_repo_path=$(get_main_repo_path)
    local metadata_file="$main_repo_path/$WORKTREE_METADATA_FILE"
    
    init_worktree_metadata
    
    # Create metadata entry
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local temp_file=$(mktemp)
    chmod 600 "$temp_file"
    
    # Use jq to safely add the entry
    jq --arg issue "$issue_number" \
       --arg path "$worktree_path" \
       --arg branch "$branch_name" \
       --arg title "$issue_title" \
       --arg status "$status" \
       --arg created "$timestamp" \
       '.[$issue] = {
         "path": $path,
         "branch": $branch,
         "created": $created,
         "issue_title": $title,
         "status": $status
       }' "$metadata_file" > "$temp_file"
    
    mv "$temp_file" "$metadata_file"
    echo "✅ Added worktree metadata for issue #$issue_number"
}

# Get worktree metadata for issue
get_worktree_metadata() {
    local issue_number="$1"
    local main_repo_path
    main_repo_path=$(get_main_repo_path)
    local metadata_file="$main_repo_path/$WORKTREE_METADATA_FILE"
    
    if [[ ! -f "$metadata_file" ]]; then
        echo "❌ No worktree metadata found"
        return 1
    fi
    
    jq -r --arg issue "$issue_number" '.[$issue] // empty' "$metadata_file"
}

# List all worktrees from metadata
list_worktree_metadata() {
    local main_repo_path
    main_repo_path=$(get_main_repo_path)
    local metadata_file="$main_repo_path/$WORKTREE_METADATA_FILE"
    
    if [[ ! -f "$metadata_file" ]]; then
        echo "📋 No worktree metadata found"
        return 0
    fi
    
    echo "📋 **Active Worktrees:**"
    echo ""
    
    # List all entries with formatting
    jq -r 'to_entries[] | 
           "**Issue #\(.key)**: \(.value.issue_title)\n" +
           "  📂 Path: \(.value.path)\n" +
           "  🌿 Branch: \(.value.branch)\n" +
           "  📅 Created: \(.value.created)\n" +
           "  🎯 Status: \(.value.status)\n"' "$metadata_file"
}

# Remove worktree metadata entry
remove_worktree_metadata() {
    local issue_number="$1"
    local main_repo_path
    main_repo_path=$(get_main_repo_path)
    local metadata_file="$main_repo_path/$WORKTREE_METADATA_FILE"
    
    if [[ ! -f "$metadata_file" ]]; then
        echo "⚠️ No metadata file to update"
        return 0
    fi
    
    local temp_file=$(mktemp)
    chmod 600 "$temp_file"
    
    jq --arg issue "$issue_number" 'del(.[$issue])' "$metadata_file" > "$temp_file"
    mv "$temp_file" "$metadata_file"
    
    echo "✅ Removed worktree metadata for issue #$issue_number"
}

# ============================================================================
# WORKTREE CREATION FUNCTIONS
# ============================================================================

# Generate worktree name from issue details
generate_worktree_name() {
    local issue_number="$1"
    local issue_title="$2"
    
    # Sanitize title for branch/directory name
    local clean_title=$(echo "$issue_title" | \
        tr '[:upper:]' '[:lower:]' | \
        sed 's/[^a-z0-9]/-/g' | \
        sed 's/--*/-/g' | \
        sed 's/^-\|-$//g' | \
        cut -c1-30)
    
    echo "issue-${issue_number}-${clean_title}"
}

# Generate worktree path
generate_worktree_path() {
    local worktree_name="$1"
    local main_repo_path
    main_repo_path=$(get_main_repo_path)
    local repo_name=$(basename "$main_repo_path")
    
    echo "$(dirname "$main_repo_path")/${repo_name}-${WORKTREE_NAME_PREFIX}-${worktree_name}"
}

# Create worktree for GitHub issue
create_issue_worktree() {
    local issue_number="$1"
    local issue_title="$2"
    local base_branch="${3:-main}"
    
    echo "🌿 **Creating worktree for issue #$issue_number**"
    
    # Validate inputs
    if ! validate_input_length "$issue_number" 10; then
        echo "❌ Error: Invalid issue number"
        return 1
    fi
    
    if ! validate_github_input "$issue_title" "title"; then
        echo "❌ Error: Invalid issue title"
        return 1
    fi
    
    # Generate names and paths
    local worktree_name
    worktree_name=$(generate_worktree_name "$issue_number" "$issue_title")
    local worktree_path
    worktree_path=$(generate_worktree_path "$worktree_name")
    local branch_name="$worktree_name"
    
    echo "📂 **Worktree path**: $worktree_path"
    echo "🌿 **Branch name**: $branch_name"
    
    # Check if worktree already exists
    if [[ -d "$worktree_path" ]]; then
        echo "⚠️ Worktree already exists at $worktree_path"
        echo "🚀 **To enter existing worktree**: cd $worktree_path"
        return 0
    fi
    
    # Ensure we're in main repository
    local main_repo_path
    main_repo_path=$(get_main_repo_path)
    cd "$main_repo_path"
    
    # Fetch latest changes
    echo "🔄 **Fetching latest changes from remote**"
    git fetch origin "$base_branch" || {
        echo "⚠️ Warning: Failed to fetch $base_branch, proceeding with local branch"
    }
    
    # Create worktree with new branch
    echo "🔨 **Creating git worktree**"
    if git worktree add "$worktree_path" -b "$branch_name" "origin/$base_branch" 2>/dev/null; then
        echo "✅ Worktree created successfully"
    elif git worktree add "$worktree_path" -b "$branch_name" "$base_branch" 2>/dev/null; then
        echo "✅ Worktree created from local branch"
    else
        echo "❌ Failed to create worktree"
        return 1
    fi
    
    # Add metadata
    add_worktree_metadata "$issue_number" "$worktree_path" "$branch_name" "$issue_title" "in_progress"
    
    # Set up branch tracking
    cd "$worktree_path"
    if git push --set-upstream origin "$branch_name" 2>/dev/null; then
        echo "✅ Branch pushed and tracking set up"
    else
        echo "⚠️ Warning: Could not set up remote tracking (you may need to push manually)"
    fi
    
    echo ""
    echo "🎉 **Worktree Setup Complete!**"
    echo "🚀 **To start working**: cd $worktree_path"
    echo "🔧 **Commands available**: All Claude commands work in this worktree"
    
    return 0
}

# ============================================================================
# WORKTREE MANAGEMENT FUNCTIONS
# ============================================================================

# List all git worktrees with enhanced information
list_all_worktrees() {
    echo "📋 **Git Worktrees Status:**"
    echo ""
    
    # Get git worktree list
    git worktree list -v 2>/dev/null | while IFS= read -r line; do
        local path=$(echo "$line" | awk '{print $1}')
        local commit=$(echo "$line" | awk '{print $2}' | tr -d '[]')
        local branch=$(echo "$line" | awk '{print $3}' | tr -d '()')
        
        if [[ "$path" == *"$(basename $(pwd))"* && "$path" != "$(pwd)" ]]; then
            echo "🌿 **Worktree**: $(basename "$path")"
            echo "   📂 Path: $path"
            echo "   🌿 Branch: $branch"
            echo "   📝 Commit: $commit"
            echo ""
        fi
    done
    
    # Show metadata information
    echo ""
    list_worktree_metadata
}

# Clean up completed/merged worktrees
cleanup_merged_worktrees() {
    local main_repo_path
    main_repo_path=$(get_main_repo_path)
    cd "$main_repo_path"
    
    echo "🧹 **Cleaning up merged worktrees**"
    
    # Get list of merged branches
    local merged_branches
    merged_branches=$(git branch --merged main 2>/dev/null | grep -E "issue-[0-9]+" | tr -d ' ' || true)
    
    if [[ -z "$merged_branches" ]]; then
        echo "✅ No merged worktree branches found"
        return 0
    fi
    
    echo "🔍 **Found merged branches**: $merged_branches"
    
    for branch in $merged_branches; do
        # Find corresponding worktree
        local worktree_path
        worktree_path=$(git worktree list --porcelain | grep -A2 "^worktree.*$branch" | grep "^worktree " | cut -d' ' -f2 || true)
        
        if [[ -n "$worktree_path" && -d "$worktree_path" ]]; then
            echo "🗑️ **Removing worktree**: $worktree_path"
            git worktree remove "$worktree_path" || {
                echo "⚠️ Failed to remove worktree, trying force removal"
                git worktree remove --force "$worktree_path" || true
            }
            
            # Extract issue number from branch name
            if [[ "$branch" =~ issue-([0-9]+) ]]; then
                local issue_number="${BASH_REMATCH[1]}"
                remove_worktree_metadata "$issue_number"
            fi
        fi
        
        # Delete merged branch
        echo "🗑️ **Deleting branch**: $branch"
        git branch -d "$branch" 2>/dev/null || true
    done
    
    # Prune stale worktree references
    echo "🧹 **Pruning stale worktree references**"
    git worktree prune -v
    
    echo "✅ **Cleanup complete**"
}

# Remove specific worktree
remove_worktree() {
    local issue_number="$1"
    local force="${2:-false}"
    
    echo "🗑️ **Removing worktree for issue #$issue_number**"
    
    # Get worktree metadata
    local metadata
    metadata=$(get_worktree_metadata "$issue_number")
    
    if [[ -z "$metadata" ]]; then
        echo "❌ No worktree found for issue #$issue_number"
        return 1
    fi
    
    local worktree_path
    worktree_path=$(echo "$metadata" | jq -r '.path')
    local branch_name
    branch_name=$(echo "$metadata" | jq -r '.branch')
    
    if [[ ! -d "$worktree_path" ]]; then
        echo "⚠️ Worktree directory not found: $worktree_path"
        echo "🧹 Cleaning up metadata only"
        remove_worktree_metadata "$issue_number"
        return 0
    fi
    
    # Ensure we're in main repository
    local main_repo_path
    main_repo_path=$(get_main_repo_path)
    cd "$main_repo_path"
    
    # Remove worktree
    if [[ "$force" == "true" ]]; then
        git worktree remove --force "$worktree_path" || {
            echo "❌ Failed to remove worktree even with force"
            return 1
        }
    else
        git worktree remove "$worktree_path" || {
            echo "⚠️ Failed to remove worktree cleanly, use --force if needed"
            return 1
        }
    fi
    
    # Remove branch if safe to do so
    if git branch --list "$branch_name" | grep -q "$branch_name"; then
        echo "🗑️ **Deleting branch**: $branch_name"
        git branch -d "$branch_name" 2>/dev/null || {
            echo "⚠️ Branch may have unmerged changes, use 'git branch -D $branch_name' if you're sure"
        }
    fi
    
    # Remove metadata
    remove_worktree_metadata "$issue_number"
    
    echo "✅ **Worktree removed successfully**"
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Check git repository health
check_git_repo() {
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        echo "❌ Error: Not in a git repository"
        return 1
    fi
    
    if ! git remote get-url origin >/dev/null 2>&1; then
        echo "⚠️ Warning: No origin remote configured"
    fi
    
    return 0
}

# Show worktree manager help
show_worktree_help() {
    cat << 'EOF'
🌿 **Git Worktree Manager - Help**

**Core Functions:**
  detect_worktree_context()     - Get current worktree/repo context
  is_in_worktree()             - Check if currently in worktree
  get_main_repo_path()         - Get main repository path
  
**Worktree Management:**
  create_issue_worktree <issue> <title> [base] - Create worktree for issue
  list_all_worktrees()         - Show all worktrees with metadata
  remove_worktree <issue> [--force] - Remove worktree for issue
  cleanup_merged_worktrees()   - Clean up merged worktrees
  
**Metadata Functions:**
  add_worktree_metadata()      - Add worktree to metadata
  get_worktree_metadata()      - Get worktree information
  list_worktree_metadata()     - List all worktree metadata
  
**Utility Functions:**
  check_git_repo()            - Validate git repository
  show_worktree_help()        - Show this help

**Usage Examples:**
  source .claude/lib/worktree-manager.sh
  create_issue_worktree "123" "Fix authentication bug"
  list_all_worktrees
  remove_worktree "123"
EOF
}

# Export functions for use by other scripts
export -f detect_worktree_context
export -f is_in_worktree  
export -f get_main_repo_path
export -f create_issue_worktree
export -f list_all_worktrees
export -f remove_worktree
export -f cleanup_merged_worktrees