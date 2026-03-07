#!/bin/bash

# Dynamic GitHub Label Discovery System
# Uses GitHub MCP and bash commands for universal repository compatibility

# Cache configuration
CACHE_DIR="/tmp/.claude-label-cache"
CACHE_DURATION=3600  # 1 hour

# Initialize cache directory
mkdir -p "$CACHE_DIR"

# Get repository name for cache key
get_repo_cache_key() {
    local repo_url
    if git remote get-url origin >/dev/null 2>&1; then
        repo_url=$(git remote get-url origin 2>/dev/null)
        echo "${repo_url##*/}" | sed 's/\.git$//'
    else
        echo "unknown-repo"
    fi
}

# Discover available labels in the current repository
discover_available_labels() {
    local labels_json
    
    # Try GitHub CLI first (most reliable)
    if command -v gh >/dev/null 2>&1; then
        labels_json=$(gh repo view --json labels 2>/dev/null)
        if [[ $? -eq 0 && -n "$labels_json" ]]; then
            echo "$labels_json" | jq -r '.labels[].name' | sort
            return 0
        fi
    fi
    
    # Fallback: return empty if no labels can be discovered
    echo ""
    return 1
}

# Get cached labels or discover fresh ones
get_available_labels() {
    local repo_key cache_file cache_age
    
    repo_key=$(get_repo_cache_key)
    cache_file="$CACHE_DIR/labels-$repo_key"
    
    # Check if cache exists and is fresh
    if [[ -f "$cache_file" ]]; then
        cache_age=$(($(date +%s) - $(stat -f %m "$cache_file" 2>/dev/null || stat -c %Y "$cache_file" 2>/dev/null || echo 0)))
        if [[ $cache_age -lt $CACHE_DURATION ]]; then
            cat "$cache_file"
            return 0
        fi
    fi
    
    # Discover and cache labels
    local discovered_labels
    discovered_labels=$(discover_available_labels)
    
    if [[ -n "$discovered_labels" ]]; then
        echo "$discovered_labels" | tee "$cache_file"
    else
        # Return cached version even if stale, or empty
        if [[ -f "$cache_file" ]]; then
            cat "$cache_file"
        else
            echo ""
        fi
    fi
}

# Load label mappings configuration
load_label_mappings() {
    local config_file="/.claude/config/label-mappings.json"
    
    if [[ -f "$config_file" ]]; then
        cat "$config_file"
    else
        # Default minimal mappings
        cat << 'EOF'
{
  "labelMappings": {
    "base": {
      "task": ["enhancement", "feature", "task", "story"],
      "bug": ["bug", "defect", "issue", "problem", "error"],
      "docs": ["documentation", "docs", "readme", "guide"]
    },
    "priority": {
      "high": ["high-priority", "critical", "urgent", "p0", "priority-high", "important"],
      "medium": ["medium-priority", "normal", "p1", "priority-medium", "medium"],
      "low": ["low-priority", "minor", "p2", "priority-low", "nice-to-have"]
    },
    "complexity": {
      "simple": ["good-first-issue", "easy", "simple", "beginner"],
      "complex": ["epic", "complex", "large", "difficult"]
    },
    "type": {
      "feature": ["feature", "enhancement", "improvement", "new"],
      "bug": ["bug", "defect", "fix", "issue"],
      "refactor": ["refactor", "cleanup", "tech-debt", "refactoring"],
      "test": ["testing", "tests", "test", "qa"],
      "documentation": ["documentation", "docs", "readme"]
    },
    "story_points": {
      "1": ["points/1", "story/1", "sp:1", "sp-1"],
      "2": ["points/2", "story/2", "sp:2", "sp-2"],
      "3": ["points/3", "story/3", "sp:3", "sp-3"],
      "5": ["points/5", "story/5", "sp:5", "sp-5"],
      "8": ["points/8", "story/8", "sp:8", "sp-8"],
      "13": ["points/13", "story/13", "sp:13", "sp-13"],
      "21": ["points/21", "story/21", "sp:21", "sp-21"]
    }
  },
  "universalFallbacks": ["bug", "enhancement", "feature", "issue", "task"]
}
EOF
    fi
}

