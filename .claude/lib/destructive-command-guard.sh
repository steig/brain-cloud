#!/bin/bash
# Destructive Command Guard (DCG) Wrapper for LDC AI Framework
# Provides integration with DCG for blocking dangerous commands
# See: https://github.com/Dicklesworthstone/destructive_command_guard

set -euo pipefail

# Source error handling if available
if [[ -f "${BASH_SOURCE[0]%/*}/error-handling.sh" ]]; then
    source "${BASH_SOURCE[0]%/*}/error-handling.sh"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Error code for DCG-blocked commands
readonly ERR_DCG_BLOCKED=11

# Check if DCG is available
dcg_available() {
    if command -v dcg &> /dev/null; then
        return 0
    else
        echo -e "${YELLOW}⚠️  DCG not found in PATH${NC}"
        echo -e "${BLUE}💡 Install via: nix profile install .#dcg${NC}"
        return 1
    fi
}

# Get DCG version
dcg_version() {
    if dcg_available; then
        dcg --version 2>&1 | grep -oP 'v\d+\.\d+\.\d+' || echo "unknown"
    fi
}

# Test a command against DCG without executing
# Returns 0 if safe, 1 if blocked
dcg_test_command() {
    local command="$1"

    if ! dcg_available; then
        echo -e "${YELLOW}⚠️  DCG not available, skipping safety check${NC}"
        return 0  # Fail open if DCG not installed
    fi

    local result
    if result=$(dcg test "$command" 2>&1); then
        echo -e "${GREEN}✅ Command passed DCG safety check${NC}"
        return 0
    else
        echo -e "${RED}🛡️  DCG BLOCKED: Command detected as destructive${NC}"
        echo "$result" | grep -E "(Pack:|Pattern:|Reason:)" | sed 's/^/   /'
        return 1
    fi
}

# Validate command before execution (for use in hooks)
# Reads command from stdin or first argument
dcg_validate() {
    local command="${1:-}"

    # Read from stdin if no argument provided
    if [[ -z "$command" ]]; then
        command=$(cat)
    fi

    if [[ -z "$command" ]]; then
        echo -e "${RED}❌ No command provided to validate${NC}"
        return 2
    fi

    dcg_test_command "$command"
}

# Explain why a command would be blocked
dcg_explain() {
    local command="$1"

    if ! dcg_available; then
        echo -e "${RED}❌ DCG not available${NC}"
        return 1
    fi

    echo -e "${BLUE}🔍 DCG Explanation for: ${NC}$command"
    echo ""
    dcg explain "$command" 2>&1
}

# List enabled security packs
dcg_list_packs() {
    if ! dcg_available; then
        echo -e "${RED}❌ DCG not available${NC}"
        return 1
    fi

    echo -e "${BLUE}🛡️  DCG Security Packs${NC}"
    dcg packs list 2>&1
}

# Add command to allowlist (project-level)
dcg_allowlist_add() {
    local pattern="$1"
    local reason="${2:-Added via framework}"

    if ! dcg_available; then
        echo -e "${RED}❌ DCG not available${NC}"
        return 1
    fi

    echo -e "${BLUE}📝 Adding to allowlist: ${NC}$pattern"
    dcg allowlist add "$pattern" --reason "$reason" --project 2>&1
}

# Remove command from allowlist
dcg_allowlist_remove() {
    local pattern="$1"

    if ! dcg_available; then
        echo -e "${RED}❌ DCG not available${NC}"
        return 1
    fi

    echo -e "${BLUE}🗑️  Removing from allowlist: ${NC}$pattern"
    dcg allowlist remove "$pattern" 2>&1
}

# List current allowlist
dcg_allowlist_list() {
    if ! dcg_available; then
        echo -e "${RED}❌ DCG not available${NC}"
        return 1
    fi

    echo -e "${BLUE}📋 DCG Allowlist${NC}"
    dcg allowlist list 2>&1
}

# Check command safety with detailed output
dcg_check() {
    local command="$1"
    local verbose="${2:-false}"

    if ! dcg_available; then
        echo -e "${YELLOW}⚠️  DCG not installed - command safety not verified${NC}"
        return 0
    fi

    echo -e "${BLUE}🛡️  Checking command safety...${NC}"

    if dcg_test_command "$command"; then
        if [[ "$verbose" == "true" ]]; then
            echo -e "${GREEN}Command is safe to execute${NC}"
        fi
        return 0
    else
        echo -e "${RED}🚨 DESTRUCTIVE COMMAND DETECTED${NC}"
        echo ""
        echo -e "${YELLOW}The following command was blocked by DCG:${NC}"
        echo "   $command"
        echo ""
        echo -e "${BLUE}💡 Options:${NC}"
        echo "   1. Use a safer alternative"
        echo "   2. Add to allowlist: dcg allowlist add <pattern> --reason 'reason'"
        echo "   3. Run manually if truly needed"
        echo ""
        return $ERR_DCG_BLOCKED
    fi
}

# Integration function for Claude Code PreToolUse hook
# This is called by the hook system before Bash tool execution
dcg_hook_check() {
    local tool_input="$1"

    # Extract command from tool input (JSON format from Claude Code)
    local command
    if command -v jq &> /dev/null; then
        command=$(echo "$tool_input" | jq -r '.command // empty' 2>/dev/null || echo "$tool_input")
    else
        command="$tool_input"
    fi

    if [[ -z "$command" ]]; then
        return 0  # No command to check
    fi

    # Run DCG check
    if ! dcg_test_command "$command" 2>/dev/null; then
        # Log blocked command
        if [[ -n "${LOG_FILE:-}" ]]; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DCG] Blocked: $command" >> "$LOG_FILE"
        fi
        return $ERR_DCG_BLOCKED
    fi

    return 0
}

# Status check - verify DCG is properly configured
dcg_status() {
    echo -e "${BLUE}🛡️  Destructive Command Guard Status${NC}"
    echo ""

    # Check installation
    if dcg_available; then
        echo -e "${GREEN}✅ DCG installed:${NC} $(dcg_version)"
    else
        echo -e "${RED}❌ DCG not installed${NC}"
        echo -e "   Install with: nix profile install .#dcg"
        return 1
    fi

    # Check config file
    if [[ -f ".dcg.toml" ]]; then
        echo -e "${GREEN}✅ Project config:${NC} .dcg.toml found"
    else
        echo -e "${YELLOW}⚠️  No project config${NC} - using defaults"
    fi

    # Check global config
    local global_config="${XDG_CONFIG_HOME:-$HOME/.config}/dcg/config.toml"
    if [[ -f "$global_config" ]]; then
        echo -e "${GREEN}✅ Global config:${NC} $global_config found"
    else
        echo -e "${YELLOW}⚠️  No global config${NC} - using defaults"
    fi

    # Test DCG is working
    echo ""
    echo -e "${BLUE}Testing DCG...${NC}"
    if dcg test "echo hello" &>/dev/null; then
        echo -e "${GREEN}✅ DCG is operational${NC}"
    else
        echo -e "${RED}❌ DCG test failed${NC}"
        return 1
    fi

    return 0
}

# Export functions
export -f dcg_available
export -f dcg_version
export -f dcg_test_command
export -f dcg_validate
export -f dcg_explain
export -f dcg_list_packs
export -f dcg_allowlist_add
export -f dcg_allowlist_remove
export -f dcg_allowlist_list
export -f dcg_check
export -f dcg_hook_check
export -f dcg_status

# If run directly, show status
if [[ "${BASH_SOURCE[0]:-$0}" == "${0}" ]]; then
    dcg_status
fi
