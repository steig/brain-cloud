#!/bin/bash
# =============================================================================
# Documentation Organization Migration Script
# Part of LDC AI Framework - ADR-001 Implementation
# =============================================================================
#
# This script organizes scattered documentation files into the standardized
# structure defined in ADR-001. It creates backups before any moves.
#
# Usage:
#   ./organize-docs.sh           # Run migration with prompts
#   ./organize-docs.sh --dry-run # Show what would be done without making changes
#   ./organize-docs.sh --force   # Run without confirmation prompts
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCS_ROOT=".ai/docs"
SPRINTS_DIR="$DOCS_ROOT/sprints"
ARCH_DIR="$DOCS_ROOT/architecture"
OPS_DIR="$DOCS_ROOT/operations"
PROFILES_DIR=".ai/profiles"
BACKUP_DIR=".ai/.backup/$(date +%Y%m%d_%H%M%S)"

# Parse arguments
DRY_RUN=false
FORCE=false
for arg in "$@"; do
    case $arg in
        --dry-run) DRY_RUN=true ;;
        --force) FORCE=true ;;
        --help|-h)
            echo "Usage: $0 [--dry-run] [--force]"
            echo "  --dry-run  Show what would be done without making changes"
            echo "  --force    Run without confirmation prompts"
            exit 0
            ;;
    esac
done

# Helper functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

safe_move() {
    local src="$1"
    local dest_dir="$2"
    local dest_name="${3:-$(basename "$src")}"
    
    if [[ ! -f "$src" ]]; then
        log_warning "Source file not found: $src"
        return 1
    fi
    
    if $DRY_RUN; then
        echo "  Would move: $src → $dest_dir/$dest_name"
        return 0
    fi
    
    mkdir -p "$dest_dir"
    mv "$src" "$dest_dir/$dest_name"
    log_success "Moved: $src → $dest_dir/$dest_name"
}

# =============================================================================
# Main Migration Logic
# =============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📚 LDC AI Framework - Documentation Organization Migration"
echo "  ADR-001 Implementation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if $DRY_RUN; then
    log_warning "DRY RUN MODE - No changes will be made"
    echo ""
fi

# Step 1: Create backup directory
if ! $DRY_RUN; then
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Step 2: Create directory structure
log_info "Creating directory structure..."

DIRS=(
    "$DOCS_ROOT/architecture/decisions"
    "$DOCS_ROOT/architecture/designs"
    "$DOCS_ROOT/architecture/diagrams"
    "$DOCS_ROOT/sprints/v1.12.0/implementations"
    "$DOCS_ROOT/sprints/v1.13.0/implementations"
    "$DOCS_ROOT/sprints/v1.14.0/implementations"
    "$DOCS_ROOT/guides"
    "$DOCS_ROOT/references"
    "$DOCS_ROOT/operations/troubleshooting"
    "$PROFILES_DIR/shopify/templates"
    "$PROFILES_DIR/shopify/workflows"
    "$PROFILES_DIR/react/templates"
    "$PROFILES_DIR/react/workflows"
    "$PROFILES_DIR/nextjs"
    "$PROFILES_DIR/python"
    "$PROFILES_DIR/vanilla-js"
    ".claude/test/scripts"
)

for dir in "${DIRS[@]}"; do
    if $DRY_RUN; then
        [[ ! -d "$dir" ]] && echo "  Would create: $dir"
    else
        mkdir -p "$dir"
    fi
done
log_success "Directory structure ready"

# Step 3: Move root-level documentation files
echo ""
log_info "Moving root-level documentation files..."

# Implementation reports → sprints/v1.12.0/implementations/
safe_move "RELEASE_HALLUCINATION_FIX.md" "$SPRINTS_DIR/v1.12.0/implementations"
safe_move "SECURITY_IMPROVEMENTS.md" "$SPRINTS_DIR/v1.12.0/implementations"

# Design documents → architecture/designs/
safe_move "enhanced-workflow-with-code-review.md" "$ARCH_DIR/designs"

# Operational docs → operations/troubleshooting/
safe_move "TROUBLESHOOTING.md" "$OPS_DIR/troubleshooting"

# Step 4: Move test scripts
echo ""
log_info "Moving test scripts..."

safe_move "bug_reproduction_test.sh" ".claude/test/scripts"
safe_move "test-github-labels-bug.sh" ".claude/test/scripts"

# Step 5: Merge .ai/.docs if exists
echo ""
if [[ -d ".ai/.docs" ]]; then
    log_info "Merging .ai/.docs into .ai/docs..."
    
    if $DRY_RUN; then
        echo "  Would merge .ai/.docs/* → .ai/docs/"
        echo "  Would backup .ai/.docs → $BACKUP_DIR/.docs-backup"
    else
        # Copy contents (don't overwrite existing)
        cp -rn .ai/.docs/* .ai/docs/ 2>/dev/null || true
        # Backup original
        mv .ai/.docs "$BACKUP_DIR/.docs-backup"
        log_success "Merged and backed up .ai/.docs"
    fi
else
    log_info ".ai/.docs not found, skipping merge"
fi

# Step 6: Merge .claude/docs/user-guides if exists
if [[ -d ".claude/docs/user-guides" ]]; then
    log_info "Merging .claude/docs/user-guides into .ai/docs/guides..."
    
    if $DRY_RUN; then
        echo "  Would merge .claude/docs/user-guides/* → .ai/docs/guides/"
    else
        cp -rn .claude/docs/user-guides/* .ai/docs/guides/ 2>/dev/null || true
        log_success "Merged .claude/docs/user-guides"
    fi
fi

# Step 7: Create current-sprint symlink
echo ""
log_info "Creating current-sprint symlink..."

CURRENT_VERSION="v1.15.0"
if $DRY_RUN; then
    echo "  Would create symlink: .ai/current-sprint → docs/sprints/$CURRENT_VERSION"
else
    cd .ai && ln -sfn "docs/sprints/$CURRENT_VERSION" "current-sprint" && cd ..
    log_success "Created symlink: .ai/current-sprint → $CURRENT_VERSION"
fi

# Step 8: Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if $DRY_RUN; then
    log_warning "DRY RUN COMPLETE - No changes were made"
    echo ""
    echo "Run without --dry-run to apply changes"
else
    log_success "Migration complete!"
    echo ""
    echo "📁 Backup stored at: $BACKUP_DIR"
    echo ""
    echo "📋 New structure:"
    echo "   .ai/docs/                  - Unified documentation root"
    echo "   .ai/docs/architecture/     - ADRs and design documents"
    echo "   .ai/docs/sprints/          - Version-based sprint artifacts"
    echo "   .ai/docs/operations/       - Operational documentation"
    echo "   .ai/profiles/              - Project-type profiles"
    echo "   .ai/current-sprint         - Symlink to current sprint"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Review migrated files in .ai/docs/"
    echo "   2. Run 'git status' to see changes"
    echo "   3. Commit the migration with /commit"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
