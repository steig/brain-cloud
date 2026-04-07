#!/bin/bash

# LDC AI Multi-Project MCP Configuration Manager
# Generates project-specific MCP configurations with proper port isolation

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PORT_MANAGER="$SCRIPT_DIR/port-manager.sh"
readonly SERVER_CATEGORIES="$SCRIPT_DIR/server-categories.json"
readonly CLAUDE_SETTINGS_TEMPLATE="$SCRIPT_DIR/claude-settings-template.json"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[MCP-CONFIG]${NC} $1"; }
log_success() { echo -e "${GREEN}[MCP-CONFIG]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[MCP-CONFIG]${NC} $1"; }
log_error() { echo -e "${RED}[MCP-CONFIG]${NC} $1"; }

# Ensure dependencies exist
check_dependencies() {
    if [[ ! -f "$PORT_MANAGER" ]]; then
        log_error "Port manager not found: $PORT_MANAGER"
        return 1
    fi
    
    if [[ ! -f "$SERVER_CATEGORIES" ]]; then
        log_error "Server categories file not found: $SERVER_CATEGORIES"
        return 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is required for configuration generation"
        return 1
    fi
    
    return 0
}

# Generate project-specific Claude settings
generate_claude_settings() {
    local project_path="$1"
    local output_file="${2:-.claude/settings.local.json}"
    
    # Ensure absolute path
    project_path="$(cd "$project_path" && pwd)"
    
    log_info "Generating Claude settings for: $project_path"
    
    # Get project port range (capture only the last line which contains the range)
    local port_range
    if ! port_range=$("$PORT_MANAGER" get "$project_path" 2>/dev/null | tail -1); then
        log_error "Failed to allocate ports for project"
        return 1
    fi
    
    log_info "Allocated port range: $port_range"
    
    # Create output directory if needed
    mkdir -p "$(dirname "$output_file")"
    
    # Generate configuration using Python
    python3 << EOF
import json
import os
from pathlib import Path

# Load server categories
with open('$SERVER_CATEGORIES', 'r') as f:
    categories = json.load(f)

# Parse port range
port_range = '$port_range'
start_port, end_port = map(int, port_range.split(':'))

project_path = '$project_path'
output_file = '$output_file'

# Read existing settings if available
existing_settings = {}
if os.path.exists(output_file):
    try:
        with open(output_file, 'r') as f:
            existing_settings = json.load(f)
    except:
        pass

# Create new configuration
config = {
    "_note": f"Auto-generated MCP configuration for {os.path.basename(project_path)}",
    "_project_path": project_path,
    "_port_range": port_range,
    "_generated_at": "$(date -Iseconds)",
    "permissions": existing_settings.get("permissions", {
        "allow": [
            "mcp__github__*",
            "mcp__memory__*",
            "mcp__sequential-thinking__*",
            "mcp__context7__*",
            "mcp__fetch__*",
            "mcp__playwright__*",
            "mcp__brain-cloud__*",
            "Bash(git:*)",
            "Bash(gh:*)",
            "Bash(uvx:*)",
            "Bash(npx:*)",
            "Bash(node:*)",
            "Bash(python:*)"
        ],
        "deny": []
    }),
    "mcpServers": {}
}

# Add global shared servers (fixed ports)
global_servers = categories['server_categories']['global_shared']['servers']
for server_name, server_config in global_servers.items():
    config['mcpServers'][server_name] = {
        "command": server_config['command'],
        "args": server_config['args']
    }
    
    # Add environment variables if required
    if server_config.get('requires_env'):
        config['mcpServers'][server_name]['env'] = {}
        for env_var in server_config['requires_env']:
            if env_var == 'GITHUB_PERSONAL_ACCESS_TOKEN':
                config['mcpServers'][server_name]['env'][env_var] = os.getenv(env_var, "")

# Add project-specific servers (dynamic ports)
project_servers = categories['server_categories']['project_specific']['servers']
for server_name, server_config in project_servers.items():
    port_offset = server_config.get('port_offset', 0)
    server_port = start_port + port_offset
    
    # Skip if port would exceed allocated range
    if server_port > end_port:
        continue
    
    mcp_config = {
        "command": server_config['command'],
        "args": server_config['args'].copy()
    }
    
    # Add port argument for servers that support it
    if server_config['command'] in ['uvx', 'npx']:
        # For most MCP servers, port is handled via environment or args
        pass
    
    # Add environment variables
    env_vars = {}
    if server_config.get('requires_env'):
        for env_var in server_config['requires_env']:
            if env_var == 'PROJECT_PATH':
                env_vars[env_var] = project_path
            elif env_var == 'PROJECT_ROOT':
                env_vars[env_var] = project_path
            elif env_var == 'DB_PATH':
                data_dir = server_config.get('data_dir', '.ai/mcp/data')
                db_path = os.path.join(project_path, data_dir, f"{server_name}.db")
                env_vars[env_var] = db_path
                # Ensure data directory exists
                os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # Add data directory environment for memory server
    if server_name == 'memory':
        data_dir = os.path.join(project_path, '.ai/mcp/memory')
        os.makedirs(data_dir, exist_ok=True)
        env_vars['MEMORY_DB_PATH'] = os.path.join(data_dir, 'db.json')
    
    if env_vars:
        mcp_config['env'] = env_vars
    
    config['mcpServers'][server_name] = mcp_config

# Write configuration
with open(output_file, 'w') as f:
    json.dump(config, f, indent=2)

print(f"Configuration written to: {output_file}")
print(f"Project port range: {port_range}")
print(f"Configured servers: {list(config['mcpServers'].keys())}")
EOF
    
    log_success "Claude settings generated: $output_file"
}

