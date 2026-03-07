#!/bin/bash
# Memory Helpers Library
# Part of LDC AI Framework v2.0.0 - Proactive Developer Experience
#
# This library provides helper functions for working with the Memory MCP.
# It defines entity types, relation patterns, and common operations.
#
# Note: These functions output Memory MCP commands that Claude should execute.
# They are documentation/templates, not executable functions.

# ============================================
# ENTITY TYPES
# ============================================

# Standard entity types used in this framework
# Usage: Create entities with these types for consistency
ENTITY_TYPES=(
    "ArchitecturalDecision"    # Major design choices
    "Gotcha"                   # Known issues/workarounds
    "Pattern"                  # Code patterns/conventions
    "DeveloperPreference"      # Individual preferences
    "ProjectConfiguration"     # Project-level settings
    "KnowledgeBase"            # General learnings
    "SessionSummary"           # End-of-session learnings
)

# ============================================
# RELATION TYPES
# ============================================

# Standard relation types (use active voice)
RELATION_TYPES=(
    "decides"                  # Decision → Component
    "affects"                  # Gotcha → File/Component
    "applies_to"               # Pattern → Context
    "prefers"                  # Developer → Style
    "supersedes"               # NewDecision → OldDecision
    "relates_to"               # General relationship
    "learned_from"             # Knowledge → Issue/Session
)

# ============================================
# MEMORY QUERY PATTERNS
# ============================================

# These are JSON snippets for common Memory MCP queries

# Query for architectural decisions about a component
memory_query_decisions() {
    local component="$1"
    cat <<EOF
mcp__memory__search_nodes with query: "ArchitecturalDecision $component"
EOF
}

# Query for known gotchas in a file/component
memory_query_gotchas() {
    local component="$1"
    cat <<EOF
mcp__memory__search_nodes with query: "Gotcha $component"
EOF
}

# Query for patterns used in a context
memory_query_patterns() {
    local context="$1"
    cat <<EOF
mcp__memory__search_nodes with query: "Pattern $context"
EOF
}

# Query for developer preferences
memory_query_preferences() {
    local developer="$1"
    cat <<EOF
mcp__memory__search_nodes with query: "DeveloperPreference $developer"
EOF
}

# ============================================
# MEMORY CREATE PATTERNS
# ============================================

# Template for creating an architectural decision
memory_create_decision() {
    local name="$1"
    local observations="$2"
    cat <<EOF
mcp__memory__create_entities with:
{
  "entities": [{
    "name": "$name",
    "entityType": "ArchitecturalDecision",
    "observations": ["$observations"]
  }]
}
EOF
}

# Template for creating a gotcha
memory_create_gotcha() {
    local name="$1"
    local description="$2"
    local workaround="$3"
    cat <<EOF
mcp__memory__create_entities with:
{
  "entities": [{
    "name": "$name",
    "entityType": "Gotcha",
    "observations": [
      "Issue: $description",
      "Workaround: $workaround"
    ]
  }]
}
EOF
}

# Template for creating a pattern
memory_create_pattern() {
    local name="$1"
    local context="$2"
    local example="$3"
    cat <<EOF
mcp__memory__create_entities with:
{
  "entities": [{
    "name": "$name",
    "entityType": "Pattern",
    "observations": [
      "Context: $context",
      "Example: $example"
    ]
  }]
}
EOF
}

# Template for end-of-session summary
memory_create_session_summary() {
    local date="$1"
    local learnings="$2"
    cat <<EOF
mcp__memory__create_entities with:
{
  "entities": [{
    "name": "Session-$date",
    "entityType": "SessionSummary",
    "observations": ["$learnings"]
  }]
}
EOF
}

# ============================================
# PROACTIVE MEMORY CHECKLIST
# ============================================

# Print the proactive memory checklist
proactive_memory_checklist() {
    cat <<EOF
╔══════════════════════════════════════════════════════════════╗
║              🧠 PROACTIVE MEMORY CHECKLIST                    ║
╚══════════════════════════════════════════════════════════════╝

QUERY MEMORY BEFORE:
────────────────────
□ Making architectural decisions → Search "ArchitecturalDecision {component}"
□ Working on a file → Search "Gotcha {filename}"
□ Implementing a pattern → Search "Pattern {context}"
□ Writing code for a developer → Search "DeveloperPreference {username}"

STORE IN MEMORY WHEN:
─────────────────────
□ Making a significant design choice → Create ArchitecturalDecision
□ Discovering a bug/workaround → Create Gotcha
□ Establishing a convention → Create Pattern
□ Learning a developer's style → Create DeveloperPreference
□ Ending a session with learnings → Create SessionSummary

PROACTIVE BEHAVIORS:
────────────────────
□ "I notice you're working on {component}. Let me check if there are
   any previous decisions or gotchas I should know about..."

□ "This looks like an architectural decision. Should I save it to
   memory for future reference?"

□ "We've established a pattern here. Want me to document it so
   future sessions follow the same approach?"

□ "End of session - saving key learnings to memory..."
EOF
}

# ============================================
# USAGE INSTRUCTIONS FOR CLAUDE
# ============================================

show_memory_instructions() {
    cat <<EOF
# Memory MCP Usage Guide for Claude

## When Starting Work on a Component

1. ALWAYS query memory first:
   - Search for ArchitecturalDecisions about the component
   - Search for Gotchas that might affect it
   - Search for Patterns that apply

2. Inform the user what you found:
   "I found these previous decisions about {component}:
    - {decision 1}
    - {decision 2}
   I'll make sure to follow these."

## When Making Decisions

1. ASK if it should be saved:
   "This seems like an important architectural decision.
    Should I save it to memory for future sessions?"

2. If yes, create the entity with clear observations

## When Discovering Issues

1. CREATE a Gotcha immediately:
   "I found a gotcha with {component} - saving to memory
    so we don't hit this issue again."

## At End of Session

1. SUMMARIZE learnings:
   "Key learnings from this session:
    - {learning 1}
    - {learning 2}
   Saving to memory."

EOF
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-}" in
        checklist)
            proactive_memory_checklist
            ;;
        instructions)
            show_memory_instructions
            ;;
        *)
            echo "Memory Helpers Library"
            echo "Usage: $0 {checklist|instructions}"
            echo ""
            echo "This library provides templates for Memory MCP usage."
            echo "Source it in other scripts or run with a subcommand."
            ;;
    esac
fi
