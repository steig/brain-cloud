#!/bin/bash
# Git Safety Validator
# Provides security validation functions for git operations to prevent .git files from being committed
# This is a critical security component that prevents accidental commits of sensitive .git directory contents

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validate that no .git files are staged for commit
validate_staging_area() {
    echo -e "${BLUE}🔍 Validating staging area for .git files...${NC}"
    
    # Check for .git files in staging area
    local git_files_staged
    git_files_staged=$(git diff --cached --name-only | grep "^\.git/" 2>/dev/null || true)
    
    if [[ -n "$git_files_staged" ]]; then
        echo -e "${RED}❌ SECURITY VIOLATION: .git files detected in staging area!${NC}"
        echo -e "${RED}Staged .git files:${NC}"
        echo "$git_files_staged" | sed 's/^/  - /'
        echo -e "${YELLOW}These files must be removed from staging before commit${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Staging area is safe - no .git files detected${NC}"
    return 0
}

# Safe git add function that excludes .git files
safe_git_add() {
    local add_target="${1:-.}"
    
    echo -e "${BLUE}🛡️  Safe git add with .git exclusion${NC}"
    
    # Use pathspec to exclude .git files and directories
    if git add "$add_target" -- ':!.git/' ':!**/.git/' 2>/dev/null; then
        echo -e "${GREEN}✅ Files added safely (excluded .git directories)${NC}"
        
        # Double-check that no .git files were accidentally staged
        local verification_check
        verification_check=$(git diff --cached --name-only | grep "^\.git/" || true)
        
        if [[ -n "$verification_check" ]]; then
            echo -e "${RED}🚨 CRITICAL ERROR: .git files were staged despite exclusion!${NC}"
            echo -e "${YELLOW}Automatically removing from staging...${NC}"
            
            # Remove any .git files that got through
            while IFS= read -r file; do
                [[ -n "$file" ]] && git reset HEAD -- "$file"
            done <<< "$verification_check"
            
            echo -e "${GREEN}✅ .git files removed from staging${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Git add operation failed${NC}"
        return 1
    fi
}

