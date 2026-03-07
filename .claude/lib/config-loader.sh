#!/bin/bash

# Config Loader Library for LDC AI Framework
# Handles global (~/.config/claude-ai/) and local (.ai/) config resolution

# Global config path
GLOBAL_CONFIG_DIR="${HOME}/.config/claude-ai"
GLOBAL_CONFIG_FILE="${GLOBAL_CONFIG_DIR}/config.json"

# Get the framework version from VERSION file
get_framework_version() {
    local version_file="${1:-./VERSION}"
    if [[ -f "$version_file" ]]; then
        cat "$version_file" | tr -d '[:space:]'
    else
        echo "unknown"
    fi
}

# Get value from global config using jq-like path
# Usage: get_global_config "brain.api_url"
get_global_config() {
    local key_path="$1"
    local default_value="${2:-}"

    if [[ ! -f "$GLOBAL_CONFIG_FILE" ]]; then
        echo "$default_value"
        return 1
    fi

    # Use python for JSON parsing (more portable than jq requirement)
    local value
    value=$(python3 -c "
import json
import sys
try:
    with open('$GLOBAL_CONFIG_FILE') as f:
        data = json.load(f)
    keys = '$key_path'.split('.')
    for key in keys:
        data = data[key]
    print(data)
except:
    sys.exit(1)
" 2>/dev/null)

    if [[ $? -eq 0 && -n "$value" ]]; then
        echo "$value"
    else
        echo "$default_value"
    fi
}

# Get Brain API URL with fallback chain:
# 1. Environment variable (BRAIN_API_URL)
# 2. Global config (~/.config/claude-ai/config.json brain.api_url)
# 3. Default URL
get_brain_api_url() {
    # Check environment variable first
    if [[ -n "${BRAIN_API_URL:-}" ]]; then
        echo "$BRAIN_API_URL"
        return 0
    fi

    # Check global config
    local global_url
    global_url=$(get_global_config "brain.api_url")
    if [[ -n "$global_url" ]]; then
        echo "$global_url"
        return 0
    fi

    # Default fallback
    echo "http://brain-api"
}

# Check if global config exists
has_global_config() {
    [[ -f "$GLOBAL_CONFIG_FILE" ]]
}

# Initialize global config if it doesn't exist
init_global_config() {
    if [[ -f "$GLOBAL_CONFIG_FILE" ]]; then
        echo "Global config already exists at $GLOBAL_CONFIG_FILE"
        return 0
    fi

    mkdir -p "$GLOBAL_CONFIG_DIR"

    cat > "$GLOBAL_CONFIG_FILE" << 'EOF'
{
  "_description": "Global Claude AI configuration - shared across all projects",
  "version": "1.0.0",
  "brain": {
    "api_url": "http://brain-api",
    "_note": "Brain MCP API URL for logging and context"
  },
  "user": {
    "github_username": "",
    "preferred_editor": ""
  },
  "mcp": {
    "auto_detect": true
  }
}
EOF

    echo "Created global config at $GLOBAL_CONFIG_FILE"
    echo "Please edit to set your preferences."
}

# Validate global config has required fields
validate_global_config() {
    local errors=()

    if ! has_global_config; then
        errors+=("Global config not found at $GLOBAL_CONFIG_FILE")
    fi

    if [[ ${#errors[@]} -gt 0 ]]; then
        echo "Global config validation errors:"
        for error in "${errors[@]}"; do
            echo "  - $error"
        done
        return 1
    fi

    echo "Global config is valid"
    return 0
}

# Export functions
export -f get_framework_version
export -f get_global_config
export -f get_brain_api_url
export -f has_global_config
export -f init_global_config
export -f validate_global_config
