#!/bin/bash

# LDC AI Multi-Project MCP Port Manager
# Provides hash-based port allocation and conflict resolution for multi-project MCP server isolation

set -euo pipefail

# Configuration
readonly MCP_PORT_RANGE_START=3000
readonly MCP_PORT_RANGE_END=3999
readonly MCP_PORTS_PER_PROJECT=10
readonly MCP_CONFIG_DIR=".ai/mcp"
readonly PORT_REGISTRY_FILE="$HOME/.ldc-ai-port-registry.json"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[MCP-PORT]${NC} $1"; }
log_success() { echo -e "${GREEN}[MCP-PORT]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[MCP-PORT]${NC} $1"; }
log_error() { echo -e "${RED}[MCP-PORT]${NC} $1"; }

# Generate hash-based port range for a project
generate_project_port_range() {
    local project_path="$1"
    local project_hash
    
    # Create deterministic hash of the absolute project path
    project_hash=$(echo -n "$project_path" | shasum -a 256 | cut -d' ' -f1)
    
    # Extract first 8 characters and convert to decimal
    local hash_segment="${project_hash:0:8}"
    local hash_decimal=$((0x${hash_segment}))
    
    # Calculate port range (ensure we stay within bounds)
    local max_projects=$(( (MCP_PORT_RANGE_END - MCP_PORT_RANGE_START + 1) / MCP_PORTS_PER_PROJECT ))
    local range_index=$((hash_decimal % max_projects))
    local start_port=$((MCP_PORT_RANGE_START + (range_index * MCP_PORTS_PER_PROJECT)))
    local end_port=$((start_port + MCP_PORTS_PER_PROJECT - 1))
    
    echo "${start_port}:${end_port}"
}

# Check if a port is available
is_port_available() {
    local port="$1"
    ! lsof -i TCP:${port} >/dev/null 2>&1
}

