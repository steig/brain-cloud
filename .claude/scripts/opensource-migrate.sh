#!/bin/bash
# Open Source Migration Script
# Prepares the framework for open source release by:
# 1. Replacing personal branding with configurable values
# 2. Making org references configurable via environment variables
# 3. Cleaning up dead code and deprecated references

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration - SET THESE BEFORE RUNNING
NEW_PROJECT_NAME="${NEW_PROJECT_NAME:-ai-dev-framework}"
NEW_GITHUB_ORG="${NEW_GITHUB_ORG:-your-org}"
NEW_GITHUB_REPO="${NEW_GITHUB_REPO:-ai-dev-framework}"
NEW_DOCS_DOMAIN="${NEW_DOCS_DOMAIN:-your-org.github.io}"
DRY_RUN="${DRY_RUN:-true}"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Open Source Migration Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Project Root: ${GREEN}$PROJECT_ROOT${NC}"
echo -e "New Project Name: ${GREEN}$NEW_PROJECT_NAME${NC}"
echo -e "New GitHub Org: ${GREEN}$NEW_GITHUB_ORG${NC}"
echo -e "Dry Run: ${YELLOW}$DRY_RUN${NC}"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}⚠️  DRY RUN MODE - No changes will be made${NC}"
    echo -e "${YELLOW}   Set DRY_RUN=false to apply changes${NC}"
    echo ""
fi

# Helper function for sed (cross-platform)
sed_inplace() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$@"
    else
        sed -i "$@"
    fi
}

# Helper to replace in files
replace_in_file() {
    local file="$1"
    local from="$2"
    local to="$3"

    if grep -q "$from" "$file" 2>/dev/null; then
        if [[ "$DRY_RUN" == "true" ]]; then
            echo -e "  ${YELLOW}[DRY]${NC} Would replace '$from' → '$to' in $file"
        else
            sed_inplace "s|$from|$to|g" "$file"
            echo -e "  ${GREEN}[OK]${NC} Replaced '$from' → '$to' in $file"
        fi
        return 0
    fi
    return 1
}

# Helper to replace in all files matching pattern
replace_in_files() {
    local pattern="$1"
    local from="$2"
    local to="$3"
    local count=0

    while IFS= read -r -d '' file; do
        if replace_in_file "$file" "$from" "$to"; then
            ((count++))
        fi
    done < <(find "$PROJECT_ROOT" -type f -name "$pattern" -print0 2>/dev/null)

    return $count
}

# ============================================
# PHASE 1: Make Organizations Configurable
# ============================================
phase1_fix_orgs() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Phase 1: Making Organizations Configurable${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Fix lampscom references in adhoc commands
    echo ""
    echo -e "${YELLOW}Fixing lampscom org references...${NC}"

    local adhoc_files=(
        "$PROJECT_ROOT/.claude/commands/adhoc.md"
        "$PROJECT_ROOT/.claude/commands/adhoc_jawn.md"
        "$PROJECT_ROOT/.claude/commands/create_task.md"
        "$PROJECT_ROOT/.claude/commands/create_bug.md"
    )

    for file in "${adhoc_files[@]}"; do
        if [[ -f "$file" ]]; then
            replace_in_file "$file" '--owner lampscom' '--owner ${GITHUB_ORG:-your-org}'
            replace_in_file "$file" 'lampscom/jawns' '${ADHOC_REPO:-your-org/adhoc-requests}'
            replace_in_file "$file" 'lampscom/projects' '${PROJECT_BOARD:-your-org/projects}'
        fi
    done

    # Fix @owloops references
    echo ""
    echo -e "${YELLOW}Fixing @owloops package references...${NC}"

    if [[ -f "$PROJECT_ROOT/.claude/settings.local.json" ]]; then
        replace_in_file "$PROJECT_ROOT/.claude/settings.local.json" '@owloops/claude-powerline' '${STATUSLINE_PACKAGE:-@owloops/claude-powerline}'
    fi

    if [[ -f "$PROJECT_ROOT/.claude/commands/statusline.md" ]]; then
        replace_in_file "$PROJECT_ROOT/.claude/commands/statusline.md" '@owloops/claude-powerline' '@owloops/claude-powerline (or your custom package)'
    fi
}

