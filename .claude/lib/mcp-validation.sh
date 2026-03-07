#!/bin/bash

# MCP Configuration Validation Library for LDC AI Framework
# Validates MCP server configurations, connectivity, and required capabilities

# Source dependencies
source "$(dirname "$0")/error-handling.sh"

# MCP server requirements for LDC AI Framework
# Note: Serena removed in v2.0.0 - use Explore agent + Grep/Glob for code analysis
declare -A MCP_REQUIREMENTS=(
    ["github"]="required"
    ["memory"]="optional"
    ["sequential-thinking"]="optional"
    ["context7"]="optional"
    ["brain"]="optional"
    ["fetch"]="optional"
)

# MCP capability requirements
declare -A MCP_CAPABILITIES=(
    ["github"]="repos,issues,pulls,milestones,comments"
    ["memory"]="graph,entities,relations"
    ["sequential-thinking"]="reasoning,planning"
    ["context7"]="documentation,examples"
    ["brain"]="thought,decide,session,sentiment"
    ["fetch"]="web,content,api"
)

# MCP health check results cache
MCP_HEALTH_CACHE=""
MCP_HEALTH_TIMESTAMP=""
MCP_HEALTH_TTL=300  # 5 minutes cache

# Validate MCP configuration
validate_mcp_config() {
    log_info "Validating MCP server configuration..."
    
    local validation_passed=true
    local missing_required=()
    local available_servers=()
    local unavailable_servers=()
    
    # Check if claude command is available
    if ! command -v claude &> /dev/null; then
        handle_error 6 "Claude CLI not found" "Install Claude CLI to use MCP servers"
        return 6
    fi
    
    # Get list of configured MCP servers
    local mcp_list
    if ! mcp_list=$(claude mcp list 2>/dev/null); then
        handle_error 6 "Unable to list MCP servers" "Check Claude CLI configuration"
        return 6
    fi
    
    log_debug "MCP servers list obtained"
    
    # Parse and validate each server
    for server in "${!MCP_REQUIREMENTS[@]}"; do
        local requirement="${MCP_REQUIREMENTS[$server]}"
        local is_available=false
        
        # Check if server is in the list and connected
        if echo "$mcp_list" | grep -q "${server}.*✓ Connected"; then
            is_available=true
            available_servers+=("$server")
            log_info "✅ MCP server '$server' is available and connected"
        else
            unavailable_servers+=("$server")
            if [[ "$requirement" == "required" ]]; then
                missing_required+=("$server")
                validation_passed=false
                log_error "❌ Required MCP server '$server' is not available"
            else
                log_warn "⚠️ Optional MCP server '$server' is not available"
            fi
        fi
        
        # Validate server capabilities if available
        if [[ "$is_available" == true ]]; then
            validate_mcp_capabilities "$server"
        fi
    done
    
    # Report validation results
    echo ""
    echo "📊 MCP Configuration Validation Results"
    echo "========================================"
    
    if [[ ${#available_servers[@]} -gt 0 ]]; then
        echo "✅ Available MCP Servers (${#available_servers[@]}):"
        for server in "${available_servers[@]}"; do
            echo "  ✅ $server (${MCP_REQUIREMENTS[$server]})"
        done
        echo ""
    fi
    
    if [[ ${#unavailable_servers[@]} -gt 0 ]]; then
        echo "❌ Unavailable MCP Servers (${#unavailable_servers[@]}):"
        for server in "${unavailable_servers[@]}"; do
            local req_type="${MCP_REQUIREMENTS[$server]}"
            if [[ "$req_type" == "required" ]]; then
                echo "  ❌ $server ($req_type) - BLOCKS FRAMEWORK FUNCTIONALITY"
            else
                echo "  ⚠️ $server ($req_type) - Limited functionality"
            fi
        done
        echo ""
    fi
    
    # Provide installation guidance for missing required servers
    if [[ ${#missing_required[@]} -gt 0 ]]; then
        echo "🔧 Installation Required:"
        echo "The following required MCP servers must be installed:"
        echo ""
        
        for server in "${missing_required[@]}"; do
            case "$server" in
                "github")
                    echo "📦 GitHub MCP:"
                    echo "  npm install -g @anthropic-ai/mcp-server-github"
                    echo "  Configure in ~/.claude/mcp_servers.json with GitHub token"
                    ;;
            esac
            echo ""
        done
        
        echo "📖 Full installation guide: https://docs.anthropic.com/en/docs/claude-code/mcp"
    fi
    
    # Overall validation result
    if [[ "$validation_passed" == true ]]; then
        log_info "MCP configuration validation passed"
        echo "🎉 MCP Configuration: VALID"
        echo "✅ All required servers are available"
        return 0
    else
        log_error "MCP configuration validation failed"
        echo "❌ MCP Configuration: INVALID"
        echo "💥 Missing required MCP servers will limit framework functionality"
        return 1
    fi
}

# Validate specific MCP server capabilities
validate_mcp_capabilities() {
    local server="$1"
    local expected_capabilities="${MCP_CAPABILITIES[$server]}"
    
    if [[ -z "$expected_capabilities" ]]; then
        log_debug "No specific capabilities defined for $server"
        return 0
    fi
    
    log_debug "Validating capabilities for MCP server: $server"
    
    # Test basic connectivity with the server
    local test_result
    case "$server" in
        "github")
            test_result=$(test_github_mcp_capabilities)
            ;;
        "memory")
            test_result=$(test_memory_mcp_capabilities)
            ;;
        *)
            test_result="capabilities_unknown"
            ;;
    esac
    
    if [[ "$test_result" == "success" ]]; then
        log_info "✅ MCP server '$server' capabilities validated"
        return 0
    else
        log_warn "⚠️ MCP server '$server' capabilities could not be fully validated"
        return 1
    fi
}

# Test GitHub MCP capabilities
test_github_mcp_capabilities() {
    local temp_file=$(mktemp)
    chmod 600 "$temp_file"
    
    cat > "$temp_file" << 'EOF'
Please test GitHub MCP connectivity by checking:
- Can access GitHub API
- Repository permissions available
- Basic operations work (list, read)

Return "github_mcp_test_success" if working.
Use the GitHub MCP for this test.
EOF
    
    if timeout 10 claude < "$temp_file" 2>/dev/null | grep -q "github_mcp_test_success"; then
        cleanup_temp_resources "$temp_file"
        echo "success"
    else
        cleanup_temp_resources "$temp_file"
        echo "failed"
    fi
}

# Test Memory MCP capabilities
test_memory_mcp_capabilities() {
    local temp_file=$(mktemp)
    chmod 600 "$temp_file"
    
    cat > "$temp_file" << 'EOF'
Please test Memory MCP connectivity by checking:
- Knowledge graph access
- Entity operations
- Basic memory functions

Return "memory_mcp_test_success" if working.
Use the Memory MCP for this test.
EOF
    
    if timeout 10 claude < "$temp_file" 2>/dev/null | grep -q "memory_mcp_test_success"; then
        cleanup_temp_resources "$temp_file"
        echo "success"
    else
        cleanup_temp_resources "$temp_file"
        echo "failed"
    fi
}

# Get cached MCP health status
get_mcp_health_status() {
    local current_time=$(date +%s)
    
    # Check if cache is valid
    if [[ -n "$MCP_HEALTH_TIMESTAMP" ]] && [[ -n "$MCP_HEALTH_CACHE" ]]; then
        local cache_age=$((current_time - MCP_HEALTH_TIMESTAMP))
        if [[ $cache_age -lt $MCP_HEALTH_TTL ]]; then
            echo "$MCP_HEALTH_CACHE"
            return
        fi
    fi
    
    # Refresh health status
    log_debug "Refreshing MCP health status cache"
    
    local health_status="{"
    local server_count=0
    
    for server in "${!MCP_REQUIREMENTS[@]}"; do
        if [[ $server_count -gt 0 ]]; then
            health_status+=","
        fi
        
        local server_status="unhealthy"
        if claude mcp list 2>/dev/null | grep -q "${server}.*✓ Connected"; then
            server_status="healthy"
        fi
        
        health_status+="\"$server\":\"$server_status\""
        ((server_count++))
    done
    
    health_status+="}"
    
    # Update cache
    MCP_HEALTH_CACHE="$health_status"
    MCP_HEALTH_TIMESTAMP="$current_time"
    
    echo "$MCP_HEALTH_CACHE"
}

# Check if all required MCP servers are available
check_required_mcps() {
    local all_available=true
    
    for server in "${!MCP_REQUIREMENTS[@]}"; do
        local requirement="${MCP_REQUIREMENTS[$server]}"
        
        if [[ "$requirement" == "required" ]]; then
            if ! claude mcp list 2>/dev/null | grep -q "${server}.*✓ Connected"; then
                log_error "Required MCP server '$server' is not available"
                all_available=false
            fi
        fi
    done
    
    if [[ "$all_available" == true ]]; then
        log_info "All required MCP servers are available"
        return 0
    else
        log_error "Some required MCP servers are missing"
        return 1
    fi
}

# Auto-repair MCP configuration issues
auto_repair_mcp_config() {
    log_info "Attempting to auto-repair MCP configuration issues..."
    
    local repairs_attempted=0
    local repairs_successful=0
    
    # Check for common configuration issues
    
    # 1. Check if Claude CLI is properly authenticated
    if ! claude auth status &>/dev/null; then
        log_warn "Claude CLI authentication issue detected"
        echo "🔧 Attempting to refresh authentication..."
        
        if claude auth refresh &>/dev/null; then
            log_info "✅ Claude CLI authentication refreshed"
            ((repairs_attempted++))
            ((repairs_successful++))
        else
            log_error "❌ Failed to refresh Claude CLI authentication"
            ((repairs_attempted++))
        fi
    fi
    
    # 2. Check MCP server configurations
    local mcp_config_file="$HOME/.claude/mcp_servers.json"
    if [[ -f "$mcp_config_file" ]]; then
        log_debug "Found MCP configuration file: $mcp_config_file"
        
        # Validate JSON format
        if ! jq . "$mcp_config_file" >/dev/null 2>&1; then
            log_warn "Invalid JSON in MCP configuration file"
            echo "🔧 MCP configuration file has JSON syntax errors"
            echo "📁 Check file: $mcp_config_file"
            ((repairs_attempted++))
        else
            log_debug "MCP configuration file JSON is valid"
        fi
    else
        log_warn "MCP configuration file not found: $mcp_config_file"
        echo "🔧 Creating basic MCP configuration template..."
        
        mkdir -p "$(dirname "$mcp_config_file")"
        cat > "$mcp_config_file" << 'EOF'
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_github_token_here"
      }
    }
  }
}
EOF
        echo "📁 Created MCP configuration template at: $mcp_config_file"
        echo "🔧 Please update with your GitHub token and install required servers"
        ((repairs_attempted++))
    fi
    
    # 3. Restart MCP servers if needed
    if [[ $repairs_successful -gt 0 ]]; then
        log_info "Restarting MCP servers after configuration changes..."
        if claude mcp restart &>/dev/null; then
            log_info "✅ MCP servers restarted successfully"
            ((repairs_successful++))
        else
            log_warn "⚠️ Failed to restart MCP servers"
        fi
    fi
    
    # Report repair results
    echo ""
    echo "🔧 Auto-Repair Results:"
    echo "  Repairs attempted: $repairs_attempted"
    echo "  Repairs successful: $repairs_successful"
    
    if [[ $repairs_successful -gt 0 ]]; then
        echo "✅ Some issues were automatically resolved"
        echo "💡 Re-run validation to check current status"
    else
        echo "⚠️ No automatic repairs were possible"
        echo "📖 Manual configuration may be required"
    fi
    
    return $(( repairs_attempted > 0 ? 0 : 1 ))
}

# Generate MCP installation script
generate_mcp_install_script() {
    local install_script="/tmp/install_mcp_servers.sh"
    
    cat > "$install_script" << 'EOF'
#!/bin/bash

# Auto-generated MCP Server Installation Script
# Generated by LDC AI Framework MCP Validation

set -euo pipefail

echo "🚀 Installing Required MCP Servers for LDC AI Framework"
echo "======================================================="

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    echo "💡 Install Node.js from https://nodejs.org/"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed" 
    echo "💡 Install Python 3 from https://python.org/"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Install GitHub MCP Server
echo "📦 Installing GitHub MCP Server..."
if npm install -g @anthropic-ai/mcp-server-github; then
    echo "✅ GitHub MCP Server installed successfully"
else
    echo "❌ Failed to install GitHub MCP Server"
    exit 1
fi

# Optional: Install additional MCP servers
echo ""
echo "📦 Installing Optional MCP Servers..."

# Memory MCP
if pip install mcp-server-memory 2>/dev/null; then
    echo "✅ Memory MCP Server installed"
else
    echo "⚠️ Memory MCP Server installation failed (optional)"
fi

# Sequential Thinking MCP
if pip install mcp-server-sequential-thinking 2>/dev/null; then
    echo "✅ Sequential Thinking MCP Server installed"
else
    echo "⚠️ Sequential Thinking MCP Server installation failed (optional)"
fi

echo ""
echo "🎉 MCP Server Installation Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Configure GitHub token in ~/.claude/mcp_servers.json"
echo "2. Run 'claude mcp list' to verify server availability"
echo "3. Run MCP validation again with the framework"
echo ""
echo "📖 Full configuration guide: https://docs.anthropic.com/en/docs/claude-code/mcp"

EOF

    chmod +x "$install_script"
    echo "📋 MCP installation script generated: $install_script"
    echo "🔧 Run with: bash $install_script"
    
    return 0
}

# Export functions for use in other scripts
export -f validate_mcp_config validate_mcp_capabilities
export -f check_required_mcps get_mcp_health_status
export -f auto_repair_mcp_config generate_mcp_install_script
export -f test_github_mcp_capabilities test_memory_mcp_capabilities

# Export MCP configuration
export MCP_REQUIREMENTS MCP_CAPABILITIES