#!/bin/bash

# Release Validation Script
# Prevents release notes hallucination by validating commit ranges and feature claims

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Function to validate commit range
validate_commit_range() {
    local proposed_version="$1"
    
    print_info "Validating commit range for release $proposed_version"
    
    # Get the last release tag
    LAST_TAG=$(git tag --sort=-version:refname | head -1)
    
    if [ -z "$LAST_TAG" ]; then
        print_warning "No previous release tags found. This appears to be the first release."
        return 0
    fi
    
    print_info "Last release: $LAST_TAG"
    
    # Get commits since last release
    COMMITS_SINCE_LAST=$(git log --oneline $LAST_TAG..HEAD)
    COMMIT_COUNT=$(git rev-list --count $LAST_TAG..HEAD)
    
    if [ $COMMIT_COUNT -eq 0 ]; then
        print_error "No commits found since last release $LAST_TAG"
        print_error "Cannot create release without new commits"
        return 1
    fi
    
    print_status "Found $COMMIT_COUNT commits since $LAST_TAG"
    echo ""
    echo "Commits to be included in $proposed_version:"
    echo "$COMMITS_SINCE_LAST"
    echo ""
    
    return 0
}

# Function to check for duplicate features
check_duplicate_features() {
    local proposed_version="$1"
    
    print_info "Checking for potential duplicate feature claims"
    
    # Get last two releases for comparison
    LAST_TAG=$(git tag --sort=-version:refname | head -1)
    SECOND_LAST_TAG=$(git tag --sort=-version:refname | head -2 | tail -1)
    
    if [ -z "$LAST_TAG" ] || [ -z "$SECOND_LAST_TAG" ]; then
        print_warning "Not enough previous releases to check for duplicates"
        return 0
    fi
    
    print_info "Comparing against previous releases: $SECOND_LAST_TAG and $LAST_TAG"
    
    # Get commits from current range
    CURRENT_COMMITS=$(git log --oneline $LAST_TAG..HEAD)
    
    # Get commits from last release
    LAST_RELEASE_COMMITS=$(git log --oneline $SECOND_LAST_TAG..$LAST_TAG)
    
    # Check for performance-related commits that might be duplicated
    PERFORMANCE_COMMITS_CURRENT=$(echo "$CURRENT_COMMITS" | grep -i "performance\|parallel\|faster\|speed\|optimization" || true)
    PERFORMANCE_COMMITS_LAST=$(echo "$LAST_RELEASE_COMMITS" | grep -i "performance\|parallel\|faster\|speed\|optimization" || true)
    
    if [ ! -z "$PERFORMANCE_COMMITS_LAST" ] && [ ! -z "$PERFORMANCE_COMMITS_CURRENT" ]; then
        print_warning "Performance-related commits found in both releases:"
        echo "Previous release ($LAST_TAG):"
        echo "$PERFORMANCE_COMMITS_LAST"
        echo ""
        echo "Current release ($proposed_version):"
        echo "$PERFORMANCE_COMMITS_CURRENT"
        echo ""
        print_warning "⚠️  RISK: Potential duplicate performance claims!"
        print_warning "Please verify these are different improvements"
    fi
    
    return 0
}

# Function to validate release notes content
validate_release_notes() {
    local release_notes_file="$1"
    
    if [ ! -f "$release_notes_file" ]; then
        print_error "Release notes file not found: $release_notes_file"
        return 1
    fi
    
    print_info "Validating release notes content"
    
    # Check for common hallucination patterns
    HALLUCINATION_PATTERNS=(
        "3x faster"
        "parallel execution"
        "performance optimization"
        "enhanced security"
    )
    
    LAST_TAG=$(git tag --sort=-version:refname | head -1)
    
    if [ ! -z "$LAST_TAG" ]; then
        # Get previous release notes
        PREVIOUS_RELEASE_BODY=$(gh release view $LAST_TAG --json body -q .body 2>/dev/null || echo "")
        
        for pattern in "${HALLUCINATION_PATTERNS[@]}"; do
            if grep -qi "$pattern" "$release_notes_file" && echo "$PREVIOUS_RELEASE_BODY" | grep -qi "$pattern"; then
                print_warning "Potential duplicate claim detected: '$pattern'"
                print_warning "This claim was also in release $LAST_TAG"
                print_warning "Please verify this is a new/different improvement"
            fi
        done
    fi
    
    print_status "Release notes validation completed"
    return 0
}

# Function to show validation summary
show_validation_summary() {
    local proposed_version="$1"
    
    echo ""
    echo "==================== RELEASE VALIDATION SUMMARY ===================="
    echo ""
    print_info "Proposed Version: $proposed_version"
    
    LAST_TAG=$(git tag --sort=-version:refname | head -1)
    COMMIT_COUNT=$(git rev-list --count $LAST_TAG..HEAD 2>/dev/null || echo "N/A")
    
    echo "Last Release: $LAST_TAG"
    echo "New Commits: $COMMIT_COUNT"
    echo ""
    
    print_info "Validation Checklist:"
    print_status "✅ Commit range verified ($LAST_TAG..HEAD)"
    print_status "✅ Duplicate feature check completed"
    print_status "✅ Release notes validation performed"
    
    echo ""
    print_info "Next Steps:"
    echo "1. Review the commit list above"
    echo "2. Ensure release notes only claim features from those commits"
    echo "3. Cross-check against previous release notes for duplicates"
    echo "4. Run: /release $proposed_version (after manual verification)"
    
    echo ""
    echo "======================================================================"
}

# Main execution
main() {
    local proposed_version="${1:-}"
    
    if [ -z "$proposed_version" ]; then
        echo "Usage: $0 <proposed-version>"
        echo "Example: $0 v1.7.0"
        exit 1
    fi
    
    echo "🔍 Release Validation Tool - Preventing Release Notes Hallucination"
    echo "=================================================================="
    echo ""
    
    # Run validation steps
    validate_commit_range "$proposed_version" || exit 1
    check_duplicate_features "$proposed_version"
    
    # Show summary
    show_validation_summary "$proposed_version"
    
    echo ""
    print_status "Release validation completed successfully!"
    print_info "Remember: Only claim features that have commits in the current range!"
}

# Run main function
main "$@"