# ============================================
# PHASE 2: Replace Personal Branding
# ============================================
phase2_fix_branding() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Phase 2: Replacing Personal Branding${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Replace steig.github.io
    echo ""
    echo -e "${YELLOW}Fixing GitHub Pages URLs...${NC}"

    find "$PROJECT_ROOT" -type f \( -name "*.md" -o -name "*.ts" -o -name "*.json" \) -print0 2>/dev/null | while IFS= read -r -d '' file; do
        replace_in_file "$file" 'steig.github.io/nixos-config' "$NEW_DOCS_DOMAIN/$NEW_GITHUB_REPO" 2>/dev/null || true
        replace_in_file "$file" 'steig.github.io' "$NEW_DOCS_DOMAIN" 2>/dev/null || true
    done

    # Replace github.com/steig
    echo ""
    echo -e "${YELLOW}Fixing GitHub repo URLs...${NC}"

    find "$PROJECT_ROOT" -type f \( -name "*.md" -o -name "*.ts" -o -name "*.json" \) -print0 2>/dev/null | while IFS= read -r -d '' file; do
        replace_in_file "$file" 'github.com/steig/nixos-config' "github.com/$NEW_GITHUB_ORG/$NEW_GITHUB_REPO" 2>/dev/null || true
        replace_in_file "$file" 'github.com/steig' "github.com/$NEW_GITHUB_ORG" 2>/dev/null || true
    done

    # Replace steig.io domain
    echo ""
    echo -e "${YELLOW}Fixing personal domain references...${NC}"

    find "$PROJECT_ROOT" -type f -name "*.md" -print0 2>/dev/null | while IFS= read -r -d '' file; do
        replace_in_file "$file" 'steig.io' 'example.com' 2>/dev/null || true
        replace_in_file "$file" 'tom@steig.io' 'user@example.com' 2>/dev/null || true
    done

    # Replace LDC AI Framework
    echo ""
    echo -e "${YELLOW}Fixing LDC AI Framework references...${NC}"

    find "$PROJECT_ROOT" -type f -name "*.md" -print0 2>/dev/null | while IFS= read -r -d '' file; do
        replace_in_file "$file" 'LDC AI Framework' 'AI Development Framework' 2>/dev/null || true
        replace_in_file "$file" 'LDC AI framework' 'AI development framework' 2>/dev/null || true
    done
}

# ============================================
# PHASE 3: Rename Directories
# ============================================
phase3_rename_dirs() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Phase 3: Renaming Directories${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local steig_docs="$PROJECT_ROOT/website/docs/steig"
    local new_docs="$PROJECT_ROOT/website/docs/framework"

    if [[ -d "$steig_docs" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            echo -e "  ${YELLOW}[DRY]${NC} Would rename $steig_docs → $new_docs"
        else
            mv "$steig_docs" "$new_docs"
            echo -e "  ${GREEN}[OK]${NC} Renamed $steig_docs → $new_docs"

            # Update references to the old path
            find "$PROJECT_ROOT" -type f \( -name "*.md" -o -name "*.ts" -o -name "*.json" \) -print0 2>/dev/null | while IFS= read -r -d '' file; do
                replace_in_file "$file" 'docs/steig' 'docs/framework' 2>/dev/null || true
            done
        fi
    fi
}

# ============================================
# PHASE 4: Clean Up Dead Code
# ============================================
phase4_cleanup() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Phase 4: Cleaning Up Dead Code${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo ""
    echo -e "${GREEN}No deprecated code to clean up.${NC}"
}

# ============================================
# PHASE 5: Create Configuration Template
# ============================================
phase5_create_config() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Phase 5: Creating Configuration Template${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local config_file="$PROJECT_ROOT/.claude/config/framework.env.example"

    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "  ${YELLOW}[DRY]${NC} Would create $config_file"
    else
        mkdir -p "$(dirname "$config_file")"
        cat > "$config_file" << 'EOF'
# AI Development Framework - Configuration
# Copy this file to framework.env and customize for your setup

# ============================================
# GitHub Configuration
# ============================================

# Your GitHub organization OR username (for project boards)
# Individual users: use your GitHub username
# Organizations: use your org name
GITHUB_ORG=your-username-or-org

# Project board number (optional - leave empty to skip)
# PROJECT_BOARD_NUMBER=1

# Skip project board integration entirely
# SKIP_PROJECT_BOARD=true

# ============================================
# Ad-hoc Request Tracking (Optional)
# ============================================

# Repository for centralized ad-hoc request tracking
# Leave empty to create issues in the current project instead
# ADHOC_REPO=your-org/adhoc-requests
# ADHOC_ORG=your-org
# ADHOC_PROJECT_NUMBER=1

# ============================================
# Framework Sync Configuration
# ============================================

# Source location for framework sync
FRAMEWORK_SOURCE=$HOME/code/ai-dev-framework/.claude

# ============================================
# Optional: Custom Packages
# ============================================

# Custom statusline package (default: @owloops/claude-powerline)
# STATUSLINE_PACKAGE=@your-org/custom-statusline
EOF
        echo -e "  ${GREEN}[OK]${NC} Created $config_file"
    fi
}

# ============================================
# Generate Report
# ============================================
generate_report() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Migration Summary${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}This was a DRY RUN. No changes were made.${NC}"
        echo ""
        echo "To apply changes, run:"
        echo -e "  ${GREEN}DRY_RUN=false NEW_GITHUB_ORG=your-org ./opensource-migrate.sh${NC}"
    else
        echo -e "${GREEN}Migration complete!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Review the changes: git diff"
        echo "  2. Update LICENSE file with appropriate copyright"
        echo "  3. Update website/docusaurus.config.ts with new branding"
        echo "  4. Test the framework locally"
        echo "  5. Commit and push"
    fi
    echo ""
}

# ============================================
# Main
# ============================================
main() {
    phase1_fix_orgs
    phase2_fix_branding
    phase3_rename_dirs
    phase4_cleanup
    phase5_create_config
    generate_report
}

main "$@"
