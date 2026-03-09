#!/bin/bash

# LDC AI Multi-Project MCP Migration Script
# Migrates existing projects to use MCP server isolation system

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly CONFIG_MANAGER="$SCRIPT_DIR/config-manager.sh"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[MIGRATE]${NC} $1"; }
log_success() { echo -e "${GREEN}[MIGRATE]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[MIGRATE]${NC} $1"; }
log_error() { echo -e "${RED}[MIGRATE]${NC} $1"; }
log_header() { echo -e "${BOLD}${BLUE}$1${NC}"; }

# Show header
show_header() {
    echo
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}  LDC AI Multi-Project MCP Migration${NC}"
    echo -e "${BOLD}${BLUE}  Isolate MCP servers for clean multi-project workflow${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════${NC}"
    echo
}

# Detect potential project directories
detect_projects() {
    log_info "Detecting potential Claude Code projects..."
    
    local projects=()
    local search_dirs=(
        "$HOME/code"
        "$HOME/projects" 
        "$HOME/dev"
        "$HOME/workspace"
        "$HOME/Documents"
        "/Users/$USER/code"
        "/Users/$USER/projects"
    )
    
    for search_dir in "${search_dirs[@]}"; do
        if [[ -d "$search_dir" ]]; then
            while IFS= read -r -d '' project_dir; do
                # Check if it's a Claude Code project
                if [[ -d "$project_dir/.claude" ]] || [[ -d "$project_dir/.ai" ]]; then
                    projects+=("$project_dir")
                fi
            done < <(find "$search_dir" -maxdepth 2 -type d \( -name ".claude" -o -name ".ai" \) -print0 2>/dev/null | sed 's|/\.claude$||g; s|/\.ai$||g' | sort -u -z)
        fi
    done
    
    # Remove duplicates and ensure they exist
    local unique_projects=()
    for project in "${projects[@]}"; do
        if [[ -d "$project" ]]; then
            # Check if already in array
            local already_added=false
            for existing in "${unique_projects[@]}"; do
                if [[ "$existing" == "$project" ]]; then
                    already_added=true
                    break
                fi
            done
            
            if [[ "$already_added" == "false" ]]; then
                unique_projects+=("$project")
            fi
        fi
    done
    
    printf '%s\n' "${unique_projects[@]}"
}

# Check if project needs migration
needs_migration() {
    local project_path="$1"
    
    # Check if already has MCP isolation setup
    if [[ -f "$project_path/manage-mcp.sh" ]]; then
        return 1  # Already migrated
    fi
    
    # Check if has Claude Code configuration
    if [[ -d "$project_path/.claude" ]] || [[ -d "$project_path/.ai" ]]; then
        return 0  # Needs migration
    fi
    
    return 1  # Not a Claude Code project
}

# Migrate single project
migrate_project() {
    local project_path="$1"
    local force="${2:-false}"
    
    log_info "Migrating project: $(basename "$project_path")"
    log_info "Path: $project_path"
    
    # Check if already migrated
    if [[ -f "$project_path/manage-mcp.sh" && "$force" != "true" ]]; then
        log_warning "Project already has MCP isolation. Use --force to re-migrate."
        return 0
    fi
    
    # Stop any running MCP servers for this project
    log_info "Stopping existing MCP servers..."
    pkill -f "$project_path" 2>/dev/null || true
    
    # Create backup of existing configuration
    if [[ -f "$project_path/.claude/settings.local.json" ]]; then
        local backup_file="$project_path/.claude/settings.local.json.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$project_path/.claude/settings.local.json" "$backup_file"
        log_success "Backed up existing configuration: $(basename "$backup_file")"
    fi
    
    # Run configuration setup
    if "$CONFIG_MANAGER" setup "$project_path" "$force"; then
        log_success "Migration completed for $(basename "$project_path")"
        return 0
    else
        log_error "Migration failed for $(basename "$project_path")"
        return 1
    fi
}

