#!/bin/bash
# Documentation Management Utilities
# Part of LDC AI Framework v2.0.0
# Provides functions for managing documentation artifacts

DOCS_ROOT=".ai/docs"
SPRINTS_DIR="$DOCS_ROOT/sprints"
ARCH_DIR="$DOCS_ROOT/architecture"
ADR_DIR="$ARCH_DIR/decisions"
GUIDES_DIR="$DOCS_ROOT/guides"
OPS_DIR="$DOCS_ROOT/operations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current sprint version from git tags or default
get_current_sprint_version() {
    # Try to get from git tags
    local latest_tag
    latest_tag=$(git describe --tags --abbrev=0 2>/dev/null)
    
    if [[ -n "$latest_tag" ]]; then
        # Extract version number (handle both v1.14.0 and 1.14.0 formats)
        echo "$latest_tag" | sed 's/^v/v/'
    else
        # Default version if no tags exist
        echo "v1.0.0"
    fi
}

# Get next version (increment patch by default)
get_next_version() {
    local current_version="${1:-$(get_current_sprint_version)}"
    local increment_type="${2:-patch}"  # major, minor, or patch
    
    # Remove 'v' prefix for calculation
    local version="${current_version#v}"
    
    # Parse version components
    local major minor patch
    IFS='.' read -r major minor patch <<< "$version"
    
    case "$increment_type" in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
    esac
    
    echo "v${major}.${minor}.${patch}"
}

# Get next ADR number
get_next_adr_number() {
    local max_num=0
    
    # Ensure ADR directory exists
    mkdir -p "$ADR_DIR"
    
    for adr in "$ADR_DIR"/ADR-*.md; do
        if [[ -f "$adr" ]]; then
            # Extract number from filename (ADR-001-xxx.md -> 001)
            local num
            num=$(basename "$adr" | sed -n 's/ADR-\([0-9]*\).*/\1/p')
            num=$((10#$num))  # Convert to decimal (handles leading zeros)
            if [[ $num -gt $max_num ]]; then
                max_num=$num
            fi
        fi
    done
    
    # Return next number with leading zeros
    printf "%03d" $((max_num + 1))
}

# Create slug from title (for filenames)
slugify() {
    local text="$1"
    echo "$text" | \
        tr '[:upper:]' '[:lower:]' | \
        sed 's/[^a-z0-9]/-/g' | \
        sed 's/--*/-/g' | \
        sed 's/^-\|-$//g' | \
        cut -c1-50
}

# Get documentation path for a given type
get_doc_path() {
    local doc_type="$1"
    local version="${2:-$(get_current_sprint_version)}"
    
    case "$doc_type" in
        "implementation"|"impl")
            echo "$SPRINTS_DIR/$version/implementations/"
            ;;
        "adr"|"decision")
            echo "$ADR_DIR/"
            ;;
        "design")
            echo "$ARCH_DIR/designs/"
            ;;
        "diagram")
            echo "$ARCH_DIR/diagrams/"
            ;;
        "troubleshooting"|"trouble")
            echo "$OPS_DIR/troubleshooting/"
            ;;
        "guide")
            echo "$GUIDES_DIR/"
            ;;
        "reference"|"ref")
            echo "$DOCS_ROOT/references/"
            ;;
        "sprint")
            echo "$SPRINTS_DIR/$version/"
            ;;
        *)
            echo "$DOCS_ROOT/"
            ;;
    esac
}

# Ensure documentation directories exist
ensure_doc_dirs() {
    mkdir -p "$ADR_DIR"
    mkdir -p "$ARCH_DIR/designs"
    mkdir -p "$ARCH_DIR/diagrams"
    mkdir -p "$GUIDES_DIR"
    mkdir -p "$OPS_DIR/troubleshooting"
    mkdir -p "$DOCS_ROOT/references"
    mkdir -p "$DOCS_ROOT/templates"
}

# Save implementation report
save_implementation_report() {
    local issue_number="$1"
    local title="$2"
    local content="$3"
    local version="${4:-$(get_current_sprint_version)}"
    
    local slug=$(slugify "$title")
    local report_dir="$SPRINTS_DIR/$version/implementations"
    local report_path="$report_dir/issue-${issue_number}-${slug}.md"
    
    # Ensure directory exists
    mkdir -p "$report_dir"
    
    # Write content
    echo "$content" > "$report_path"
    
    echo -e "${GREEN}✅ Implementation report saved: ${report_path}${NC}"
    echo "$report_path"
}

# Generate implementation report template
generate_implementation_report() {
    local issue_number="$1"
    local task_title="$2"
    local summary="${3:-Task completed successfully.}"
    local changes="${4:-See git log for details}"
    local decisions="${5:-Standard implementation following existing patterns.}"
    local testing="${6:-Verified functionality manually.}"
    local notes="${7:-No additional notes.}"
    
    local version=$(get_current_sprint_version)
    local branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    local date=$(date +%Y-%m-%d)
    
    cat << EOF
# Implementation Report: Issue #${issue_number}

**Task**: ${task_title}
**Sprint**: ${version}
**Date**: ${date}
**Status**: ✅ Complete
**Branch**: ${branch}

## Summary

${summary}

## Changes Made

${changes}

## Key Decisions

${decisions}

## Testing

${testing}

## Notes

${notes}

---
*Generated by LDC AI Framework*
EOF
}

