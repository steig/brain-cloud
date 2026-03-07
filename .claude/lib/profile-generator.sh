#!/usr/bin/env bash
# profile-generator.sh - Analyze project and generate custom profile
#
# Usage:
#   source .claude/lib/profile-generator.sh
#   generate_profile [output_path]

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Analyze package.json and extract scripts/dependencies
analyze_node_project() {
    local project_root="${1:-.}"
    local pkg="$project_root/package.json"

    [[ ! -f "$pkg" ]] && return 1

    echo "{"

    # Extract scripts
    echo '  "scripts": {'
    local scripts=$(jq -r '.scripts // {} | to_entries[] | "    \"\(.key)\": \"\(.value)\""' "$pkg" 2>/dev/null | paste -sd ',' -)
    echo "$scripts"
    echo '  },'

    # Extract key dependencies
    echo '  "dependencies": {'
    local deps=$(jq -r '
        (.dependencies // {}) + (.devDependencies // {})
        | to_entries[]
        | select(.key | test("^(react|next|vue|svelte|angular|vite|webpack|esbuild|typescript|jest|vitest|mocha|playwright|cypress|eslint|prettier|tailwind|drizzle|prisma|trpc|zod|axios|express|fastify|hono)"))
        | "    \"\(.key)\": \"\(.value)\""
    ' "$pkg" 2>/dev/null | paste -sd ',' -)
    echo "$deps"
    echo '  }'

    echo "}"
}

# Analyze Python project
analyze_python_project() {
    local project_root="${1:-.}"

    echo "{"

    # Check pyproject.toml
    if [[ -f "$project_root/pyproject.toml" ]]; then
        echo '  "build_system": "pyproject",'

        # Extract tool.pytest, tool.ruff, etc.
        if grep -q "pytest" "$project_root/pyproject.toml" 2>/dev/null; then
            echo '  "test_framework": "pytest",'
        fi
        if grep -q "ruff" "$project_root/pyproject.toml" 2>/dev/null; then
            echo '  "linter": "ruff",'
        fi
        if grep -q "mypy" "$project_root/pyproject.toml" 2>/dev/null; then
            echo '  "type_checker": "mypy",'
        fi
        if grep -q "black" "$project_root/pyproject.toml" 2>/dev/null; then
            echo '  "formatter": "black",'
        fi

        # Check for poetry/pdm/hatch
        if grep -q "poetry" "$project_root/pyproject.toml" 2>/dev/null; then
            echo '  "package_manager": "poetry",'
        elif grep -q "pdm" "$project_root/pyproject.toml" 2>/dev/null; then
            echo '  "package_manager": "pdm",'
        elif grep -q "hatch" "$project_root/pyproject.toml" 2>/dev/null; then
            echo '  "package_manager": "hatch",'
        fi
    fi

    # Check requirements.txt for frameworks
    if [[ -f "$project_root/requirements.txt" ]]; then
        if grep -qi "django" "$project_root/requirements.txt"; then
            echo '  "framework": "django",'
        elif grep -qi "fastapi" "$project_root/requirements.txt"; then
            echo '  "framework": "fastapi",'
        elif grep -qi "flask" "$project_root/requirements.txt"; then
            echo '  "framework": "flask",'
        fi
    fi

    echo '  "language": "python"'
    echo "}"
}

# Detect config files
detect_config_files() {
    local project_root="${1:-.}"
    local configs=()

    # TypeScript
    [[ -f "$project_root/tsconfig.json" ]] && configs+=("typescript")

    # Linting
    [[ -f "$project_root/.eslintrc.js" || -f "$project_root/.eslintrc.cjs" || -f "$project_root/.eslintrc.json" || -f "$project_root/eslint.config.js" || -f "$project_root/eslint.config.mjs" ]] && configs+=("eslint")
    [[ -f "$project_root/.prettierrc" || -f "$project_root/.prettierrc.js" || -f "$project_root/prettier.config.js" ]] && configs+=("prettier")
    [[ -f "$project_root/biome.json" ]] && configs+=("biome")

    # CSS
    [[ -f "$project_root/tailwind.config.js" || -f "$project_root/tailwind.config.ts" ]] && configs+=("tailwind")
    [[ -f "$project_root/postcss.config.js" ]] && configs+=("postcss")

    # Testing
    [[ -f "$project_root/vitest.config.ts" || -f "$project_root/vitest.config.js" ]] && configs+=("vitest")
    [[ -f "$project_root/jest.config.js" || -f "$project_root/jest.config.ts" ]] && configs+=("jest")
    [[ -f "$project_root/playwright.config.ts" || -f "$project_root/playwright.config.js" ]] && configs+=("playwright")
    [[ -f "$project_root/cypress.config.ts" || -f "$project_root/cypress.config.js" ]] && configs+=("cypress")

    # Bundlers
    [[ -f "$project_root/vite.config.ts" || -f "$project_root/vite.config.js" ]] && configs+=("vite")
    [[ -f "$project_root/webpack.config.js" ]] && configs+=("webpack")
    [[ -f "$project_root/next.config.js" || -f "$project_root/next.config.mjs" || -f "$project_root/next.config.ts" ]] && configs+=("nextjs")

    # Database/ORM
    [[ -f "$project_root/drizzle.config.ts" ]] && configs+=("drizzle")
    [[ -f "$project_root/prisma/schema.prisma" ]] && configs+=("prisma")

    # Docker
    [[ -f "$project_root/Dockerfile" ]] && configs+=("docker")
    [[ -f "$project_root/docker-compose.yml" || -f "$project_root/docker-compose.yaml" ]] && configs+=("docker-compose")

    # CI/CD
    [[ -d "$project_root/.github/workflows" ]] && configs+=("github-actions")

    # Python
    [[ -f "$project_root/pyproject.toml" ]] && configs+=("pyproject")
    [[ -f "$project_root/ruff.toml" || -f "$project_root/.ruff.toml" ]] && configs+=("ruff")
    [[ -f "$project_root/mypy.ini" || -f "$project_root/.mypy.ini" ]] && configs+=("mypy")
    [[ -f "$project_root/pytest.ini" || -f "$project_root/pyproject.toml" ]] && configs+=("pytest")

    # Nix
    [[ -f "$project_root/flake.nix" ]] && configs+=("nix-flake")

    # Output as JSON array
    printf '%s\n' "${configs[@]}" | jq -R . | jq -s .
}

# Determine base profile from analysis
determine_base_profile() {
    local project_root="${1:-.}"

    # Check in priority order
    [[ -f "$project_root/flake.nix" ]] && echo "nixos" && return
    [[ -f "$project_root/next.config.js" || -f "$project_root/next.config.mjs" || -f "$project_root/next.config.ts" ]] && echo "nextjs" && return
    [[ -f "$project_root/package.json" ]] && grep -q '"react"' "$project_root/package.json" 2>/dev/null && echo "react" && return
    [[ -f "$project_root/package.json" ]] && grep -q '"vue"' "$project_root/package.json" 2>/dev/null && echo "vue" && return
    [[ -f "$project_root/pyproject.toml" || -f "$project_root/requirements.txt" ]] && echo "python" && return
    [[ -f "$project_root/package.json" ]] && echo "vanilla-js" && return

    echo "default"
}

# Generate test command from analysis
generate_test_command() {
    local project_root="${1:-.}"

    # Check package.json scripts first
    if [[ -f "$project_root/package.json" ]]; then
        local test_script=$(jq -r '.scripts.test // empty' "$project_root/package.json" 2>/dev/null)
        if [[ -n "$test_script" && "$test_script" != "null" ]]; then
            echo "npm test"
            return
        fi

        # Check for specific test runners
        if [[ -f "$project_root/vitest.config.ts" || -f "$project_root/vitest.config.js" ]]; then
            echo "npx vitest"
            return
        fi
        if jq -e '.devDependencies.vitest // .dependencies.vitest' "$project_root/package.json" &>/dev/null; then
            echo "npx vitest"
            return
        fi
    fi

    # Python
    if [[ -f "$project_root/pyproject.toml" || -f "$project_root/pytest.ini" ]]; then
        echo "pytest"
        return
    fi

    # Nix
    if [[ -f "$project_root/flake.nix" ]]; then
        echo "nix flake check"
        return
    fi

    echo "echo 'No test command detected'"
}

# Generate build command from analysis
generate_build_command() {
    local project_root="${1:-.}"

    if [[ -f "$project_root/package.json" ]]; then
        local build_script=$(jq -r '.scripts.build // empty' "$project_root/package.json" 2>/dev/null)
        if [[ -n "$build_script" && "$build_script" != "null" ]]; then
            echo "npm run build"
            return
        fi
    fi

    if [[ -f "$project_root/pyproject.toml" ]]; then
        echo "python -m build"
        return
    fi

    if [[ -f "$project_root/flake.nix" ]]; then
        echo "nix build"
        return
    fi

    echo "echo 'No build command detected'"
}

# Generate lint command from analysis
generate_lint_command() {
    local project_root="${1:-.}"
    local lint_parts=()

    if [[ -f "$project_root/package.json" ]]; then
        # Check for lint script
        local lint_script=$(jq -r '.scripts.lint // empty' "$project_root/package.json" 2>/dev/null)
        if [[ -n "$lint_script" && "$lint_script" != "null" ]]; then
            echo "npm run lint"
            return
        fi

        # Build from detected tools
        if [[ -f "$project_root/biome.json" ]]; then
            echo "npx biome check ."
            return
        fi

        [[ -f "$project_root/.eslintrc.js" || -f "$project_root/.eslintrc.cjs" || -f "$project_root/eslint.config.js" ]] && lint_parts+=("eslint .")
        [[ -f "$project_root/.prettierrc" || -f "$project_root/prettier.config.js" ]] && lint_parts+=("prettier --check .")

        if [[ ${#lint_parts[@]} -gt 0 ]]; then
            echo "npx ${lint_parts[*]}"
            return
        fi
    fi

    # Python
    if [[ -f "$project_root/ruff.toml" || -f "$project_root/.ruff.toml" ]] || grep -q "ruff" "$project_root/pyproject.toml" 2>/dev/null; then
        echo "ruff check ."
        return
    fi

    # Nix
    if [[ -f "$project_root/flake.nix" ]]; then
        echo "statix check ."
        return
    fi

    echo "echo 'No lint command detected'"
}

# Generate dev command from analysis
generate_dev_command() {
    local project_root="${1:-.}"

    if [[ -f "$project_root/package.json" ]]; then
        local dev_script=$(jq -r '.scripts.dev // empty' "$project_root/package.json" 2>/dev/null)
        if [[ -n "$dev_script" && "$dev_script" != "null" ]]; then
            echo "npm run dev"
            return
        fi

        local start_script=$(jq -r '.scripts.start // empty' "$project_root/package.json" 2>/dev/null)
        if [[ -n "$start_script" && "$start_script" != "null" ]]; then
            echo "npm start"
            return
        fi
    fi

    if [[ -f "$project_root/flake.nix" ]]; then
        echo "nix develop"
        return
    fi

    echo "echo 'No dev command detected'"
}

# Generate e2e command if applicable
generate_e2e_command() {
    local project_root="${1:-.}"

    if [[ -f "$project_root/playwright.config.ts" || -f "$project_root/playwright.config.js" ]]; then
        echo "npx playwright test"
        return
    fi

    if [[ -f "$project_root/cypress.config.ts" || -f "$project_root/cypress.config.js" ]]; then
        echo "npx cypress run"
        return
    fi

    echo ""
}

# Generate format command
generate_format_command() {
    local project_root="${1:-.}"

    if [[ -f "$project_root/package.json" ]]; then
        local format_script=$(jq -r '.scripts.format // empty' "$project_root/package.json" 2>/dev/null)
        if [[ -n "$format_script" && "$format_script" != "null" ]]; then
            echo "npm run format"
            return
        fi

        if [[ -f "$project_root/biome.json" ]]; then
            echo "npx biome format --write ."
            return
        fi

        if [[ -f "$project_root/.prettierrc" || -f "$project_root/prettier.config.js" ]]; then
            echo "npx prettier --write ."
            return
        fi
    fi

    # Python
    if grep -q "ruff" "$project_root/pyproject.toml" 2>/dev/null; then
        echo "ruff format ."
        return
    fi

    if [[ -f "$project_root/flake.nix" ]]; then
        echo "alejandra ."
        return
    fi

    echo ""
}

# Main profile generation function
generate_profile() {
    local project_root="${1:-.}"
    local output_path="${2:-$project_root/.claude/profiles/project/profile.json}"
    local project_name=$(basename "$(cd "$project_root" && pwd)")

    echo -e "${BLUE}${BOLD}Analyzing project: $project_name${NC}"
    echo ""

    # Detect configs
    echo -e "${CYAN}Detecting configuration files...${NC}"
    local configs=$(detect_config_files "$project_root")
    local config_count=$(echo "$configs" | jq 'length')
    echo -e "  Found ${GREEN}$config_count${NC} config files"
    echo "$configs" | jq -r '.[]' | while read -r cfg; do
        echo -e "    ${GREEN}✓${NC} $cfg"
    done
    echo ""

    # Determine base profile
    local base_profile=$(determine_base_profile "$project_root")
    echo -e "${CYAN}Base profile:${NC} ${GREEN}$base_profile${NC}"
    echo ""

    # Generate commands
    echo -e "${CYAN}Detected commands:${NC}"
    local test_cmd=$(generate_test_command "$project_root")
    local build_cmd=$(generate_build_command "$project_root")
    local lint_cmd=$(generate_lint_command "$project_root")
    local dev_cmd=$(generate_dev_command "$project_root")
    local e2e_cmd=$(generate_e2e_command "$project_root")
    local format_cmd=$(generate_format_command "$project_root")

    echo -e "  test:   ${GREEN}$test_cmd${NC}"
    echo -e "  build:  ${GREEN}$build_cmd${NC}"
    echo -e "  lint:   ${GREEN}$lint_cmd${NC}"
    echo -e "  dev:    ${GREEN}$dev_cmd${NC}"
    [[ -n "$e2e_cmd" ]] && echo -e "  e2e:    ${GREEN}$e2e_cmd${NC}"
    [[ -n "$format_cmd" ]] && echo -e "  format: ${GREEN}$format_cmd${NC}"
    echo ""

    # Build quality settings based on configs
    local require_types="false"
    local has_e2e="false"
    local has_format="false"

    echo "$configs" | jq -r '.[]' | grep -q "typescript" && require_types="true"
    echo "$configs" | jq -r '.[]' | grep -qE "playwright|cypress" && has_e2e="true"
    [[ -n "$format_cmd" ]] && has_format="true"

    # Create output directory
    mkdir -p "$(dirname "$output_path")"

    # Generate profile JSON
    local profile_json=$(cat <<EOF
{
  "name": "$project_name",
  "description": "Auto-generated profile for $project_name",
  "extends": "$base_profile",
  "generated_at": "$(date -Iseconds)",
  "detected_configs": $configs,
  "settings": {
    "test_command": "$test_cmd",
    "build_command": "$build_cmd",
    "lint_command": "$lint_cmd",
    "dev_command": "$dev_cmd"$(
    [[ -n "$e2e_cmd" ]] && echo ",
    \"e2e_command\": \"$e2e_cmd\""
    )$(
    [[ -n "$format_cmd" ]] && echo ",
    \"format_command\": \"$format_cmd\""
    )
  },
  "quality": {
    "require_tests": true,
    "require_types": $require_types,
    "has_e2e": $has_e2e,
    "has_formatter": $has_format
  },
  "conventions": {
    "branch_prefix": "issue-",
    "commit_style": "conventional",
    "pr_merge_strategy": "squash"
  }
}
EOF
)

    # Pretty print and save
    echo "$profile_json" | jq '.' > "$output_path"

    echo -e "${GREEN}${BOLD}Profile generated:${NC} $output_path"
    echo ""
    echo -e "${CYAN}Preview:${NC}"
    jq '.' "$output_path"
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    generate_profile "$@"
fi
