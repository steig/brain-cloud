#!/bin/bash
# Pre-Commit Hook
# Part of LDC AI Framework v2.0.0 - Proactive Developer Experience
#
# This hook runs before commits to catch potential issues:
# - Large files that should be split
# - Missing test updates
# - Security concerns
#
# Triggered by: pre-commit git hook or manually

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load the proactive checks library
source "$SCRIPT_DIR/lib/proactive-checks.sh"

# ============================================
# ADDITIONAL PRE-COMMIT CHECKS
# ============================================

# Check for secrets in staged files
check_secrets() {
    local staged_files=$(git diff --cached --name-only 2>/dev/null)
    local secrets_found=0

    # Patterns that might indicate secrets
    local patterns=(
        "password\s*=\s*['\"][^'\"]+['\"]"
        "api[_-]?key\s*=\s*['\"][^'\"]+['\"]"
        "secret\s*=\s*['\"][^'\"]+['\"]"
        "token\s*=\s*['\"][^'\"]+['\"]"
        "-----BEGIN.*PRIVATE KEY-----"
    )

    for file in $staged_files; do
        if [[ -f "$file" ]]; then
            for pattern in "${patterns[@]}"; do
                if grep -qiE "$pattern" "$file" 2>/dev/null; then
                    if [[ $secrets_found -eq 0 ]]; then
                        alert "Potential secrets detected:"
                    fi
                    echo "  $file: matches pattern '$pattern'"
                    ((secrets_found++))
                fi
            done
        fi
    done

    if [[ $secrets_found -gt 0 ]]; then
        suggest "Review flagged files or add to .gitignore"
        return 1
    fi
    return 0
}

# Check for debug code
check_debug_code() {
    local staged_files=$(git diff --cached --name-only 2>/dev/null)
    local debug_found=0

    # Debug patterns
    local patterns=(
        "console\.log\("
        "debugger;"
        "print\("  # For Python
        "binding\.pry"  # For Ruby
        "import pdb"
    )

    for file in $staged_files; do
        if [[ -f "$file" ]]; then
            # Only check code files
            if [[ "$file" == *.ts ]] || [[ "$file" == *.tsx ]] || [[ "$file" == *.js ]] || [[ "$file" == *.jsx ]] || [[ "$file" == *.py ]] || [[ "$file" == *.rb ]]; then
                for pattern in "${patterns[@]}"; do
                    local matches=$(git diff --cached "$file" 2>/dev/null | grep "^+" | grep -E "$pattern" | head -3)
                    if [[ -n "$matches" ]]; then
                        if [[ $debug_found -eq 0 ]]; then
                            warn "Debug code detected in staged changes:"
                        fi
                        echo "  $file: $pattern"
                        ((debug_found++))
                    fi
                done
            fi
        fi
    done

    if [[ $debug_found -gt 0 ]]; then
        suggest "Remove debug statements before committing"
    fi
}

# Check commit message quality (if provided)
check_commit_message() {
    local msg="$1"

    if [[ -n "$msg" ]]; then
        # Check for conventional commit format
        if ! echo "$msg" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+\))?:"; then
            warn "Commit message doesn't follow conventional format"
            suggest "Use format: type(scope): description"
            suggest "Types: feat, fix, docs, style, refactor, test, chore"
        fi

        # Check minimum length
        if [[ ${#msg} -lt 10 ]]; then
            warn "Commit message is very short (${#msg} chars)"
            suggest "Provide a more descriptive commit message"
        fi
    fi
}

# ============================================
# MAIN
# ============================================

main() {
    cd "$PROJECT_ROOT"

    local exit_code=0
    local commit_msg="$1"

    # Run standard pre-commit checks
    run_pre_commit_checks

    # Run additional checks
    check_secrets || exit_code=1
    check_debug_code

    # Check commit message if provided
    if [[ -n "$commit_msg" ]]; then
        check_commit_message "$commit_msg"
    fi

    # Summary
    if [[ $exit_code -ne 0 ]]; then
        echo ""
        alert "Pre-commit checks found issues that should be addressed"
    fi

    return $exit_code
}

# Run if executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
