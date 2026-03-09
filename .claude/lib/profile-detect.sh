#!/usr/bin/env bash
# profile-detect.sh - Auto-detect project profile
#
# Usage:
#   source .claude/lib/profile-detect.sh
#   detect_profile   # prints primary profile name (legacy)
#   detect_profiles  # prints comma-separated list (always includes default,meta)
#
# Detection order:
#   1. Explicit: CLAUDE.md with "profile: <name>" or "profiles: <list>" line
#   2. Explicit: .claude/config/profile.json
#   3. Auto-detect from project files
#   4. Fallback: suggest custom profile
#
# Base profiles (always included):
#   - default: Core framework functionality
#   - meta: Framework development tools

# Base profiles always included
readonly BASE_PROFILES="default,meta"

detect_profile() {
    local project_root="${1:-.}"

    # 1. Check CLAUDE.md for explicit profile
    if [[ -f "$project_root/CLAUDE.md" ]]; then
        local explicit
        explicit=$(grep -i "^profile:" "$project_root/CLAUDE.md" 2>/dev/null | head -1 | awk '{print $2}')
        if [[ -n "$explicit" ]]; then
            echo "$explicit"
            return 0
        fi
    fi

    # 2. Check .claude/config/profile.json
    if [[ -f "$project_root/.claude/config/profile.json" ]]; then
        local config_profile
        config_profile=$(jq -r '.name // empty' "$project_root/.claude/config/profile.json" 2>/dev/null)
        if [[ -n "$config_profile" ]]; then
            echo "$config_profile"
            return 0
        fi
    fi

    # 3. Auto-detect from files

    # Nix
    if [[ -f "$project_root/flake.nix" ]]; then
        echo "nixos"
        return 0
    fi

    # Node-based projects
    if [[ -f "$project_root/package.json" ]]; then
        # Check for specific frameworks
        if grep -q '"next"' "$project_root/package.json" 2>/dev/null; then
            echo "nextjs"
            return 0
        fi
        if grep -q '"react"' "$project_root/package.json" 2>/dev/null; then
            echo "react"
            return 0
        fi
        # Generic JS
        echo "vanilla-js"
        return 0
    fi

    # Python
    if [[ -f "$project_root/pyproject.toml" ]] || [[ -f "$project_root/setup.py" ]]; then
        # Check for specific frameworks
        if [[ -f "$project_root/dbt_project.yml" ]]; then
            echo "dbt"
            return 0
        fi
        echo "python"
        return 0
    fi

    # Shopify
    if [[ -d "$project_root/shopify" ]] || [[ -f "$project_root/shopify.theme.toml" ]]; then
        echo "shopify"
        return 0
    fi

    # Shell scripts
    if [[ -f "$project_root/Makefile" ]] || ls "$project_root"/*.sh &>/dev/null; then
        echo "shell"
        return 0
    fi

    # 4. Fallback
    echo "default"
}

# Detect all applicable profiles (always includes default and meta)
# Returns comma-separated list: "default,meta,<detected1>,<detected2>,..."
# Accumulates ALL matching profiles, not just the first match
detect_profiles() {
    local project_root="${1:-.}"
    local profiles="$BASE_PROFILES"
    local matched=()

    # 1. Check CLAUDE.md for explicit profiles (plural) - takes priority
    if [[ -f "$project_root/CLAUDE.md" ]]; then
        local explicit_list
        explicit_list=$(grep -i "^profiles:" "$project_root/CLAUDE.md" 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
        if [[ -n "$explicit_list" ]]; then
            echo "${profiles},${explicit_list}"
            return 0
        fi
    fi

    # 2. Accumulate ALL matching profiles from file detection

    # Nix
    if [[ -f "$project_root/flake.nix" ]]; then
        matched+=("nixos")
    fi

    # Node-based projects
    if [[ -f "$project_root/package.json" ]]; then
        # TypeScript
        if [[ -f "$project_root/tsconfig.json" ]] || grep -q '"typescript"' "$project_root/package.json" 2>/dev/null; then
            matched+=("typescript")
        fi

        # Next.js
        if grep -q '"next"' "$project_root/package.json" 2>/dev/null; then
            matched+=("nextjs")
        fi

        # React (standalone, not via Next)
        if grep -q '"react"' "$project_root/package.json" 2>/dev/null; then
            matched+=("react")
        fi

        # Vue
        if grep -q '"vue"' "$project_root/package.json" 2>/dev/null; then
            matched+=("vue")
        fi

        # Tailwind
        if grep -q '"tailwindcss"' "$project_root/package.json" 2>/dev/null || [[ -f "$project_root/tailwind.config.js" ]]; then
            matched+=("tailwind")
        fi

        # If no specific JS framework, add vanilla-js
        if [[ ${#matched[@]} -eq 0 ]] || [[ " ${matched[*]} " != *" nextjs "* && " ${matched[*]} " != *" react "* && " ${matched[*]} " != *" vue "* ]]; then
            # Only add vanilla-js if we have package.json but no framework
            if [[ " ${matched[*]} " != *" typescript "* ]]; then
                matched+=("vanilla-js")
            fi
        fi
    fi

    # Python
    if [[ -f "$project_root/pyproject.toml" ]] || [[ -f "$project_root/setup.py" ]] || [[ -f "$project_root/requirements.txt" ]]; then
        matched+=("python")

        # DBT
        if [[ -f "$project_root/dbt_project.yml" ]]; then
            matched+=("dbt")
        fi

        # Django
        if grep -q "django" "$project_root/requirements.txt" 2>/dev/null || grep -q "django" "$project_root/pyproject.toml" 2>/dev/null; then
            matched+=("django")
        fi

        # FastAPI
        if grep -q "fastapi" "$project_root/requirements.txt" 2>/dev/null || grep -q "fastapi" "$project_root/pyproject.toml" 2>/dev/null; then
            matched+=("fastapi")
        fi
    fi

    # Shopify
    if [[ -d "$project_root/shopify" ]] || [[ -f "$project_root/shopify.theme.toml" ]] || [[ -d "$project_root/sections" && -d "$project_root/snippets" ]]; then
        matched+=("shopify")
    fi

    # Shell scripts (if prominent)
    if [[ -f "$project_root/Makefile" ]]; then
        matched+=("shell")
    fi

    # Docker
    if [[ -f "$project_root/Dockerfile" ]] || [[ -f "$project_root/docker-compose.yml" ]] || [[ -f "$project_root/docker-compose.yaml" ]]; then
        matched+=("docker")
    fi

    # Terraform
    if compgen -G "$project_root/*.tf" >/dev/null 2>&1; then
        matched+=("terraform")
    fi

    # Go
    if [[ -f "$project_root/go.mod" ]]; then
        matched+=("go")
    fi

    # Rust
    if [[ -f "$project_root/Cargo.toml" ]]; then
        matched+=("rust")
    fi

    # 3. Build final profile list
    if [[ ${#matched[@]} -gt 0 ]]; then
        profiles="${profiles},$(IFS=,; echo "${matched[*]}")"
    else
        # No specific match - suggest custom profile
        suggest_custom_profile "$project_root" >&2
    fi

    echo "$profiles"
}

# Suggest creating a custom profile when no match found
suggest_custom_profile() {
    local project_root="${1:-.}"
    local project_name
    project_name=$(basename "$(cd "$project_root" && pwd)")

    cat >&2 << EOF

💡 No specific profile detected for this project.

To create a custom profile:
1. Create .claude/profiles/${project_name}/profile.json
2. Or add to CLAUDE.md: profile: ${project_name}

Example custom profile:
{
  "name": "${project_name}",
  "extends": "../default/profile.json",
  "settings": {
    "test_command": "npm test",
    "build_command": "npm run build"
  }
}
EOF
}

# Get test command for detected profile
get_test_command() {
    local profile="${1:-$(detect_profile)}"
    local profiles_dir="${CLAUDE_PROFILES_DIR:-$HOME/.claude/profiles}"

    if [[ -f "$profiles_dir/$profile/profile.json" ]]; then
        jq -r '.settings.test_command // "echo No tests configured"' "$profiles_dir/$profile/profile.json"
    else
        echo "echo No tests configured"
    fi
}

# Get build command for detected profile
get_build_command() {
    local profile="${1:-$(detect_profile)}"
    local profiles_dir="${CLAUDE_PROFILES_DIR:-$HOME/.claude/profiles}"

    if [[ -f "$profiles_dir/$profile/profile.json" ]]; then
        jq -r '.settings.build_command // "echo No build configured"' "$profiles_dir/$profile/profile.json"
    else
        echo "echo No build configured"
    fi
}

# Get lint command for detected profile
get_lint_command() {
    local profile="${1:-$(detect_profile)}"
    local profiles_dir="${CLAUDE_PROFILES_DIR:-$HOME/.claude/profiles}"

    if [[ -f "$profiles_dir/$profile/profile.json" ]]; then
        jq -r '.settings.lint_command // "echo No linter configured"' "$profiles_dir/$profile/profile.json"
    else
        echo "echo No linter configured"
    fi
}

# Print profile info
show_profile() {
    local profile
    profile=$(detect_profile)
    echo "Detected profile: $profile"
    echo "Test command: $(get_test_command "$profile")"
    echo "Build command: $(get_build_command "$profile")"
    echo "Lint command: $(get_lint_command "$profile")"
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    detect_profile "$@"
fi