# Generate MCP server startup script
generate_startup_script() {
    local project_path="$1"
    local script_file="${2:-manage-mcp.sh}"
    
    # Ensure absolute path
    project_path="$(cd "$project_path" && pwd)"
    
    log_info "Generating MCP startup script for: $project_path"
    
    # Get project port range (capture only the last line which contains the range)
    local port_range
    if ! port_range=$("$PORT_MANAGER" get "$project_path" 2>/dev/null | tail -1); then
        log_error "Failed to get ports for project"
        return 1
    fi
    
    cat > "$script_file" << 'EOF'
#!/bin/bash

# Multi-Project MCP Server Manager
# Auto-generated for project-specific MCP server isolation

set -euo pipefail

# Configuration
PROJECT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_CONFIG_DIR="$PROJECT_PATH/.ai/mcp"
PID_DIR="$MCP_CONFIG_DIR/pids"
LOG_DIR="$MCP_CONFIG_DIR/logs"
DATA_DIR="$MCP_CONFIG_DIR/data"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[MCP]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Create directories
mkdir -p "$PID_DIR" "$LOG_DIR" "$DATA_DIR"

# Project-specific server configuration
EOF
    
    # Add project-specific port range information
    echo "PROJECT_PORT_RANGE=\"$port_range\"" >> "$script_file"
    echo "PROJECT_PATH_ABS=\"$project_path\"" >> "$script_file"
    echo >> "$script_file"
    
    # Add server management functions
    cat >> "$script_file" << 'EOF'
# Start project-specific MCP servers
start_project_servers() {
    log "Starting project-specific MCP servers for $(basename "$PROJECT_PATH_ABS")"
    
    local start_port="${PROJECT_PORT_RANGE%:*}"
    local end_port="${PROJECT_PORT_RANGE#*:}"
    
    info "Port range: $start_port-$end_port"
    
    # Start Memory MCP (project-specific)
    local memory_port=$((start_port + 0))
    export MEMORY_DB_PATH="$DATA_DIR/memory.json"
    if start_server "memory" "$memory_port" "npx -y @modelcontextprotocol/server-memory"; then
        log "Memory MCP started on port $memory_port"
    fi
    
    # Add filesystem if needed
    # local fs_port=$((start_port + 2))
    # if start_server "filesystem" "$fs_port" "uvx run mcp-server-filesystem $PROJECT_PATH_ABS"; then
    #     log "Filesystem MCP started on port $fs_port"
    # fi
}

# Start individual server
start_server() {
    local name="$1"
    local port="$2"
    local command="$3"
    
    local pid_file="$PID_DIR/$name.pid"
    local log_file="$LOG_DIR/$name.log"
    
    # Check if already running
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            warn "$name already running (PID: $pid)"
            return 0
        else
            rm -f "$pid_file"
        fi
    fi
    
    # Check port availability
    if lsof -i TCP:$port >/dev/null 2>&1; then
        error "Port $port is already in use"
        return 1
    fi
    
    # Start server
    info "Starting $name on port $port..."
    cd "$PROJECT_PATH_ABS"
    
    # Set environment
    export PROJECT_PATH="$PROJECT_PATH_ABS"
    export MCP_PORT="$port"
    
    # Start server in background
    eval "$command" > "$log_file" 2>&1 &
    local server_pid=$!
    
    # Save PID
    echo "$server_pid" > "$pid_file"
    
    # Wait and verify
    sleep 3
    if ps -p "$server_pid" > /dev/null 2>&1; then
        log "$name started successfully (PID: $server_pid, Port: $port)"
        return 0
    else
        error "$name failed to start - check $log_file"
        rm -f "$pid_file"
        return 1
    fi
}

# Stop all servers
stop_servers() {
    log "Stopping MCP servers..."
    
    for pid_file in "$PID_DIR"/*.pid; do
        [[ -f "$pid_file" ]] || continue
        
        local name=$(basename "$pid_file" .pid)
        local pid=$(cat "$pid_file" 2>/dev/null || echo "")
        
        if [[ -n "$pid" ]] && ps -p "$pid" > /dev/null 2>&1; then
            log "Stopping $name (PID: $pid)"
            kill "$pid" 2>/dev/null || true
            
            # Wait for graceful shutdown
            local timeout=10
            while [[ $timeout -gt 0 ]] && ps -p "$pid" > /dev/null 2>&1; do
                sleep 1
                ((timeout--))
            done
            
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                warn "Force killing $name"
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
        
        rm -f "$pid_file"
    done
}

# Show server status
show_status() {
    log "MCP Server Status for $(basename "$PROJECT_PATH_ABS")"
    echo "Port Range: $PROJECT_PORT_RANGE"
    echo
    
    local running=0
    local total=0
    
    for pid_file in "$PID_DIR"/*.pid; do
        if [[ -f "$pid_file" ]]; then
            local name=$(basename "$pid_file" .pid)
            local pid=$(cat "$pid_file" 2>/dev/null || echo "")
            ((total++))
            
            if [[ -n "$pid" ]] && ps -p "$pid" > /dev/null 2>&1; then
                echo -e "  ${GREEN}●${NC} $name (PID: $pid)"
                ((running++))
            else
                echo -e "  ${RED}●${NC} $name (stopped)"
                rm -f "$pid_file"
            fi
        fi
    done
    
    if [[ $total -eq 0 ]]; then
        echo "  No servers configured"
    else
        echo
        echo "Status: $running/$total servers running"
    fi
}

# Show logs
show_logs() {
    local server="${1:-all}"
    
    if [[ "$server" == "all" ]]; then
        for log_file in "$LOG_DIR"/*.log; do
            [[ -f "$log_file" ]] || continue
            local name=$(basename "$log_file" .log)
            echo "=== $name ==="
            tail -20 "$log_file" 2>/dev/null || echo "No logs"
            echo
        done
    else
        local log_file="$LOG_DIR/$server.log"
        if [[ -f "$log_file" ]]; then
            tail -f "$log_file"
        else
            error "Log file not found for $server"
            return 1
        fi
    fi
}

# Restart servers
restart_servers() {
    stop_servers
    sleep 2
    start_project_servers
}

# Main command handling
case "${1:-help}" in
    "start")
        start_project_servers
        ;;
    "stop")
        stop_servers
        ;;
    "restart")
        restart_servers
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "${2:-all}"
        ;;
    "help"|*)
        echo "Multi-Project MCP Server Manager"
        echo "Project: $(basename "$PROJECT_PATH_ABS")"
        echo "Port Range: $PROJECT_PORT_RANGE"
        echo
        echo "Usage: $0 <command>"
        echo
        echo "Commands:"
        echo "  start    - Start project-specific MCP servers"
        echo "  stop     - Stop all MCP servers"
        echo "  restart  - Restart all MCP servers"
        echo "  status   - Show server status"
        echo "  logs [server] - Show logs (all or specific server)"
        echo
        ;;
esac
EOF
    
    chmod +x "$script_file"
    log_success "MCP startup script generated: $script_file"
}

# Setup project MCP isolation
setup_project() {
    local project_path="${1:-.}"
    local force="${2:-false}"
    
    # Ensure absolute path
    project_path="$(cd "$project_path" && pwd)"
    
    log_info "Setting up MCP isolation for project: $project_path"
    
    # Check if already configured
    if [[ -f "$project_path/.claude/settings.local.json" && "$force" != "true" ]]; then
        local has_mcp_config
        has_mcp_config=$(python3 -c "
import json
try:
    with open('$project_path/.claude/settings.local.json', 'r') as f:
        config = json.load(f)
    print('true' if 'mcpServers' in config else 'false')
except:
    print('false')
")
        
        if [[ "$has_mcp_config" == "true" ]]; then
            log_warning "Project already has MCP configuration. Use --force to overwrite."
            return 1
        fi
    fi
    
    # Create MCP directory structure
    mkdir -p "$project_path/.ai/mcp"/{logs,pids,data,memory,sqlite}
    
    # Generate Claude settings
    if ! generate_claude_settings "$project_path" "$project_path/.claude/settings.local.json"; then
        log_error "Failed to generate Claude settings"
        return 1
    fi
    
    # Generate startup script
    if ! generate_startup_script "$project_path" "$project_path/manage-mcp.sh"; then
        log_error "Failed to generate startup script"
        return 1
    fi
    
    # Create project-specific port allocation  
    local port_range
    if ! port_range=$("$PORT_MANAGER" get "$project_path" 2>/dev/null | tail -1); then
        log_error "Failed to allocate ports"
        return 1
    fi
    
    log_success "Project MCP isolation setup complete!"
    log_info "Port range: $port_range"
    log_info "Configuration: .claude/settings.local.json"
    log_info "Management: ./manage-mcp.sh"
    
    echo
    echo -e "${BOLD}Next steps:${NC}"
    echo "1. Start MCP servers: ${BLUE}./manage-mcp.sh start${NC}"
    echo "2. Check status: ${BLUE}./manage-mcp.sh status${NC}"
    echo "3. Test in Claude: ${BLUE}/initialize${NC}"
}

# List project configurations
list_projects() {
    log_info "Listing configured projects..."
    "$PORT_MANAGER" list
}

# Cleanup project configuration
cleanup_project() {
    local project_path="${1:-.}"
    
    # Ensure absolute path
    project_path="$(cd "$project_path" && pwd)"
    
    log_info "Cleaning up project MCP configuration: $project_path"
    
    # Stop servers if running
    if [[ -f "$project_path/manage-mcp.sh" ]]; then
        log_info "Stopping MCP servers..."
        cd "$project_path"
        ./manage-mcp.sh stop 2>/dev/null || true
    fi
    
    # Remove MCP-related files
    rm -rf "$project_path/.ai/mcp"
    rm -f "$project_path/manage-mcp.sh"
    
    # Clean up port allocation
    "$PORT_MANAGER" cleanup
    
    log_success "Project cleanup complete"
}

# Main command handling
check_dependencies || exit 1

case "${1:-help}" in
    "setup")
        setup_project "${2:-.}" "${3:-false}"
        ;;
    "generate-settings")
        generate_claude_settings "${2:-.}" "${3:-.claude/settings.local.json}"
        ;;
    "generate-script")
        generate_startup_script "${2:-.}" "${3:-manage-mcp.sh}"
        ;;
    "list")
        list_projects
        ;;
    "cleanup")
        cleanup_project "${2:-.}"
        ;;
    "help"|*)
        echo -e "${BOLD}LDC AI Multi-Project MCP Configuration Manager${NC}"
        echo
        echo "Usage: $0 <command> [options]"
        echo
        echo "Commands:"
        echo "  setup [project_path] [force]          - Setup MCP isolation for project"
        echo "  generate-settings [project] [output]  - Generate Claude settings only"
        echo "  generate-script [project] [output]    - Generate startup script only"
        echo "  list                                  - List configured projects"
        echo "  cleanup [project_path]                - Remove project MCP configuration"
        echo
        echo "Examples:"
        echo "  $0 setup                              # Setup current project"
        echo "  $0 setup /path/to/project             # Setup specific project"
        echo "  $0 setup . true                      # Force setup (overwrite existing)"
        echo "  $0 list                               # List all projects"
        echo "  $0 cleanup                            # Cleanup current project"
        echo
        ;;
esac