# Find best matching label from available labels
find_best_label_match() {
    local preferred="$1"
    local available_labels="$2"
    local category_hint="${3:-}"
    local mappings
    
    # Direct match first
    if echo "$available_labels" | grep -q "^${preferred}$"; then
        echo "$preferred"
        return 0
    fi
    
    # Load mappings
    mappings=$(load_label_mappings)
    
    # If category hint provided, search only in that category first
    if [[ -n "$category_hint" ]]; then
        local synonyms
        synonyms=$(echo "$mappings" | jq -r ".labelMappings.${category_hint}.\"${preferred}\"[]? // empty" 2>/dev/null)
        
        if [[ -n "$synonyms" ]]; then
            # Find first available synonym
            while IFS= read -r synonym; do
                if [[ -n "$synonym" ]] && echo "$available_labels" | grep -q "^${synonym}$"; then
                    echo "$synonym"
                    return 0
                fi
            done <<< "$synonyms"
        fi
        # If no match in hinted category, don't fall back to other categories for complexity/priority
        if [[ "$category_hint" == "complexity" || "$category_hint" == "priority" ]]; then
            return 1
        fi
    fi
    
    # Search through all mapping categories for synonyms
    for category in base priority complexity type component area; do
        # Skip if we already tried this category
        [[ "$category" == "$category_hint" ]] && continue
        
        # Check if category exists and has the preferred key
        local synonyms
        synonyms=$(echo "$mappings" | jq -r ".labelMappings.${category}.\"${preferred}\"[]? // empty" 2>/dev/null)
        
        if [[ -n "$synonyms" ]]; then
            # Find first available synonym
            while IFS= read -r synonym; do
                if [[ -n "$synonym" ]] && echo "$available_labels" | grep -q "^${synonym}$"; then
                    echo "$synonym"
                    return 0
                fi
            done <<< "$synonyms"
        fi
    done
    
    # Universal fallbacks only for base task types, not for complexity/priority
    if [[ "$category_hint" != "complexity" && "$category_hint" != "priority" ]]; then
        local fallbacks
        fallbacks=$(echo "$mappings" | jq -r '.universalFallbacks[]? // empty' 2>/dev/null)
        
        while IFS= read -r fallback; do
            if [[ -n "$fallback" ]] && echo "$available_labels" | grep -q "^${fallback}$"; then
                echo "$fallback"
                return 0
            fi
        done <<< "$fallbacks"
    fi
    
    # No match found
    return 1
}

# Select appropriate labels for a task
select_task_labels() {
    local task_type="$1"
    local complexity="$2"
    local area="$3"
    local available_labels selected_labels
    
    available_labels=$(get_available_labels)
    selected_labels=""
    
    # Base label (task type)
    local base_label
    case "$task_type" in
        "feature"|"enhancement")
            base_label=$(find_best_label_match "enhancement" "$available_labels")
            if [[ -z "$base_label" ]]; then
                base_label=$(find_best_label_match "feature" "$available_labels")
            fi
            ;;
        "bug"|"fix")
            base_label=$(find_best_label_match "bug" "$available_labels")
            ;;
        "documentation"|"docs")
            base_label=$(find_best_label_match "documentation" "$available_labels")
            ;;
        "refactor")
            base_label=$(find_best_label_match "refactor" "$available_labels")
            ;;
        "test"|"testing")
            base_label=$(find_best_label_match "test" "$available_labels")
            ;;
        *)
            # Default to enhancement/feature
            base_label=$(find_best_label_match "enhancement" "$available_labels")
            if [[ -z "$base_label" ]]; then
                base_label=$(find_best_label_match "feature" "$available_labels")
            fi
            ;;
    esac
    
    if [[ -n "$base_label" ]]; then
        selected_labels="$base_label"
    fi
    
    # Complexity label
    if [[ -n "$complexity" ]]; then
        local complexity_label
        complexity_label=$(find_best_label_match "$complexity" "$available_labels" "complexity")
        if [[ -n "$complexity_label" && "$complexity_label" != "$base_label" ]]; then
            if [[ -n "$selected_labels" ]]; then
                selected_labels="$selected_labels,$complexity_label"
            else
                selected_labels="$complexity_label"
            fi
        fi
    fi
    
    # Area/component label
    if [[ -n "$area" ]]; then
        # Check if area label exists as-is
        if echo "$available_labels" | grep -q "^${area}$"; then
            if [[ -n "$selected_labels" ]]; then
                selected_labels="$selected_labels,$area"
            else
                selected_labels="$area"
            fi
        fi
    fi
    
    echo "$selected_labels"
}

# Get user-friendly feedback about label selection
get_label_feedback() {
    local requested_labels="$1"
    local selected_labels="$2"
    
    if [[ "$requested_labels" == "$selected_labels" ]]; then
        echo "✅ Using requested labels: $selected_labels"
    elif [[ -n "$selected_labels" ]]; then
        echo "ℹ️  Using available labels: $selected_labels (mapped from: $requested_labels)"
    else
        echo "⚠️  No suitable labels found for: $requested_labels (continuing without labels)"
    fi
}