# Save ADR document
save_adr() {
    local title="$1"
    local content="$2"
    
    local number=$(get_next_adr_number)
    local slug=$(slugify "$title")
    local adr_path="$ADR_DIR/ADR-${number}-${slug}.md"
    
    # Ensure directory exists
    mkdir -p "$ADR_DIR"
    
    # Write content
    echo "$content" > "$adr_path"
    
    echo -e "${GREEN}✅ ADR saved: ${adr_path}${NC}"
    echo "$adr_path"
}

# List existing ADRs
list_adrs() {
    echo -e "${BLUE}📋 Architectural Decision Records:${NC}"
    
    if [[ ! -d "$ADR_DIR" ]]; then
        echo "  No ADRs found."
        return
    fi
    
    for adr in "$ADR_DIR"/ADR-*.md; do
        if [[ -f "$adr" && "$(basename "$adr")" != "ADR-TEMPLATE.md" ]]; then
            local filename=$(basename "$adr" .md)
            local title=$(head -1 "$adr" | sed 's/^# //')
            local adr_status=$(grep -m1 "^\*\*Status\*\*:" "$adr" | sed 's/\*\*Status\*\*: //' || echo "Unknown")
            echo -e "  • ${GREEN}$filename${NC}"
            echo "    $title"
            echo "    Status: $adr_status"
            echo ""
        fi
    done
}

# Create sprint summary
create_sprint_summary() {
    local version="$1"
    local summary_path="$SPRINTS_DIR/$version/SPRINT-SUMMARY.md"
    
    # Ensure directory exists
    mkdir -p "$SPRINTS_DIR/$version/implementations"
    
    # Get implementations list
    local implementations=""
    if [[ -d "$SPRINTS_DIR/$version/implementations" ]]; then
        implementations=$(ls -1 "$SPRINTS_DIR/$version/implementations/" 2>/dev/null | sed 's/^/- /' || echo "No implementations yet")
    fi
    
    cat > "$summary_path" << EOF
# Sprint Summary: $version

**Status**: 🔄 Active
**Started**: $(date +%Y-%m-%d)
**Completed**: TBD

## Highlights

- [ ] Key accomplishment 1
- [ ] Key accomplishment 2

## Implementations

$implementations

## Issues Resolved

- Issue #XXX: Description

## Notes

Sprint notes and observations.

---
*Auto-generated by LDC AI Framework*
EOF
    
    echo -e "${GREEN}✅ Sprint summary created: ${summary_path}${NC}"
    echo "$summary_path"
}

# Update sprint summary status to released
finalize_sprint() {
    local version="$1"
    local summary_path="$SPRINTS_DIR/$version/SPRINT-SUMMARY.md"
    
    if [[ -f "$summary_path" ]]; then
        # Update status
        sed -i '' "s/Status: 🔄 Active/Status: ✅ Released/" "$summary_path" 2>/dev/null || \
        sed -i "s/Status: 🔄 Active/Status: ✅ Released/" "$summary_path"
        
        # Update completion date
        sed -i '' "s/Completed: TBD/Completed: $(date +%Y-%m-%d)/" "$summary_path" 2>/dev/null || \
        sed -i "s/Completed: TBD/Completed: $(date +%Y-%m-%d)/" "$summary_path"
        
        echo -e "${GREEN}✅ Sprint $version finalized${NC}"
    else
        echo -e "${YELLOW}⚠️ No sprint summary found for $version${NC}"
    fi
}

# Update current sprint symlink
update_current_sprint_symlink() {
    local version="$1"
    local symlink_path=".ai/current-sprint"
    
    # Ensure sprint directory exists
    mkdir -p "$SPRINTS_DIR/$version"
    
    # Remove old symlink and create new one
    rm -f "$symlink_path"
    ln -sfn "docs/sprints/$version" "$symlink_path"
    
    echo -e "${GREEN}✅ Current sprint symlink updated to $version${NC}"
}

# Get list of sprint versions
list_sprints() {
    echo -e "${BLUE}📅 Sprint Versions:${NC}"
    
    if [[ ! -d "$SPRINTS_DIR" ]]; then
        echo "  No sprints found."
        return
    fi
    
    for sprint_dir in "$SPRINTS_DIR"/v*/; do
        if [[ -d "$sprint_dir" ]]; then
            local version=$(basename "$sprint_dir")
            local status="🔄 Active"
            
            if [[ -f "${sprint_dir}SPRINT-SUMMARY.md" ]]; then
                if grep -q "Status: ✅ Released" "${sprint_dir}SPRINT-SUMMARY.md" 2>/dev/null; then
                    status="✅ Released"
                fi
            fi
            
            echo -e "  • ${GREEN}$version${NC} - $status"
        fi
    done
}

# Export functions
export -f get_current_sprint_version
export -f get_next_version
export -f get_next_adr_number
export -f slugify
export -f get_doc_path
export -f ensure_doc_dirs
export -f save_implementation_report
export -f generate_implementation_report
export -f save_adr
export -f list_adrs
export -f create_sprint_summary
export -f finalize_sprint
export -f update_current_sprint_symlink
export -f list_sprints
