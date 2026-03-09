#!/bin/bash

# Graceful Degradation Library for LDC AI Framework
# Provides fallback strategies when MCP servers are unavailable

# Check if an MCP tool is available by attempting to call it
# Returns 0 if available, 1 if not
is_mcp_available() {
    local mcp_name="$1"

    # This is a documentation function - actual detection happens in Claude context
    # by attempting to use the MCP tool and catching errors
    echo "Check mcp__${mcp_name}__* tool availability"
}

# Code analysis strategies using native Claude tools
#
# For pattern search:
#   Grep(pattern="query", path="src/")
#
# For finding symbols/functions:
#   Grep(pattern="function functionName|def functionName|functionName =", path="src/")
#
# For reading files:
#   Read(file_path="path")
#
# For project analysis:
#   Task(subagent_type="Explore", prompt="Analyze project structure")

# Code analysis fallback patterns
get_code_analysis_fallback() {
    local analysis_type="$1"

    case "$analysis_type" in
        "security")
            cat << 'EOF'
# Security Analysis Fallback (no MCP required)
Grep(pattern="password|secret|api_key|token|credential", path="src/", output_mode="content")
Grep(pattern="eval|exec|innerHTML|dangerouslySetInnerHTML", path="src/", output_mode="content")
Grep(pattern="SELECT.*FROM|INSERT INTO|UPDATE.*SET", path="src/", output_mode="content")
EOF
            ;;
        "performance")
            cat << 'EOF'
# Performance Analysis Fallback (no MCP required)
Grep(pattern="console\\.log|debugger|print\\(", path="src/", output_mode="content")
Grep(pattern="setTimeout|setInterval", path="src/", output_mode="content")
Grep(pattern="\\bfor\\b.*\\bfor\\b", path="src/", output_mode="content")  # Nested loops
EOF
            ;;
        "quality")
            cat << 'EOF'
# Code Quality Fallback (no MCP required)
Grep(pattern="TODO|FIXME|HACK|XXX", path="src/", output_mode="content")
Grep(pattern="any|unknown", path="src/", type="ts", output_mode="content")  # TypeScript any usage
EOF
            ;;
        "structure")
            cat << 'EOF'
# Project Structure Fallback (no MCP required)
Glob(pattern="**/*.{ts,tsx,js,jsx,py}", path="src/")
Glob(pattern="**/test*/**/*.{ts,js,py}", path=".")
Glob(pattern="**/*.config.{ts,js,json}", path=".")
EOF
            ;;
        *)
            echo "Unknown analysis type: $analysis_type"
            return 1
            ;;
    esac
}

# MCP availability status for commands
declare -A MCP_STATUS=(
    ["github"]="unknown"
    ["memory"]="unknown"
    ["context7"]="unknown"
    ["brain"]="unknown"
    ["sequential-thinking"]="unknown"
    ["fetch"]="unknown"
)

# Update MCP status after detection
update_mcp_status() {
    local mcp_name="$1"
    local status="$2"  # "available" or "unavailable"

    MCP_STATUS["$mcp_name"]="$status"
}

# Get recommended action based on MCP availability
get_fallback_recommendation() {
    local missing_mcp="$1"

    case "$missing_mcp" in
        "github")
            echo "Use 'gh' CLI commands directly via Bash tool"
            ;;
        "memory")
            echo "Use local .ai/work/ logs for context persistence"
            ;;
        "context7")
            echo "Use WebSearch or WebFetch for documentation lookup"
            ;;
        "brain")
            echo "Use local .ai/work/ directory for session logs"
            ;;
        "sequential-thinking")
            echo "Use extended thinking keywords: 'think hard about...'"
            ;;
        "fetch")
            echo "Use WebFetch tool for web content retrieval"
            ;;
        *)
            echo "No specific fallback for: $missing_mcp"
            ;;
    esac
}

# Export functions
export -f is_mcp_available
export -f get_code_analysis_fallback
export -f update_mcp_status
export -f get_fallback_recommendation
