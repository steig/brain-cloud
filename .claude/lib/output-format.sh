#!/bin/bash
# LDC AI Framework - Output Formatting Library v1.0.0
# Standardized output for all slash commands
#
# Usage:
#   source .claude/lib/output-format.sh
#   cmd_header "commit" "Creating intelligent commit"
#   phase_start "Analysis" "Analyzing staged changes"
#   phase_done "Analysis" "Found 5 files"
#   cmd_summary "commit"

# ═══════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════

# Track command timing
declare -g CMD_START_TIME=""
declare -g CMD_NAME=""
declare -g CMD_PHASES=()
declare -g CMD_PHASE_TIMES=()

# Colors (if terminal supports)
if [[ -t 1 ]]; then
    BOLD='\033[1m'
    DIM='\033[2m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    RED='\033[0;31m'
    RESET='\033[0m'
else
    BOLD='' DIM='' GREEN='' YELLOW='' BLUE='' CYAN='' RED='' RESET=''
fi

# ═══════════════════════════════════════════════════════════════════
# Command Lifecycle
# ═══════════════════════════════════════════════════════════════════

# Start a command - shows header
# Usage: cmd_header "commit" "Creating intelligent commit"
cmd_header() {
    local cmd="$1"
    local description="$2"

    CMD_NAME="$cmd"
    CMD_START_TIME=$(date +%s)
    CMD_PHASES=()
    CMD_PHASE_TIMES=()

    echo ""
    echo "╭─────────────────────────────────────────────────────────────╮"
    echo "│  /${cmd}                                                     "
    echo "│  ${description}"
    echo "╰─────────────────────────────────────────────────────────────╯"
    echo ""
}

# Compact header for simpler commands
cmd_header_compact() {
    local cmd="$1"
    local description="$2"

    CMD_NAME="$cmd"
    CMD_START_TIME=$(date +%s)

    echo ""
    echo "▶ /${cmd} — ${description}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════
# Phase Tracking
# ═══════════════════════════════════════════════════════════════════

# Start a phase
# Usage: phase_start "Analysis" "Analyzing staged changes..."
phase_start() {
    local phase="$1"
    local description="${2:-}"

    local phase_start=$(date +%s)
    CMD_PHASES+=("$phase")
    CMD_PHASE_TIMES+=("$phase_start")

    if [[ -n "$description" ]]; then
        echo "┌─ ${phase}"
        echo "│  ${description}"
    else
        echo "┌─ ${phase}"
    fi
}

# Complete a phase
# Usage: phase_done "Analysis" "Found 5 files in 2 directories"
phase_done() {
    local phase="$1"
    local result="${2:-Done}"

    echo "└─ ✓ ${result}"
    echo ""
}

# Phase with spinner (for longer operations)
# Usage: phase_progress "Building" "Compiling TypeScript..."
phase_progress() {
    local phase="$1"
    local description="$2"

    echo "┌─ ${phase}"
    echo "│  ⟳ ${description}"
}

# Phase failed
# Usage: phase_fail "Build" "TypeScript compilation failed"
phase_fail() {
    local phase="$1"
    local error="$2"

    echo "└─ ✗ ${error}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════
# Status Indicators
# ═══════════════════════════════════════════════════════════════════

# Show a step within a phase
# Usage: step "Reading package.json"
step() {
    local message="$1"
    echo "│  → ${message}"
}

# Show a completed step
# Usage: step_done "Found 3 dependencies"
step_done() {
    local message="$1"
    echo "│  ✓ ${message}"
}

# Show a skipped step
# Usage: step_skip "No tests to run"
step_skip() {
    local message="$1"
    echo "│  ○ ${message}"
}

# Show a warning
# Usage: step_warn "Package outdated"
step_warn() {
    local message="$1"
    echo "│  ⚠ ${message}"
}

# Show an error
# Usage: step_error "Build failed"
step_error() {
    local message="$1"
    echo "│  ✗ ${message}"
}

# ═══════════════════════════════════════════════════════════════════
# Information Boxes
# ═══════════════════════════════════════════════════════════════════

# Info box
# Usage: info_box "Title" "Line 1" "Line 2"
info_box() {
    local title="$1"
    shift

    echo "┌─ ${title}"
    for line in "$@"; do
        echo "│  ${line}"
    done
    echo "└────"
}

# Result box (for final output)
# Usage: result_box "PR Created" "PR #42: Add login feature" "https://github.com/..."
result_box() {
    local title="$1"
    shift

    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║  ✓ ${title}"
    for line in "$@"; do
        echo "║    ${line}"
    done
    echo "╚═══════════════════════════════════════════════════════════════╝"
}

# Error box
# Usage: error_box "Build Failed" "Error in src/auth.ts:42"
error_box() {
    local title="$1"
    shift

    echo ""
    echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
    echo "┃  ✗ ${title}"
    for line in "$@"; do
        echo "┃    ${line}"
    done
    echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
}

# ═══════════════════════════════════════════════════════════════════
# Tables
# ═══════════════════════════════════════════════════════════════════

# Simple key-value table
# Usage: kv_table "Branch" "feature/login" "Files" "5" "Commits" "3"
kv_table() {
    echo "│"
    while [[ $# -gt 0 ]]; do
        local key="$1"
        local value="$2"
        printf "│  %-12s %s\n" "${key}:" "${value}"
        shift 2
    done
    echo "│"
}

# ═══════════════════════════════════════════════════════════════════
# Command Summary
# ═══════════════════════════════════════════════════════════════════

# Show command summary with timing
# Usage: cmd_summary
cmd_summary() {
    local status="${1:-success}"  # success, warning, error

    if [[ -z "$CMD_START_TIME" ]]; then
        return
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - CMD_START_TIME))

    local duration_str
    if [[ $duration -lt 60 ]]; then
        duration_str="${duration}s"
    else
        local mins=$((duration / 60))
        local secs=$((duration % 60))
        duration_str="${mins}m ${secs}s"
    fi

    echo ""
    case "$status" in
        success)
            echo "───────────────────────────────────────────────────────────────"
            echo "  ✓ /${CMD_NAME} completed in ${duration_str}"
            echo "───────────────────────────────────────────────────────────────"
            ;;
        warning)
            echo "───────────────────────────────────────────────────────────────"
            echo "  ⚠ /${CMD_NAME} completed with warnings in ${duration_str}"
            echo "───────────────────────────────────────────────────────────────"
            ;;
        error)
            echo "───────────────────────────────────────────────────────────────"
            echo "  ✗ /${CMD_NAME} failed after ${duration_str}"
            echo "───────────────────────────────────────────────────────────────"
            ;;
    esac
}