# Interactive project selection
interactive_migration() {
    local projects
    readarray -t projects < <(detect_projects)
    
    if [[ ${#projects[@]} -eq 0 ]]; then
        log_warning "No Claude Code projects detected."
        echo
        echo "To migrate a specific project:"
        echo "  $0 migrate /path/to/project"
        return 1
    fi
    
    log_success "Found ${#projects[@]} potential projects:"
    echo
    
    # Show projects with migration status
    local needs_migration_list=()
    for i in "${!projects[@]}"; do
        local project="${projects[$i]}"
        local status
        local status_color
        
        if needs_migration "$project"; then
            status="Needs Migration"
            status_color="$YELLOW"
            needs_migration_list+=("$i")
        else
            status="Already Migrated"  
            status_color="$GREEN"
        fi
        
        echo -e "  $((i+1)). $(basename "$project")"
        echo -e "     Path: $project"
        echo -e "     Status: ${status_color}${status}${NC}"
        echo
    done
    
    if [[ ${#needs_migration_list[@]} -eq 0 ]]; then
        log_success "All projects already have MCP isolation!"
        return 0
    fi
    
    echo "Migration options:"
    echo "  1. Migrate all projects that need it (${#needs_migration_list[@]} projects)"
    echo "  2. Select specific projects to migrate"
    echo "  3. Exit"
    echo
    
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            log_info "Migrating all projects that need it..."
            local success_count=0
            local total_count=${#needs_migration_list[@]}
            
            for idx in "${needs_migration_list[@]}"; do
                local project="${projects[$idx]}"
                echo
                if migrate_project "$project"; then
                    ((success_count++))
                fi
            done
            
            echo
            log_success "Migration completed: $success_count/$total_count projects migrated successfully"
            ;;
        2)
            echo
            echo "Enter project numbers to migrate (space-separated, e.g., 1 3 5):"
            read -p "Projects: " -a selected_numbers
            
            local success_count=0
            local total_count=${#selected_numbers[@]}
            
            for num in "${selected_numbers[@]}"; do
                if [[ "$num" =~ ^[0-9]+$ ]] && [[ $num -ge 1 ]] && [[ $num -le ${#projects[@]} ]]; then
                    local idx=$((num - 1))
                    local project="${projects[$idx]}"
                    echo
                    if migrate_project "$project"; then
                        ((success_count++))
                    fi
                else
                    log_warning "Invalid project number: $num"
                fi
            done
            
            echo
            log_success "Migration completed: $success_count/$total_count selected projects migrated successfully"
            ;;
        3)
            log_info "Migration cancelled"
            return 0
            ;;
        *)
            log_error "Invalid choice: $choice"
            return 1
            ;;
    esac
}

# Cleanup existing MCP processes
cleanup_processes() {
    log_info "Cleaning up existing MCP processes..."
    
    local mcp_processes
    mcp_processes=$(ps aux | grep -E "mcp-server" | grep -v grep | wc -l | tr -d ' ')
    
    if [[ $mcp_processes -gt 0 ]]; then
        log_warning "Found $mcp_processes MCP processes running"
        
        echo "This will stop all running MCP servers to prevent conflicts."
        read -p "Continue? (y/N): " confirm
        
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            pkill -f "mcp-server" 2>/dev/null || true
            sleep 2
            log_success "MCP processes cleaned up"
        else
            log_warning "Skipping process cleanup - you may need to stop MCP servers manually"
        fi
    else
        log_success "No MCP processes to clean up"
    fi
}

# Show post-migration instructions
show_instructions() {
    log_header "Migration Complete!"
    echo
    echo -e "${GREEN}✅ Multi-project MCP isolation is now active${NC}"
    echo
    echo -e "${BOLD}Next steps for each project:${NC}"
    echo
    echo "1. Navigate to your project directory:"
    echo -e "   ${BLUE}cd /path/to/your-project${NC}"
    echo
    echo "2. Start project-specific MCP servers:"
    echo -e "   ${BLUE}./manage-mcp.sh start${NC}"
    echo
    echo "3. Check server status:"
    echo -e "   ${BLUE}./manage-mcp.sh status${NC}"
    echo
    echo "4. Test in Claude Code:"
    echo -e "   ${BLUE}/initialize${NC}"
    echo
    echo -e "${BOLD}Useful commands:${NC}"
    echo
    echo "• Show all project port allocations:"
    echo -e "  ${BLUE}$SCRIPT_DIR/port-manager.sh list${NC}"
    echo
    echo "• Check project MCP status:"
    echo -e "  ${BLUE}./manage-mcp.sh status${NC}"
    echo
    echo "• View MCP server logs:"
    echo -e "  ${BLUE}./manage-mcp.sh logs${NC}"
    echo
    echo "• Stop project MCP servers:"
    echo -e "  ${BLUE}./manage-mcp.sh stop${NC}"
    echo
    echo -e "${BOLD}Benefits:${NC}"
    echo "✅ No more MCP server conflicts between projects"
    echo "✅ Each project has isolated port range and data"
    echo "✅ Seamless project switching"
    echo "✅ Better process management and debugging"
    echo
}

# Show help
show_help() {
    echo "LDC AI Multi-Project MCP Migration Script"
    echo
    echo "Usage:"
    echo "  $0                          # Interactive migration"
    echo "  $0 migrate <project_path>   # Migrate specific project"
    echo "  $0 detect                   # Detect projects only"
    echo "  $0 cleanup                  # Cleanup MCP processes only"
    echo "  $0 --help                   # Show this help"
    echo
    echo "Examples:"
    echo "  $0                                    # Interactive mode"
    echo "  $0 migrate /path/to/code/my-app    # Migrate specific project"
    echo "  $0 detect                            # List detected projects"
    echo
}

# Main execution
main() {
    show_header
    
    # Check dependencies
    if [[ ! -f "$CONFIG_MANAGER" ]]; then
        log_error "Configuration manager not found: $CONFIG_MANAGER"
        log_error "Please run this script from the LDC AI framework directory"
        exit 1
    fi
    
    case "${1:-interactive}" in
        "migrate")
            if [[ -n "${2:-}" ]]; then
                local project_path="$2"
                if [[ ! -d "$project_path" ]]; then
                    log_error "Project directory not found: $project_path"
                    exit 1
                fi
                
                cleanup_processes
                if migrate_project "$project_path" "${3:-false}"; then
                    echo
                    show_instructions
                fi
            else
                log_error "Project path required for migrate command"
                show_help
                exit 1
            fi
            ;;
        "detect")
            local projects
            readarray -t projects < <(detect_projects)
            
            if [[ ${#projects[@]} -eq 0 ]]; then
                log_info "No Claude Code projects detected"
            else
                log_success "Detected ${#projects[@]} projects:"
                for project in "${projects[@]}"; do
                    local status
                    if needs_migration "$project"; then
                        status="Needs Migration"
                    else
                        status="Already Migrated"
                    fi
                    echo "  - $(basename "$project") ($status)"
                    echo "    $project"
                done
            fi
            ;;
        "cleanup")
            cleanup_processes
            ;;
        "interactive"|"")
            cleanup_processes
            if interactive_migration; then
                echo
                show_instructions
            fi
            ;;
        "--help"|"help")
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi