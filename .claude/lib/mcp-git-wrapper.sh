#!/bin/bash
# MCP Git Safety Wrapper
# Provides secure wrapper functions for MCP git operations that prevent .git files from being staged
# This fixes the critical security vulnerability where .git files could be accidentally committed

set -euo pipefail

# Source the safety validator
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "$SCRIPT_DIR/git-safety-validator.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# MCP Git Safety Wrapper Functions

# Safe wrapper for mcp__github__git_add
safe_mcp_git_add() {
    local add_target="${1:-.}"
    
    echo -e "${BLUE}🛡️  Safe MCP Git Add (with .git exclusion)${NC}"
    
    # First, use our safe git add function
    if safe_git_add "$add_target"; then
        echo -e "${GREEN}✅ Files safely staged (no .git files included)${NC}"
        
        # Validate staging area as additional safety check
        if validate_staging_area; then
            echo -e "${GREEN}✅ Staging area validation passed${NC}"
            return 0
        else
            echo -e "${RED}❌ Staging area validation failed - unsafe files detected${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Safe staging failed${NC}"
        return 1
    fi
}

# Safe wrapper for mcp__github__git_commit  
safe_mcp_git_commit() {
    local commit_message="$1"
    
    echo -e "${BLUE}🛡️  Safe MCP Git Commit (with pre-commit validation)${NC}"
    
    # Pre-commit safety validation
    echo -e "${YELLOW}🔍 Running pre-commit safety validation...${NC}"
    if ! validate_staging_area; then
        echo -e "${RED}❌ COMMIT BLOCKED: .git files detected in staging area${NC}"
        echo -e "${YELLOW}💡 Run 'git status' to see staged files${NC}"
        echo -e "${YELLOW}💡 Use 'git reset HEAD' to unstage problematic files${NC}"
        return 1
    fi
    
    # Input validation for commit message
    if [[ -z "$commit_message" ]]; then
        echo -e "${RED}❌ COMMIT BLOCKED: Empty commit message${NC}"
        return 1
    fi
    
    # Validate commit message length (prevent extremely long messages)
    if [[ ${#commit_message} -gt 2048 ]]; then
        echo -e "${RED}❌ COMMIT BLOCKED: Commit message too long (max 2048 characters)${NC}"
        return 1
    fi
    
    # Check for dangerous characters that could be used for injection
    if [[ "$commit_message" =~ [\$\`] ]]; then
        echo -e "${RED}❌ COMMIT BLOCKED: Commit message contains dangerous characters (\$ or \`)${NC}"
        echo -e "${YELLOW}These characters could be used for command injection${NC}"
        return 1
    fi
    
    # Check for null bytes (another injection vector)
    if [[ "$commit_message" =~ $'\0' ]]; then
        echo -e "${RED}❌ COMMIT BLOCKED: Commit message contains null bytes${NC}"
        return 1
    fi
    
    # Additional safety: verify no .git patterns in commit message
    if echo "$commit_message" | grep -q "\.git/"; then
        echo -e "${YELLOW}⚠️  Warning: Commit message contains .git/ references${NC}"
        echo -e "${YELLOW}This might indicate the commit includes .git files${NC}"
        
        # Double-check staging area
        if ! validate_staging_area; then
            echo -e "${RED}❌ COMMIT BLOCKED: Safety validation failed${NC}"
            return 1
        fi
    fi
    
    echo -e "${GREEN}✅ Pre-commit validation passed${NC}"
    
    # Execute the actual git commit
    echo -e "${BLUE}📝 Creating commit...${NC}"
    if printf '%s
' "$commit_message" | git commit -F -; then
        echo -e "${GREEN}✅ Commit created successfully${NC}"
        
        # Post-commit validation
        local commit_files=$(git show --name-only --format="" HEAD)
        if echo "$commit_files" | grep -q "^\.git/"; then
            echo -e "${RED}🚨 CRITICAL ERROR: .git files were committed!${NC}"
            echo -e "${RED}This is a serious bug that needs immediate attention${NC}"
            echo -e "${YELLOW}Files committed:${NC}"
            echo "$commit_files" | grep "^\.git/" | sed 's/^/  - /'
            echo -e "${YELLOW}Consider running: git reset --soft HEAD~1${NC}"
            return 1
        else
            echo -e "${GREEN}✅ Post-commit validation passed (no .git files in commit)${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Commit failed${NC}"
        return 1
    fi
}

# Enhanced MCP git status with safety information
safe_mcp_git_status() {
    echo -e "${BLUE}📊 Safe MCP Git Status (with safety analysis)${NC}"
    
    # Standard git status
    git status
    
    echo ""
    echo -e "${BLUE}🛡️  Safety Analysis:${NC}"
    
    # Check staging area for .git files
    local git_files_staged=$(git diff --cached --name-only | grep "^\.git/" || true)
    if [[ -n "$git_files_staged" ]]; then
        echo -e "${RED}🚨 DANGER: .git files are staged for commit!${NC}"
        echo -e "${RED}Staged .git files:${NC}"
        echo "$git_files_staged" | sed 's/^/  - /'
        echo -e "${YELLOW}Automatically removing these files from staging...${NC}"
        while IFS= read -r file; do
            [[ -n "$file" ]] && git reset HEAD -- "$file"
        done <<< "$git_files_staged"
        echo -e "${GREEN}✅ Removed .git files from staging area${NC}"
    else
        echo -e "${GREEN}✅ No .git files in staging area${NC}"
    fi
    
    # Check for untracked .git files (shouldn't happen but worth checking)
    local git_files_untracked=$(git ls-files --others | grep "^\.git/" || true)
    if [[ -n "$git_files_untracked" ]]; then
        echo -e "${YELLOW}⚠️  Untracked .git files detected (unusual):${NC}"
        echo "$git_files_untracked" | sed 's/^/  - /'
    fi
    
    # Show safety hook status
    if [[ -f ".git/hooks/pre-commit" ]]; then
        echo -e "${GREEN}✅ Pre-commit safety hook installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Pre-commit safety hook not installed${NC}"
        echo -e "${YELLOW}Run: source .claude/lib/git-safety-validator.sh && install_git_safety_hook${NC}"
    fi
}

# Install safety measures for the repository
install_repository_safety() {
    echo -e "${BLUE}🛡️  Installing Repository Safety Measures${NC}"
    
    # Install pre-commit hook
    if install_git_safety_hook; then
        echo -e "${GREEN}✅ Pre-commit hook installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Pre-commit hook installation had issues${NC}"
    fi
    
    # Ensure .gitignore includes .git directory
    if ! grep -q "^\.git/$" .gitignore 2>/dev/null; then
        echo -e "${YELLOW}📝 Adding .git/ to .gitignore for extra safety${NC}"
        echo "" >> .gitignore
        echo "# Git safety: Ensure .git directory is never tracked" >> .gitignore
        echo ".git/" >> .gitignore
        echo "**/.git/" >> .gitignore
    fi
    
    # Create safety configuration file
    local safety_config=".git/hooks/commit-msg-safety"
    cat > "$safety_config" << 'EOF'
# Git Safety Configuration
# This file tracks safety measures installed in this repository

SAFETY_VERSION=1.0
INSTALLED_DATE=$(date)
SAFETY_HOOKS=pre-commit
WRAPPER_VERSION=mcp-git-wrapper-v1.0
EOF
    
    echo -e "${GREEN}✅ Repository safety measures installed${NC}"
    echo -e "${BLUE}📋 Safety Summary:${NC}"
    echo "  - Pre-commit hook: Blocks .git files from being committed"
    echo "  - Enhanced .gitignore: Excludes .git directories" 
    echo "  - Safety wrapper functions: Validate all git operations"
    echo "  - Configuration tracking: Documents safety measures"
}

# Validate repository safety configuration
validate_repository_safety() {
    echo -e "${BLUE}🔍 Validating Repository Safety Configuration${NC}"
    
    local issues=0
    
    # Check pre-commit hook
    if [[ -f ".git/hooks/pre-commit" ]] && [[ -x ".git/hooks/pre-commit" ]]; then
        echo -e "${GREEN}✅ Pre-commit hook: Installed and executable${NC}"
    else
        echo -e "${RED}❌ Pre-commit hook: Missing or not executable${NC}"
        ((issues++))
    fi
    
    # Check .gitignore
    if grep -q "\.git/" .gitignore 2>/dev/null; then
        echo -e "${GREEN}✅ .gitignore: Contains .git/ exclusions${NC}"
    else
        echo -e "${YELLOW}⚠️  .gitignore: Missing .git/ exclusions${NC}"
        ((issues++))
    fi
    
    # Check current staging area
    if validate_staging_area >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Staging area: No .git files detected${NC}"
    else
        echo -e "${RED}❌ Staging area: Contains .git files!${NC}"
        ((issues++))
    fi
    
    if [[ $issues -eq 0 ]]; then
        echo -e "${GREEN}🎉 Repository safety validation passed${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Repository has $issues safety issues${NC}"
        echo -e "${YELLOW}Run: install_repository_safety to fix issues${NC}"
        return 1
    fi
}

# ============================================================================
# WORKTREE AWARENESS EXTENSIONS
# ============================================================================

# Source worktree manager if available
if [[ -f "$SCRIPT_DIR/worktree-manager.sh" ]]; then
    source "$SCRIPT_DIR/worktree-manager.sh" 2>/dev/null || true
fi

# Get repository context (main repo or worktree)
get_repo_context() {
    if command -v detect_worktree_context >/dev/null 2>&1; then
        detect_worktree_context
    else
        echo "main_repo:$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
    fi
}

# Get configuration path considering worktree context
get_config_path() {
    local config_file="$1"
    local context
    context=$(get_repo_context)
    
    case "$context" in
        worktree:*)
            IFS=':' read -r type name main_path current_path <<< "$context"
            echo "$main_path/$config_file"
            ;;
        main_repo:*)
            echo "${context#main_repo:}/$config_file"
            ;;
        *)
            echo "./$config_file"
            ;;
    esac
}

# Worktree-aware safe git add
safe_mcp_git_add_worktree() {
    local add_target="${1:-.}"
    
    local context
    context=$(get_repo_context)
    
    case "$context" in
        worktree:*)
            IFS=':' read -r type name main_path current_path <<< "$context"
            echo -e "${BLUE}🌿 Safe MCP Git Add (Worktree: $name)${NC}"
            ;;
        *)
            echo -e "${BLUE}🛡️  Safe MCP Git Add (Main Repository)${NC}"
            ;;
    esac
    
    # Use existing safe add logic
    safe_mcp_git_add "$add_target"
}

# Worktree-aware safe git commit
safe_mcp_git_commit_worktree() {
    local commit_message="$1"
    
    local context
    context=$(get_repo_context)
    
    case "$context" in
        worktree:*)
            IFS=':' read -r type name main_path current_path <<< "$context"
            echo -e "${BLUE}🌿 Safe MCP Git Commit (Worktree: $name)${NC}"
            
            # Add worktree context to commit message for better tracking
            local enhanced_message="$commit_message"
            if [[ "$name" =~ issue-([0-9]+) ]]; then
                local issue_number="${BASH_REMATCH[1]}"
                enhanced_message="$commit_message

Refs #$issue_number"
            fi
            
            # Use existing safe commit logic with enhanced message
            safe_mcp_git_commit "$enhanced_message"
            ;;
        *)
            echo -e "${BLUE}🛡️  Safe MCP Git Commit (Main Repository)${NC}"
            safe_mcp_git_commit "$commit_message"
            ;;
    esac
}

# Worktree-aware safe git status
safe_mcp_git_status_worktree() {
    local context
    context=$(get_repo_context)
    
    case "$context" in
        worktree:*)
            IFS=':' read -r type name main_path current_path <<< "$context"
            echo -e "${BLUE}📊 Safe MCP Git Status (Worktree: $name)${NC}"
            echo -e "${BLUE}🏠 Main Repository: $main_path${NC}"
            ;;
        *)
            echo -e "${BLUE}📊 Safe MCP Git Status (Main Repository)${NC}"
            ;;
    esac
    
    # Use existing safe status logic
    safe_mcp_git_status
    
    # Add worktree-specific information
    if [[ "$context" == worktree:* ]]; then
        echo ""
        echo -e "${BLUE}🌿 Worktree Information:${NC}"
        
        # Show current branch and its relationship to main
        local current_branch
        current_branch=$(git branch --show-current 2>/dev/null || echo "detached")
        echo -e "  Current branch: $current_branch"
        
        # Show worktree list for context
        echo -e "  Other worktrees:"
        git worktree list | grep -v "$(pwd)" | sed 's/^/    /' || echo "    None"
    fi
}

# Export functions for use by Claude and other scripts
export -f safe_mcp_git_add
export -f safe_mcp_git_commit
export -f safe_mcp_git_status
export -f safe_mcp_git_add_worktree
export -f safe_mcp_git_commit_worktree
export -f safe_mcp_git_status_worktree
export -f install_repository_safety
export -f validate_repository_safety
export -f get_repo_context
export -f get_config_path

# Auto-install safety measures when sourced
if [[ "${BASH_SOURCE[0]:-$0}" != "${0}" ]]; then
    # Being sourced, check if safety measures need installation
    if [[ ! -f ".git/hooks/pre-commit" ]]; then
        echo -e "${YELLOW}🛡️  Auto-installing repository safety measures...${NC}"
        install_repository_safety
    fi
fi

# If script is run directly, perform safety check and installation
if [[ "${BASH_SOURCE[0]:-$0}" == "${0}" ]]; then
    echo -e "${BLUE}🛡️  MCP Git Safety Wrapper${NC}"
    echo "This script provides secure wrappers for MCP git operations"
    echo ""
    
    if validate_repository_safety; then
        echo ""
        echo -e "${GREEN}✅ Repository is properly configured for safe git operations${NC}"
    else
        echo ""
        echo -e "${YELLOW}Installing safety measures...${NC}"
        install_repository_safety
    fi
    
    echo ""
    echo -e "${BLUE}📖 Usage:${NC}"
    echo "  Source this file: source .claude/lib/mcp-git-wrapper.sh"
    echo "  Use safe functions: safe_mcp_git_add, safe_mcp_git_commit, safe_mcp_git_status"
    echo "  Install safety: install_repository_safety"
    echo "  Validate safety: validate_repository_safety"
fi