# Validate port range availability
validate_port_range() {
    local port_range="$1"
    local start_port="${port_range%:*}"
    local end_port="${port_range#*:}"
    
    local unavailable_ports=()
    
    for ((port=start_port; port<=end_port; port++)); do
        if ! is_port_available "$port"; then
            unavailable_ports+=("$port")
        fi
    done
    
    if [[ ${#unavailable_ports[@]} -eq 0 ]]; then
        return 0  # All ports available
    else
        log_warning "Ports in use: ${unavailable_ports[*]}"
        return 1  # Some ports unavailable
    fi
}

# Find next available port range
find_available_port_range() {
    local start_search=${1:-$MCP_PORT_RANGE_START}
    
    log_info "Searching for available port range starting from $start_search..."
    
    for ((range_start=start_search; range_start<=(MCP_PORT_RANGE_END-MCP_PORTS_PER_PROJECT); range_start+=MCP_PORTS_PER_PROJECT)); do
        local range_end=$((range_start + MCP_PORTS_PER_PROJECT - 1))
        local port_range="${range_start}:${range_end}"
        
        if validate_port_range "$port_range"; then
            echo "$port_range"
            return 0
        fi
    done
    
    log_error "No available port ranges found in ${MCP_PORT_RANGE_START}-${MCP_PORT_RANGE_END}"
    return 1
}

# Read port registry
read_port_registry() {
    if [[ -f "$PORT_REGISTRY_FILE" ]]; then
        cat "$PORT_REGISTRY_FILE"
    else
        echo "{}"
    fi
}

# Write port registry
write_port_registry() {
    local registry_data="$1"
    echo "$registry_data" > "$PORT_REGISTRY_FILE"
}

# Register project port allocation
register_project_ports() {
    local project_path="$1"
    local port_range="$2"
    
    local registry_data
    registry_data=$(read_port_registry)
    
    # Use Python to update JSON registry
    python3 << EOF
import json
import sys
from datetime import datetime

registry = $registry_data

# Add or update project entry
registry["$project_path"] = {
    "port_range": "$port_range",
    "allocated_at": datetime.now().isoformat(),
    "last_used": datetime.now().isoformat(),
    "status": "active"
}

print(json.dumps(registry, indent=2))
EOF
}

# Get project ports (with fallback allocation)
get_project_ports() {
    local project_path="$1"
    local force_reallocate="${2:-false}"
    
    # Ensure absolute path
    project_path="$(cd "$project_path" && pwd)"
    
    log_info "Getting ports for project: $project_path"
    
    # Check if already registered
    local registry_data
    registry_data=$(read_port_registry)
    
    local existing_range
    existing_range=$(echo "$registry_data" | python3 -c "
import json, sys
registry = json.load(sys.stdin)
project = registry.get('$project_path', {})
print(project.get('port_range', ''))
")
    
    if [[ -n "$existing_range" && "$force_reallocate" != "true" ]]; then
        # Validate existing range is still available
        if validate_port_range "$existing_range"; then
            log_success "Using existing port range: $existing_range"
            
            # Update last_used timestamp
            local updated_registry
            updated_registry=$(register_project_ports "$project_path" "$existing_range")
            write_port_registry "$updated_registry"
            
            echo "$existing_range"
            return 0
        else
            log_warning "Existing port range $existing_range has conflicts, reallocating..."
        fi
    fi
    
    # Generate hash-based port range
    local preferred_range
    preferred_range=$(generate_project_port_range "$project_path")
    
    log_info "Hash-based port range: $preferred_range"
    
    if validate_port_range "$preferred_range"; then
        log_success "Using hash-based port range: $preferred_range"
        local updated_registry
        updated_registry=$(register_project_ports "$project_path" "$preferred_range")
        write_port_registry "$updated_registry"
        echo "$preferred_range"
        return 0
    fi
    
    # Fallback to dynamic allocation
    log_warning "Hash-based range unavailable, finding alternative..."
    local fallback_range
    if fallback_range=$(find_available_port_range); then
        log_success "Using fallback port range: $fallback_range"
        local updated_registry
        updated_registry=$(register_project_ports "$project_path" "$fallback_range")
        write_port_registry "$updated_registry"
        echo "$fallback_range"
        return 0
    else
        log_error "Unable to allocate ports for project"
        return 1
    fi
}

# Allocate specific port for MCP server
allocate_mcp_port() {
    local project_path="$1"
    local server_name="$2"
    local preferred_offset="${3:-0}"
    
    local port_range
    port_range=$(get_project_ports "$project_path")
    
    if [[ -z "$port_range" ]]; then
        log_error "No port range available for project"
        return 1
    fi
    
    local start_port="${port_range%:*}"
    local allocated_port=$((start_port + preferred_offset))
    
    # Ensure we don't exceed the range
    local end_port="${port_range#*:}"
    if [[ $allocated_port -gt $end_port ]]; then
        allocated_port=$start_port
    fi
    
    # Find available port within range if preferred is taken
    local max_attempts=10
    local attempts=0
    
    while ! is_port_available "$allocated_port" && [[ $attempts -lt $max_attempts ]]; do
        allocated_port=$((allocated_port + 1))
        if [[ $allocated_port -gt $end_port ]]; then
            allocated_port=$start_port
        fi
        ((attempts++))
    done
    
    if is_port_available "$allocated_port"; then
        log_success "Allocated port $allocated_port for $server_name"
        echo "$allocated_port"
        return 0
    else
        log_error "No available ports in range $port_range for $server_name"
        return 1
    fi
}

# Show port allocation status
show_port_status() {
    local project_path="${1:-$(pwd)}"
    project_path="$(cd "$project_path" && pwd)"
    
    echo -e "${BOLD}MCP Port Allocation Status${NC}"
    echo "Project: $project_path"
    echo
    
    local registry_data
    registry_data=$(read_port_registry)
    
    local project_range
    project_range=$(echo "$registry_data" | python3 -c "
import json, sys
registry = json.load(sys.stdin)
project = registry.get('$project_path', {})
print(project.get('port_range', 'Not allocated'))
")
    
    echo "Allocated Range: $project_range"
    
    if [[ "$project_range" != "Not allocated" ]]; then
        local start_port="${project_range%:*}"
        local end_port="${project_range#*:}"
        
        echo "Port Status:"
        for ((port=start_port; port<=end_port; port++)); do
            if is_port_available "$port"; then
                echo -e "  ${GREEN}●${NC} $port - Available"
            else
                echo -e "  ${RED}●${NC} $port - In Use"
            fi
        done
    fi
}

# List all project allocations
list_all_allocations() {
    echo -e "${BOLD}All Project Port Allocations${NC}"
    echo
    
    local registry_data
    registry_data=$(read_port_registry)
    
    python3 << EOF
import json
from datetime import datetime

registry = $registry_data

if not registry:
    print("No projects registered")
    exit()

for project_path, info in registry.items():
    port_range = info.get('port_range', 'Unknown')
    allocated_at = info.get('allocated_at', 'Unknown')
    last_used = info.get('last_used', 'Unknown')
    status = info.get('status', 'Unknown')
    
    print(f"Project: {project_path}")
    print(f"  Range: {port_range}")
    print(f"  Status: {status}")
    print(f"  Last Used: {last_used}")
    print()
EOF
}

# Clean up unused allocations
cleanup_allocations() {
    log_info "Cleaning up unused port allocations..."
    
    local registry_data
    registry_data=$(read_port_registry)
    
    local updated_registry
    updated_registry=$(python3 << EOF
import json
from datetime import datetime, timedelta
import os

registry = $registry_data
active_registry = {}

for project_path, info in registry.items():
    # Check if project directory still exists
    if os.path.exists(project_path):
        # Check if any ports in range are in use
        port_range = info.get('port_range', '')
        if ':' in port_range:
            start_port, end_port = map(int, port_range.split(':'))
            # For now, keep all existing projects - future enhancement could check actual usage
            active_registry[project_path] = info
        else:
            print(f"Removing invalid port range for {project_path}")
    else:
        print(f"Removing allocation for non-existent project: {project_path}")

print(json.dumps(active_registry, indent=2))
EOF
)
    
    write_port_registry "$updated_registry"
    log_success "Cleanup completed"
}

# Main command handling
case "${1:-help}" in
    "get")
        if [[ -n "${2:-}" ]]; then
            get_project_ports "$2" "${3:-false}"
        else
            get_project_ports "$(pwd)"
        fi
        ;;
    "allocate")
        if [[ -n "${2:-}" && -n "${3:-}" ]]; then
            allocate_mcp_port "${2:-$(pwd)}" "$3" "${4:-0}"
        else
            log_error "Usage: $0 allocate <project_path> <server_name> [offset]"
            exit 1
        fi
        ;;
    "status")
        show_port_status "${2:-$(pwd)}"
        ;;
    "list")
        list_all_allocations
        ;;
    "cleanup")
        cleanup_allocations
        ;;
    "help"|*)
        echo -e "${BOLD}LDC AI Multi-Project MCP Port Manager${NC}"
        echo
        echo "Usage: $0 <command> [options]"
        echo
        echo "Commands:"
        echo "  get [project_path]                    - Get port range for project"
        echo "  allocate <project_path> <server> [offset] - Allocate specific port for MCP server"  
        echo "  status [project_path]                 - Show port allocation status"
        echo "  list                                  - List all project allocations"
        echo "  cleanup                               - Remove unused allocations"
        echo
        echo "Examples:"
        echo "  $0 get                                # Get ports for current project"
        echo "  $0 get /path/to/project               # Get ports for specific project"
        echo "  $0 allocate . memory 0                # Allocate port for Memory MCP (offset 0)"
        echo "  $0 allocate . sqlite 1                # Allocate port for SQLite MCP (offset 1)"
        echo "  $0 status                             # Show current project status"
        echo "  $0 list                               # List all projects"
        echo
        echo "Port Range: ${MCP_PORT_RANGE_START}-${MCP_PORT_RANGE_END}"
        echo "Ports per Project: ${MCP_PORTS_PER_PROJECT}"
        ;;
esac