# Find story point label for given points
find_story_point_label() {
    local points="$1"
    local available_labels="$2"
    
    # Load mappings and find story point label
    local mappings
    mappings=$(load_label_mappings)
    
    # Get synonyms for this point value
    local synonyms
    synonyms=$(echo "$mappings" | jq -r ".labelMappings.story_points.\"${points}\"[]? // empty" 2>/dev/null)
    
    if [[ -n "$synonyms" ]]; then
        # Find first available synonym
        while IFS= read -r synonym; do
            if [[ -n "$synonym" ]] && echo "$available_labels" | grep -q "^${synonym}$"; then
                echo "$synonym"
                return 0
            fi
        done <<< "$synonyms"
    fi
    
    # No match found
    return 1
}

# Estimate story points based on complexity keywords
estimate_story_points() {
    local description="$1"
    local task_type="${2:-feature}"
    local complexity_score=0
    
    # Increase complexity for certain keywords
    [[ "$description" =~ (system|framework|architecture|database|api|auth) ]] && ((complexity_score += 3))
    [[ "$description" =~ (integration|migration|security|performance) ]] && ((complexity_score += 2))
    [[ "$description" =~ (multiple|complex|advanced|enterprise|full|complete) ]] && ((complexity_score += 2))
    [[ "$description" =~ (refactor|redesign|overhaul) ]] && ((complexity_score += 2))
    
    # Decrease complexity for simple tasks
    [[ "$description" =~ (simple|basic|small|minor|quick|fix|typo|update) ]] && ((complexity_score -= 2))
    [[ "$description" =~ (ui|css|style|color|text) ]] && ((complexity_score -= 1))
    
    # Adjust based on task type
    case "$task_type" in
        "bug")
            # Bugs are generally smaller unless they're system-wide
            [[ "$description" =~ (critical|crash|broken|system) ]] && ((complexity_score += 1))
            [[ "$description" =~ (minor|ui|display|cosmetic) ]] && ((complexity_score -= 1))
            ;;
        "documentation")
            # Documentation tasks are usually smaller
            ((complexity_score -= 1))
            [[ "$description" =~ (complete|comprehensive|full) ]] && ((complexity_score += 1))
            ;;
        "test"|"testing")
            # Test tasks vary widely
            [[ "$description" =~ (unit|simple) ]] && ((complexity_score -= 1))
            [[ "$description" =~ (integration|e2e|comprehensive) ]] && ((complexity_score += 1))
            ;;
    esac
    
    # Map complexity score to Fibonacci story points
    if [[ $complexity_score -le -1 ]]; then
        echo "1"
    elif [[ $complexity_score -eq 0 ]]; then
        echo "2"
    elif [[ $complexity_score -eq 1 ]]; then
        echo "3"
    elif [[ $complexity_score -le 3 ]]; then
        echo "5"
    elif [[ $complexity_score -le 5 ]]; then
        echo "8"
    elif [[ $complexity_score -le 7 ]]; then
        echo "13"
    else
        echo "21"
    fi
}

# Clear label cache (useful for testing)
clear_label_cache() {
    rm -rf "$CACHE_DIR"
    echo "Label cache cleared"
}

# Debug function to show available labels
show_available_labels() {
    local available_labels
    available_labels=$(get_available_labels)
    
    echo "Available labels in this repository:"
    if [[ -n "$available_labels" ]]; then
        echo "$available_labels" | sed 's/^/  - /'
    else
        echo "  (no labels found)"
    fi
}

# Main function for testing
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-}" in
        "show")
            show_available_labels
            ;;
        "clear")
            clear_label_cache
            ;;
        "test")
            echo "Testing label selection:"
            echo "Available labels: $(get_available_labels | tr '\n' ',' | sed 's/,$//')"
            echo ""
            echo "Test 1: Task: feature, complexity: simple, area: frontend"
            selected=$(select_task_labels "feature" "simple" "frontend")
            echo "Selected labels: $selected"
            get_label_feedback "enhancement,good-first-issue,frontend" "$selected"
            echo ""
            echo "Test 2: Task: bug, priority: high, area: backend"  
            # Note: Using area parameter for priority since we need to extend the function
            selected=$(select_task_labels "bug" "" "backend")
            # Manual test for priority
            priority_label=$(find_best_label_match "high" "$(get_available_labels)" "priority")
            if [[ -n "$priority_label" ]]; then
                selected="$selected,$priority_label"
            fi
            echo "Selected labels: $selected"
            get_label_feedback "bug,high-priority,backend" "$selected"
            ;;
        *)
            echo "Usage: $0 {show|clear|test}"
            echo "  show  - Display available repository labels"
            echo "  clear - Clear label cache"
            echo "  test  - Test label selection"
            ;;
    esac
fi