# Validate input to prevent command injection
validate_input() {
    local input="$1"
    local input_type="${2:-general}"
    
    case "$input_type" in
        "commit_message")
            # Check for dangerous characters in commit messages - using simple string matching
            if [[ "$input" == *'$'* ]] || [[ "$input" == *'`'* ]]; then
                echo -e "${RED}❌ SECURITY: Dangerous characters detected in commit message${NC}"
                return 1
            fi
            
            # Check for null bytes
            if [[ "$input" == *$'\0'* ]]; then
                echo -e "${RED}❌ SECURITY: Null bytes detected in input${NC}"
                return 1
            fi
            
            # Check length
            if [[ ${#input} -gt 2048 ]]; then
                echo -e "${RED}❌ SECURITY: Input too long (max 2048 characters)${NC}"
                return 1
            fi
            ;;
            
        "file_path")
            # Check for path traversal attempts - using simple string matching
            if [[ "$input" == *"../"* ]] || [[ "$input" == /* ]] || [[ "$input" == ~* ]]; then
                echo -e "${RED}❌ SECURITY: Path traversal attempt detected${NC}"
                return 1
            fi
            
            # Check for null bytes
            if [[ "$input" == *$'\0'* ]]; then
                echo -e "${RED}❌ SECURITY: Null bytes in file path${NC}"
                return 1
            fi
            ;;
            
        "branch_name")
            # Validate git branch name format
            if ! git check-ref-format "refs/heads/$input" 2>/dev/null; then
                echo -e "${RED}❌ SECURITY: Invalid branch name format${NC}"
                return 1
            fi
            ;;
    esac
    
    return 0
}

# Install pre-commit hook to prevent .git files from being committed
install_git_safety_hook() {
    local hook_path=".git/hooks/pre-commit"
    
    echo -e "${BLUE}🛡️  Installing git safety pre-commit hook${NC}"
    
    # Create hook directory if it doesn't exist
    mkdir -p ".git/hooks"
    
    # Create the pre-commit hook
    cat > "$hook_path" << 'EOF'
#!/bin/bash
# Git Safety Pre-commit Hook
# Prevents .git files from being committed

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check for .git files in staging area
git_files_staged=$(git diff --cached --name-only | grep "^\.git/" 2>/dev/null || true)

if [[ -n "$git_files_staged" ]]; then
    echo -e "${RED}🚨 COMMIT BLOCKED: .git files detected in staging area!${NC}"
    echo -e "${YELLOW}Files that would be committed:${NC}"
    echo "$git_files_staged" | sed 's/^/  - /'
    echo ""
    echo -e "${YELLOW}To fix this issue:${NC}"
    echo "1. Remove .git files from staging: git reset HEAD -- .git/"
    echo "2. Add .git/ to .gitignore if not already present"
    echo "3. Re-run your commit command"
    echo ""
    exit 1
fi

exit 0
EOF

    # Make hook executable
    chmod +x "$hook_path"
    
    if [[ -x "$hook_path" ]]; then
        echo -e "${GREEN}✅ Pre-commit hook installed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to make pre-commit hook executable${NC}"
        return 1
    fi
}

# Sanitize file path to prevent directory traversal
sanitize_file_path() {
    local file_path="$1"
    
    # Remove any path traversal attempts
    file_path="${file_path//..\/}"
    file_path="${file_path//~\/}"
    
    # Ensure path is relative and doesn't start with /
    file_path="${file_path#/}"
    
    # Remove any null bytes
    file_path="${file_path//$'\0'/}"
    
    echo "$file_path"
}

# Check if current directory is a git repository
is_git_repository() {
    if git rev-parse --git-dir >/dev/null 2>&1; then
        return 0
    else
        echo -e "${RED}❌ Not a git repository${NC}"
        return 1
    fi
}

# Validate git repository state
validate_git_state() {
    echo -e "${BLUE}🔍 Validating git repository state${NC}"
    
    # Check if we're in a git repository
    if ! is_git_repository; then
        return 1
    fi
    
    # Check if .git directory is accessible
    if [[ ! -d ".git" ]]; then
        echo -e "${RED}❌ .git directory not accessible${NC}"
        return 1
    fi
    
    # Check if git index is readable
    if ! git status --porcelain >/dev/null 2>&1; then
        echo -e "${RED}❌ Git index appears corrupted${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Git repository state is valid${NC}"
    return 0
}

# Create secure temporary file
create_secure_temp_file() {
    local temp_prefix="${1:-git_safety}"
    local temp_file
    
    # Create temporary file with secure permissions
    temp_file=$(mktemp -t "${temp_prefix}.XXXXXX")
    
    # Set restrictive permissions (owner read/write only)
    chmod 600 "$temp_file"
    
    echo "$temp_file"
}

# Clean up temporary files
cleanup_temp_files() {
    local temp_pattern="${1:-git_safety}"
    
    # Find and remove temporary files matching pattern
    find /tmp -name "${temp_pattern}.*" -user "$(id -u)" -type f -delete 2>/dev/null || true
}

# Export functions for use by other scripts
export -f validate_staging_area
export -f safe_git_add
export -f validate_input
export -f install_git_safety_hook
export -f sanitize_file_path
export -f is_git_repository
export -f validate_git_state
export -f create_secure_temp_file
export -f cleanup_temp_files

# Initialize safety measures when sourced
if [[ "${BASH_SOURCE[0]:-$0}" != "${0}" ]]; then
    # Being sourced - perform initial validation
    if is_git_repository; then
        # Auto-install pre-commit hook if missing
        if [[ ! -f ".git/hooks/pre-commit" ]]; then
            echo -e "${YELLOW}🛡️  Installing git safety hook automatically...${NC}"
            install_git_safety_hook
        fi
    fi
fi

# If run directly, provide usage information
if [[ "${BASH_SOURCE[0]:-$0}" == "${0}" ]]; then
    echo -e "${BLUE}🛡️  Git Safety Validator${NC}"
    echo "This script provides security validation functions for git operations"
    echo ""
    echo -e "${BLUE}Available functions:${NC}"
    echo "  validate_staging_area    - Check for .git files in staging area"
    echo "  safe_git_add            - Add files while excluding .git directories"
    echo "  validate_input          - Validate user input for security"
    echo "  install_git_safety_hook - Install pre-commit hook"
    echo "  sanitize_file_path      - Clean file paths of dangerous elements"
    echo "  validate_git_state      - Check git repository integrity"
    echo ""
    echo -e "${BLUE}Usage:${NC}"
    echo "  source .claude/lib/git-safety-validator.sh"
    echo "  Then call any of the exported functions"
    echo ""
    
    # Run basic validation if in git repository
    if is_git_repository; then
        validate_git_state
        validate_staging_area
    fi
fi