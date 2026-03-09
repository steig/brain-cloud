#!/bin/bash
# Profile Management Utilities
# Part of Claude AI Framework v2.2.0
# Provides functions for managing project-type profiles

# Support both legacy .ai and new .claude paths
if [[ -d ".claude" ]]; then
    PROFILES_DIR=".claude/profiles"
    CONFIG_DIR=".claude/config"
    ACTIVE_PROFILE_FILE="$CONFIG_DIR/profile.json"
    PROJECT_SETTINGS_FILE="$CONFIG_DIR/project-settings.json"
else
    PROFILES_DIR=".ai/profiles"
    CONFIG_DIR=".ai/config"
    ACTIVE_PROFILE_FILE="$CONFIG_DIR/active-profile.json"
    PROJECT_SETTINGS_FILE="$CONFIG_DIR/project-settings.json"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current active profile name
get_active_profile() {
    if [[ -f "$ACTIVE_PROFILE_FILE" ]]; then
        jq -r '.type // "default"' "$ACTIVE_PROFILE_FILE"
    else
        echo "default"
    fi
}

# Get current active profile display name
get_active_profile_name() {
    if [[ -f "$ACTIVE_PROFILE_FILE" ]]; then
        jq -r '.name // "Default Profile"' "$ACTIVE_PROFILE_FILE"
    else
        echo "Default Profile"
    fi
}