# ═══════════════════════════════════════════════════════════════════
# Progress Indicators
# ═══════════════════════════════════════════════════════════════════

# Show progress bar
# Usage: progress_bar 3 10 "Processing files"
progress_bar() {
    local current="$1"
    local total="$2"
    local label="${3:-Progress}"

    local percent=$((current * 100 / total))
    local filled=$((current * 20 / total))
    local empty=$((20 - filled))

    local bar=""
    for ((i=0; i<filled; i++)); do bar+="█"; done
    for ((i=0; i<empty; i++)); do bar+="░"; done

    printf "│  %s [%s] %d/%d (%d%%)\n" "$label" "$bar" "$current" "$total" "$percent"
}

# ═══════════════════════════════════════════════════════════════════
# Lists
# ═══════════════════════════════════════════════════════════════════

# Bullet list
# Usage: bullet_list "Item 1" "Item 2" "Item 3"
bullet_list() {
    for item in "$@"; do
        echo "  • ${item}"
    done
}

# Numbered list
# Usage: numbered_list "First" "Second" "Third"
numbered_list() {
    local i=1
    for item in "$@"; do
        echo "  ${i}. ${item}"
        ((i++))
    done
}

# Check list (with status)
# Usage: check_list "✓|Tests passing" "✓|Linting clean" "○|Docs updated"
check_list() {
    for item in "$@"; do
        local status="${item%%|*}"
        local text="${item#*|}"
        echo "  ${status} ${text}"
    done
}

# ═══════════════════════════════════════════════════════════════════
# Dividers
# ═══════════════════════════════════════════════════════════════════

divider() {
    echo "─────────────────────────────────────────────────────"
}

divider_double() {
    echo "═════════════════════════════════════════════════════"
}

divider_light() {
    echo "· · · · · · · · · · · · · · · · · · · · · · · · · · ·"
}

# ═══════════════════════════════════════════════════════════════════
# Quick Status Outputs
# ═══════════════════════════════════════════════════════════════════

# One-line status
status_line() {
    local icon="$1"
    local message="$2"
    echo "${icon} ${message}"
}

# Success line
ok() {
    echo "✓ $1"
}

# Warning line
warn() {
    echo "⚠ $1"
}

# Error line
err() {
    echo "✗ $1"
}

# Info line
info() {
    echo "ℹ $1"
}
