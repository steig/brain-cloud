#!/bin/bash
# Proactive Checks Library
# Part of LDC AI Framework v2.0.0 - Proactive Developer Experience
#
# This library provides reusable check functions for hooks.
# Each function outputs warnings/notices that Claude can act on.

# ============================================
# CONFIGURATION
# ============================================

WARN_FILE_SIZE=300       # Lines before warning about file size
STALE_BRANCH_DAYS=7      # Days before branch is considered stale
SESSION_GAP_HOURS=8      # Hours before showing "what changed"

# ============================================
# UTILITY FUNCTIONS
# ============================================

# Output a warning (Claude will see this)
warn() {
    echo "⚠️  $1"
}

# Output a notice (informational)
notice() {
    echo "ℹ️  $1"
}

# Output an alert (requires attention)
alert() {
    echo "🚨 $1"
}

# Output a suggestion
suggest() {
    echo "💡 $1"
}

# Get developer username
get_username() {
    if command -v gh &>/dev/null; then
        gh api user --jq '.login' 2>/dev/null && return
    fi
    git config user.name 2>/dev/null | tr ' ' '-' | tr '[:upper:]' '[:lower:]' || echo "${USER:-developer}"
}

# ============================================
# SESSION CHECKS
# ============================================

# Check when last session was
check_session_gap() {
    local session_dir=".ai/work/sessions/$(get_username)"
    local last_session=$(ls -t "$session_dir"/*.md 2>/dev/null | head -1)

    if [[ -z "$last_session" ]]; then
        # Check legacy location
        last_session=$(ls -t .ai/work/session-*.md 2>/dev/null | head -1)
    fi

    if [[ -n "$last_session" ]]; then
        local last_mod=$(stat -f '%m' "$last_session" 2>/dev/null || stat -c '%Y' "$last_session" 2>/dev/null)
        local now=$(date '+%s')
        local gap_hours=$(( (now - last_mod) / 3600 ))

        if [[ $gap_hours -ge $SESSION_GAP_HOURS ]]; then
            notice "Last session was $gap_hours hours ago"
            echo "SESSION_GAP=$gap_hours"
            return 0
        fi
    else
        notice "No previous session found"
        echo "SESSION_GAP=new"
    fi
    return 1
}

# ============================================
# GIT CHECKS
# ============================================

# Check for commits by others since last session
check_commits_since_session() {
    local session_dir=".ai/work/sessions/$(get_username)"
    local last_session=$(ls -t "$session_dir"/*.md 2>/dev/null | head -1)

    if [[ -z "$last_session" ]]; then
        last_session=$(ls -t .ai/work/session-*.md 2>/dev/null | head -1)
    fi

    if [[ -n "$last_session" ]]; then
        local last_mod=$(stat -f '%m' "$last_session" 2>/dev/null || stat -c '%Y' "$last_session" 2>/dev/null)
        local username=$(get_username)

        # Count commits by others
        local other_commits=$(git log --oneline --since="@$last_mod" --not --author="$username" 2>/dev/null | wc -l | tr -d ' ')

        if [[ $other_commits -gt 0 ]]; then
            warn "$other_commits commits by others since last session"

            # Show which files were touched
            local touched_files=$(git log --name-only --since="@$last_mod" --not --author="$username" --format="" 2>/dev/null | sort -u | head -5)
            if [[ -n "$touched_files" ]]; then
                echo "Files changed by others:"
                echo "$touched_files" | sed 's/^/  /'
            fi
        fi
    fi
}

# Check for stale branches
check_stale_branches() {
    local stale_count=0

    while IFS='|' read -r branch date; do
        if [[ "$date" == *"week"* ]] || [[ "$date" == *"month"* ]] || [[ "$date" == *"year"* ]]; then
            if [[ $stale_count -eq 0 ]]; then
                warn "Stale branches detected:"
            fi
            echo "  $branch ($date)"
            ((stale_count++))
        fi
    done < <(git for-each-ref --sort=-committerdate --format='%(refname:short)|%(committerdate:relative)' refs/heads/)

    if [[ $stale_count -gt 0 ]]; then
        suggest "Consider cleaning up $stale_count stale branches"
    fi
}

# Check for uncommitted changes
check_uncommitted() {
    local uncommitted=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

    if [[ $uncommitted -gt 0 ]]; then
        notice "$uncommitted uncommitted changes in working directory"
    fi
}

# Check if current branch is behind remote
check_branch_sync() {
    local tracking=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)

    if [[ -n "$tracking" ]]; then
        local behind=$(git rev-list --count HEAD..@{u} 2>/dev/null)

        if [[ $behind -gt 0 ]]; then
            warn "Current branch is $behind commits behind $tracking"
            suggest "Consider pulling latest changes"
        fi
    fi
}

# ============================================
# FILE CHECKS
# ============================================

# Check if a file is getting too large
check_file_size() {
    local file="$1"

    if [[ -f "$file" ]]; then
        local lines=$(wc -l < "$file" | tr -d ' ')

        if [[ $lines -gt $WARN_FILE_SIZE ]]; then
            warn "$file is $lines lines (>${WARN_FILE_SIZE})"
            suggest "Consider splitting into smaller modules"
        fi
    fi
}

# Check all modified files for size
check_modified_file_sizes() {
    local modified_files=$(git diff --name-only 2>/dev/null)

    for file in $modified_files; do
        check_file_size "$file"
    done
}

# Check if tests were updated for modified source files
check_test_coverage() {
    local modified_files=$(git diff --cached --name-only 2>/dev/null)

    for file in $modified_files; do
        # Skip if it's already a test file
        if [[ "$file" == *".test."* ]] || [[ "$file" == *".spec."* ]] || [[ "$file" == *"_test."* ]]; then
            continue
        fi

        # Check if it's a source file that should have tests
        if [[ "$file" == *.ts ]] || [[ "$file" == *.tsx ]] || [[ "$file" == *.js ]] || [[ "$file" == *.jsx ]] || [[ "$file" == *.py ]]; then
            local test_file="${file%.*}.test.${file##*.}"
            local spec_file="${file%.*}.spec.${file##*.}"

            if [[ -f "$test_file" ]] || [[ -f "$spec_file" ]]; then
                # Test file exists, check if it was also modified
                if ! echo "$modified_files" | grep -q "$test_file\|$spec_file"; then
                    warn "Modified $file but not its test file"
                    suggest "Consider updating tests for $file"
                fi
            fi
        fi
    done
}

# ============================================
# GITHUB CHECKS
# ============================================

# Check for PRs needing review
check_prs_needing_review() {
    if command -v gh &>/dev/null; then
        local prs=$(gh pr list --search "review-requested:@me" --json number,title --jq 'length' 2>/dev/null)

        if [[ -n "$prs" ]] && [[ $prs -gt 0 ]]; then
            notice "$prs PRs waiting for your review"
        fi
    fi
}

# Check for blocked issues
check_blocked_issues() {
    if command -v gh &>/dev/null; then
        local blocked=$(gh issue list --assignee="@me" --label="blocked" --json number --jq 'length' 2>/dev/null)

        if [[ -n "$blocked" ]] && [[ $blocked -gt 0 ]]; then
            alert "$blocked of your issues are blocked"
        fi
    fi
}

# ============================================
# WORK LOG CHECKS
# ============================================

# Check for in-progress work logs
check_active_work_logs() {
    local in_progress=0
    local blocked=0

    for log_file in .ai/work/issues/*.md .ai/work/issue-*.md; do
        if [[ -f "$log_file" ]]; then
            local status=$(grep -m1 '^\*\*Status\*\*:' "$log_file" | sed 's/.*: //')

            if [[ "$status" == *"in-progress"* ]]; then
                ((in_progress++))
            elif [[ "$status" == *"blocked"* ]]; then
                ((blocked++))
            fi
        fi
    done

    if [[ $in_progress -gt 0 ]]; then
        notice "$in_progress issues in progress"
    fi

    if [[ $blocked -gt 0 ]]; then
        alert "$blocked issues are blocked"
    fi
}

# ============================================
# WORKTREE CHECKS (Inspired by Superpowers)
# ============================================

# Check if we're currently in a git worktree
check_worktree_context() {
    local git_dir=$(git rev-parse --git-dir 2>/dev/null)

    if [[ "$git_dir" == *".git/worktrees"* ]]; then
        local worktree_name=$(basename "$(dirname "$git_dir")")
        notice "Working in worktree: $worktree_name"

        # Show linked issue if identifiable from branch name
        local branch=$(git branch --show-current 2>/dev/null)
        if [[ "$branch" =~ issue-([0-9]+) ]]; then
            local issue_num="${BASH_REMATCH[1]}"
            notice "Linked to GitHub issue #$issue_num"
            echo "WORKTREE_ISSUE=$issue_num"
        fi

        echo "IN_WORKTREE=true"
        return 0
    fi

    echo "IN_WORKTREE=false"
    return 1
}

# Suggest worktree when starting new task with uncommitted changes
suggest_worktree_for_new_task() {
    local current_branch=$(git branch --show-current 2>/dev/null)

    # Check if not on main/master and has uncommitted changes
    if [[ "$current_branch" != "main" && "$current_branch" != "master" ]]; then
        local uncommitted=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

        if [[ $uncommitted -gt 0 ]]; then
            suggest "Current branch has uncommitted changes"
            suggest "Consider using /worktree_task for new work to avoid context mixing"
        fi
    fi
}

# Detect multiple in-progress tasks (potential worktree candidate)
check_task_switching() {
    local work_log_count=0

    # Count in-progress work logs
    for log_file in .ai/work/issues/*.md .ai/work/issue-*.md; do
        if [[ -f "$log_file" ]]; then
            local status=$(grep -m1 '^\*\*Status\*\*:' "$log_file" 2>/dev/null | sed 's/.*: //')
            if [[ "$status" == *"in-progress"* ]]; then
                ((work_log_count++))
            fi
        fi
    done

    if [[ $work_log_count -gt 2 ]]; then
        warn "Multiple issues being worked on simultaneously ($work_log_count)"
        suggest "Consider using git worktrees for parallel development"
        suggest "Run: /worktree_task --list to see current worktrees"
    fi
}

# List active worktrees
list_active_worktrees() {
    if git worktree list &>/dev/null; then
        local worktree_count=$(git worktree list | wc -l | tr -d ' ')

        if [[ $worktree_count -gt 1 ]]; then
            notice "$worktree_count git worktrees active:"
            git worktree list | tail -n +2 | while read -r worktree; do
                echo "  $worktree"
            done
        fi
    fi
}

# Check for worktrees with merged branches (cleanup candidates)
check_worktree_cleanup() {
    if git worktree list &>/dev/null; then
        local main_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
        main_branch=${main_branch:-main}

        git worktree list --porcelain | grep "^worktree " | cut -d' ' -f2- | while read -r worktree_path; do
            if [[ "$worktree_path" != "$(git rev-parse --show-toplevel)" ]]; then
                local branch=$(git -C "$worktree_path" branch --show-current 2>/dev/null)

                if [[ -n "$branch" ]]; then
                    # Check if branch is merged into main
                    if git branch --merged "$main_branch" 2>/dev/null | grep -q "^\s*$branch$"; then
                        suggest "Worktree '$branch' appears merged and can be cleaned up"
                        suggest "Run: /worktree_task --cleanup $branch"
                    fi
                fi
            fi
        done
    fi
}

# ============================================
# COMPOSITE CHECKS
# ============================================

# Run all session start checks
run_session_start_checks() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 PROACTIVE CHECKS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    check_session_gap
    check_commits_since_session
    check_stale_branches
    check_uncommitted
    check_branch_sync
    check_prs_needing_review
    check_blocked_issues
    check_active_work_logs

    # Worktree checks (Superpowers-inspired)
    check_worktree_context
    check_task_switching
    list_active_worktrees
    check_worktree_cleanup

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Run pre-commit checks
run_pre_commit_checks() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 PRE-COMMIT CHECKS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    check_modified_file_sizes
    check_test_coverage

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}