# List available profiles
list_profiles() {
    echo -e "${BLUE}Available Profiles:${NC}"
    
    # Default profile
    if [[ -f "$PROFILES_DIR/default.json" ]]; then
        local default_name=$(jq -r '.name' "$PROFILES_DIR/default.json")
        echo -e "  • ${GREEN}default${NC} - $default_name"
    fi
    
    # Other profiles
    for profile_dir in "$PROFILES_DIR"/*/; do
        if [[ -d "$profile_dir" && -f "${profile_dir}profile.json" ]]; then
            local name=$(jq -r '.name' "${profile_dir}profile.json")
            local type=$(basename "$profile_dir")
            echo -e "  • ${GREEN}$type${NC} - $name"
        fi
    done
}

# Load profile by type (returns merged JSON)
load_profile() {
    local profile_type="$1"
    local profile_path

    # All profiles are in subdirectories: profiles/<name>/profile.json
    profile_path="$PROFILES_DIR/$profile_type/profile.json"

    if [[ ! -f "$profile_path" ]]; then
        echo -e "${RED}❌ Profile not found: $profile_type${NC}" >&2
        return 1
    fi

    # Check if profile extends another
    local extends=$(jq -r '.extends // empty' "$profile_path" 2>/dev/null)

    if [[ -n "$extends" && "$extends" != "null" ]]; then
        # Resolve the extends path relative to profile location
        local base_path
        if [[ "$extends" == "../default.json" ]]; then
            base_path="$PROFILES_DIR/default.json"
        else
            base_path="$PROFILES_DIR/$extends"
        fi

        if [[ -f "$base_path" ]]; then
            # Deep merge: base + profile (profile values override base)
            jq -s '.[0] * .[1]' "$base_path" "$profile_path"
        else
            cat "$profile_path"
        fi
    else
        cat "$profile_path"
    fi
}

# Load and merge multiple profiles (comma-separated list)
# Later profiles override earlier ones
# Usage: load_profiles "default,meta,react,typescript"
load_profiles() {
    local profile_list="$1"
    local merged="{}"
    local profile_type
    local profile_json
    local loaded_count=0
    local skipped=()

    # Split comma-separated list and process each
    IFS=',' read -ra profiles <<< "$profile_list"

    for profile_type in "${profiles[@]}"; do
        # Trim whitespace
        profile_type=$(echo "$profile_type" | xargs)
        [[ -z "$profile_type" ]] && continue

        # Try to load profile
        profile_json=$(load_profile "$profile_type" 2>/dev/null)

        if [[ $? -eq 0 && -n "$profile_json" ]]; then
            # Deep merge: existing + new (new values override)
            merged=$(echo "$merged" "$profile_json" | jq -s '.[0] * .[1]')
            ((loaded_count++))
        else
            skipped+=("$profile_type")
        fi
    done

    # Add metadata about merged profiles
    merged=$(echo "$merged" | jq --arg profiles "$profile_list" --arg count "$loaded_count" \
        '. + {_merged_profiles: ($profiles | split(",") | map(gsub("^\\s+|\\s+$"; ""))), _profile_count: ($count | tonumber)}')

    # Warn about skipped profiles
    if [[ ${#skipped[@]} -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  Skipped missing profiles: ${skipped[*]}${NC}" >&2
    fi

    echo "$merged"
}

# Get merged setting from multiple profiles
# Loads all detected profiles and returns the merged value
# Usage: get_merged_setting ".settings.test_command" "npm test"
get_merged_setting() {
    local setting_path="$1"
    local default_value="${2:-}"
    local profiles

    # Get detected profiles (requires profile-detect.sh to be sourced)
    if command -v detect_profiles &>/dev/null; then
        profiles=$(detect_profiles)
    else
        profiles="default"
    fi

    # Load and merge all profiles
    local merged
    merged=$(load_profiles "$profiles" 2>/dev/null)

    if [[ -n "$merged" ]]; then
        local value
        value=$(echo "$merged" | jq -r "$setting_path // empty")
        if [[ -n "$value" && "$value" != "null" ]]; then
            echo "$value"
            return 0
        fi
    fi

    # Return default if provided
    if [[ -n "$default_value" ]]; then
        echo "$default_value"
    fi
}

# Set active profile
set_active_profile() {
    local profile_type="$1"
    
    # Ensure config directory exists
    mkdir -p "$CONFIG_DIR"
    
    # Load and validate profile
    local profile_data
    profile_data=$(load_profile "$profile_type")
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    # Add activation timestamp and save
    echo "$profile_data" | jq '. + {activated_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))}' > "$ACTIVE_PROFILE_FILE"
    
    local profile_name=$(echo "$profile_data" | jq -r '.name')
    echo -e "${GREEN}✅ Profile activated: ${profile_name}${NC}"
    
    # Show summary
    echo ""
    echo -e "${BLUE}📋 Configuration Applied:${NC}"
    echo -e "  • Primary Language: $(echo "$profile_data" | jq -r '.technology_stack.primary_language')"
    echo -e "  • Build Tools: $(echo "$profile_data" | jq -r '.technology_stack.build_tools | join(", ")')"
    echo -e "  • Code Review Focus: $(echo "$profile_data" | jq -r '.code_review.focus_areas | .[0:3] | join(", ")')"
    
    return 0
}

# Auto-detect profile from project files
auto_detect_profile() {
    # Check for Shopify App indicators (must be before theme)
    if [[ -f "shopify.app.toml" ]] || [[ -f "shopify.app.json" ]]; then
        echo "shopify-app"
        return 0
    fi

    # Check for Shopify Theme indicators
    if [[ -f "shopify.config.json" ]] || [[ -f ".shopify" ]] || [[ -d "sections" && -d "snippets" ]]; then
        echo "shopify"
        return 0
    fi

    # Check for Django indicators
    if [[ -f "manage.py" ]] || [[ -d "django" ]] || grep -q "django" requirements.txt 2>/dev/null; then
        echo "django"
        return 0
    fi

    # Check for Windmill indicators
    if [[ -f "wmill.yaml" ]] || [[ -d "f" && -f "f/.wmill" ]]; then
        echo "windmill"
        return 0
    fi

    # Check for Next.js indicators
    if [[ -f "next.config.js" ]] || [[ -f "next.config.mjs" ]] || [[ -f "next.config.ts" ]]; then
        echo "nextjs"
        return 0
    fi

    # Check for Vue indicators
    if [[ -f "vue.config.js" ]] || [[ -f "vite.config.ts" && -d "src" ]]; then
        if grep -q '"vue"' package.json 2>/dev/null; then
            echo "vue"
            return 0
        fi
    fi

    # Check for React indicators (after Next.js and Vue)
    if [[ -f "package.json" ]]; then
        if grep -q '"react"' package.json 2>/dev/null; then
            if ! grep -q '"next"' package.json 2>/dev/null; then
                echo "react"
                return 0
            fi
        fi
    fi

    # Check for Tabler indicators
    if grep -q "tabler" package.json 2>/dev/null || [[ -d "node_modules/@tabler" ]]; then
        echo "tabler"
        return 0
    fi

    # Check for Bootstrap indicators
    if grep -q "bootstrap" package.json 2>/dev/null || [[ -d "node_modules/bootstrap" ]]; then
        echo "bootstrap"
        return 0
    fi

    # Check for Python indicators
    if [[ -f "requirements.txt" ]] || [[ -f "pyproject.toml" ]] || [[ -f "setup.py" ]] || [[ -f "Pipfile" ]]; then
        echo "python"
        return 0
    fi

    # Check for HTML-only projects (no package.json, has HTML files)
    if [[ ! -f "package.json" ]] && ls *.html 2>/dev/null | head -1 >/dev/null; then
        echo "html"
        return 0
    fi

    # Default fallback
    echo "default"
}

# Get project settings
get_project_settings() {
    if [[ -f "$PROJECT_SETTINGS_FILE" ]]; then
        cat "$PROJECT_SETTINGS_FILE"
    else
        echo '{}'
    fi
}

# Get a specific project setting
get_project_setting() {
    local setting_path="$1"
    local default_value="${2:-}"

    if [[ -f "$PROJECT_SETTINGS_FILE" ]]; then
        local value
        value=$(jq -r "$setting_path // empty" "$PROJECT_SETTINGS_FILE")
        if [[ -n "$value" && "$value" != "null" ]]; then
            echo "$value"
            return 0
        fi
    fi

    if [[ -n "$default_value" ]]; then
        echo "$default_value"
    fi
}

# Initialize session from project settings
init_session_from_settings() {
    if [[ ! -f "$PROJECT_SETTINGS_FILE" ]]; then
        echo -e "${YELLOW}⚠️  No project settings found. Using defaults.${NC}"
        return 0
    fi

    local auto_activate=$(get_project_setting '.profile.auto_activate_on_session_start' 'false')
    local default_profile=$(get_project_setting '.profile.default' 'default')
    local auto_detect_fallback=$(get_project_setting '.profile.auto_detect_fallback' 'false')

    if [[ "$auto_activate" == "true" ]]; then
        # Check if profile exists
        local profile_path
        if [[ "$default_profile" == "default" ]]; then
            profile_path="$PROFILES_DIR/default.json"
        else
            profile_path="$PROFILES_DIR/$default_profile/profile.json"
        fi

        if [[ -f "$profile_path" ]]; then
            echo -e "${GREEN}🚀 Auto-activating profile: $default_profile${NC}"
            set_active_profile "$default_profile"
        elif [[ "$auto_detect_fallback" == "true" ]]; then
            echo -e "${YELLOW}⚠️  Profile '$default_profile' not found. Auto-detecting...${NC}"
            local detected=$(auto_detect_profile)
            set_active_profile "$detected"
        fi
    fi

    return 0
}

# Check if agents are enabled in project settings
are_agents_enabled() {
    local enabled=$(get_project_setting '.agents.enabled' 'true')
    [[ "$enabled" == "true" ]]
}

# Get max concurrent agents from settings
get_max_concurrent_agents() {
    get_project_setting '.agents.max_concurrent_agents' '3'
}

# Get a specific setting from the active profile
get_profile_setting() {
    local setting_path="$1"
    local default_value="${2:-}"
    
    if [[ -f "$ACTIVE_PROFILE_FILE" ]]; then
        local value
        value=$(jq -r "$setting_path // empty" "$ACTIVE_PROFILE_FILE")
        if [[ -n "$value" && "$value" != "null" ]]; then
            echo "$value"
            return 0
        fi
    fi
    
    # Return default if provided
    if [[ -n "$default_value" ]]; then
        echo "$default_value"
    fi
}

# Get commit emoji for a given type
get_commit_emoji() {
    local commit_type="$1"
    get_profile_setting ".commit_conventions.emoji_map.\"$commit_type\"" ""
}

# Get code review focus areas
get_review_focus_areas() {
    get_profile_setting '.code_review.focus_areas | join(", ")' "security, performance, maintainability"
}

# Get security patterns for review
get_security_patterns() {
    get_profile_setting '.code_review.security_patterns | join(", ")' "owasp-top-10"
}

# Get performance patterns for review
get_performance_patterns() {
    get_profile_setting '.code_review.performance_patterns | join(", ")' "bundle-size, render-optimization"
}

# Get workflow command
get_workflow_command() {
    local workflow_name="$1"
    get_profile_setting ".workflows.\"$workflow_name\"" ""
}

# Get file patterns for a specific type
get_file_pattern() {
    local pattern_name="$1"
    get_profile_setting ".file_patterns.\"$pattern_name\"" ""
}

# Get memory tags for the profile
get_memory_tags() {
    get_profile_setting '.mcp_preferences.memory_tags | join(", ")' ""
}

# Get Context7 libraries for the profile
get_context7_libraries() {
    get_profile_setting '.mcp_preferences.context7_libraries | join(", ")' ""
}

# Check if emoji is enabled for commits
is_emoji_enabled() {
    local enabled
    enabled=$(get_profile_setting '.commit_conventions.emoji_enabled' 'true')
    [[ "$enabled" == "true" ]]
}

# Get valid commit scopes for the profile
get_commit_scopes() {
    get_profile_setting '.commit_conventions.scopes | join(", ")' ""
}

# Print profile status
print_profile_status() {
    local current_profile=$(get_active_profile)
    local profile_name=$(get_active_profile_name)
    
    echo -e "${BLUE}🎯 Profile Status${NC}"
    echo -e "  Current: ${GREEN}$profile_name${NC} ($current_profile)"
    
    if [[ -f "$ACTIVE_PROFILE_FILE" ]]; then
        local activated_at=$(jq -r '.activated_at // "unknown"' "$ACTIVE_PROFILE_FILE")
        echo -e "  Activated: $activated_at"
    fi
    
    echo ""
    list_profiles
}

# ============================================================================
# Quick access functions for common profile settings
# ============================================================================

# Get test command from profile
get_test_command() {
    get_profile_setting '.settings.test_command' 'npm test'
}

# Get build command from profile
get_build_command() {
    get_profile_setting '.settings.build_command' 'npm run build'
}

# Get lint command from profile
get_lint_command() {
    get_profile_setting '.settings.lint_command' 'npm run lint'
}

# Get dev command from profile
get_dev_command() {
    get_profile_setting '.settings.dev_command' 'npm run dev'
}

# Get branch prefix from profile
get_branch_prefix() {
    get_profile_setting '.conventions.branch_prefix' 'issue-'
}

# Get PR merge strategy from profile
get_merge_strategy() {
    get_profile_setting '.conventions.pr_merge_strategy' 'squash'
}

# Check if tests are required
require_tests() {
    local required=$(get_profile_setting '.quality.require_tests' 'true')
    [[ "$required" == "true" ]]
}

# Check if types are required
require_types() {
    local required=$(get_profile_setting '.quality.require_types' 'false')
    [[ "$required" == "true" ]]
}

# Get TDD enforcement mode from profile
# Returns: strict, default, or optional
# - strict: No exceptions allowed, --no-tdd flag rejected
# - default: TDD on by default, --no-tdd with reason allowed
# - optional: TDD opt-in via --tdd flag (legacy behavior)
get_tdd_mode() {
    get_profile_setting '.quality.tdd_enforcement' 'default'
}

# Check if TDD should be enforced
# Returns true if TDD mode is strict or default
should_enforce_tdd() {
    local mode=$(get_tdd_mode)
    [[ "$mode" == "strict" || "$mode" == "default" ]]
}

# Check if TDD opt-out is allowed
# Returns true only if mode is "default" (not strict)
can_opt_out_tdd() {
    local mode=$(get_tdd_mode)
    [[ "$mode" == "default" ]]
}

# Get profile name
get_profile_name() {
    get_profile_setting '.name' 'default'
}

# Get profile description
get_profile_description() {
    get_profile_setting '.description' 'General purpose profile'
}

# Export functions for use in other scripts
export -f get_active_profile
export -f get_active_profile_name
export -f list_profiles
export -f load_profile
export -f load_profiles
export -f get_merged_setting
export -f set_active_profile
export -f auto_detect_profile
export -f get_profile_setting
export -f get_commit_emoji
export -f get_review_focus_areas
export -f get_security_patterns
export -f get_performance_patterns
export -f get_workflow_command
export -f get_file_pattern
export -f get_memory_tags
export -f get_context7_libraries
export -f is_emoji_enabled
export -f get_commit_scopes
export -f print_profile_status
export -f get_project_settings
export -f get_project_setting
export -f init_session_from_settings
export -f are_agents_enabled
export -f get_max_concurrent_agents
export -f get_test_command
export -f get_build_command
export -f get_lint_command
export -f get_dev_command
export -f get_branch_prefix
export -f get_merge_strategy
export -f require_tests
export -f require_types
export -f get_tdd_mode
export -f should_enforce_tdd
export -f can_opt_out_tdd
export -f get_profile_name
export -f get_profile_description
