#!/bin/bash
# Security Input Validation Library v2.1 - Fixed Syntax
# Prevents command injection vulnerabilities in agent orchestration
# Version: 2.1.0 - Syntax corrected

# ===================================================================
# INITIALIZATION AND SETUP
# ===================================================================

# Initialize security validation system
init_security_validation() {
    echo "🔒 Initializing security validation system v2.1..." >&2
    
    # Create security logs directory
    mkdir -p ".claude/logs/security"
    
    # Initialize security log
    SECURITY_LOG=".claude/logs/security/validation.log"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Security validation system initialized" >> "$SECURITY_LOG"
    
    echo "✅ Security validation system v2.1 initialized" >&2
}

# ===================================================================
# CORE VALIDATION FUNCTIONS
# ===================================================================

# Main validation function with improved precision
validate_agent_input() {
    local input_type="$1"
    local input="$2"
    
    # Basic checks
    if [[ -z "$input" ]]; then
        echo "ERROR: Empty input provided" >&2
        return 1
    fi
    
    # Length check (prevent excessively long inputs)
    if [[ ${#input} -gt 10000 ]]; then
        echo "ERROR: Input too long (${#input} characters, max 10000)" >&2
        return 1
    fi
    
    # Check for actual command injection patterns (more precise)
    if check_injection_patterns "$input"; then
        log_security_event "BLOCKED" "$input_type" "$input"
        return 1
    fi
    
    # Log successful validation
    log_security_event "ALLOWED" "$input_type" "$(echo "$input" | head -c 100)..."
    return 0
}

# Improved injection pattern detection with fewer false positives
check_injection_patterns() {
    local input="$1"
    
    # Command substitution: $(command) - use grep for complex regex
    if echo "$input" | grep -E '\$\([[:space:]]*[a-zA-Z_/]' >/dev/null; then
        echo "SECURITY: Detected command substitution attempt" >&2
        return 0
    fi
    
    # Backtick command execution
    if echo "$input" | grep -E '`[[:space:]]*[a-zA-Z_/]' >/dev/null; then
        echo "SECURITY: Detected backtick command execution" >&2
        return 0
    fi
    
    # Command chaining with dangerous commands
    if echo "$input" | grep -E ';[[:space:]]*(rm|sudo|sh|bash|curl|wget|nc|netcat)[[:space:]]' >/dev/null; then
        echo "SECURITY: Detected dangerous command chaining" >&2
        return 0
    fi
    
    # Pipe to shell or dangerous commands
    if echo "$input" | grep -E '\|[[:space:]]*(sh|bash|zsh|fish|rm|sudo)[[:space:]]' >/dev/null; then
        echo "SECURITY: Detected pipe to dangerous command" >&2
        return 0
    fi
    
    # Logical operators with commands
    if echo "$input" | grep -E '(&&|\|\|)[[:space:]]*(rm|sudo|sh|bash|curl|wget)' >/dev/null; then
        echo "SECURITY: Detected logical operator with dangerous command" >&2
        return 0
    fi
    
    # File redirection to sensitive paths
    if echo "$input" | grep -E '(>|<)[[:space:]]*/etc/' >/dev/null || echo "$input" | grep -E '(>|<)[[:space:]]*/proc/' >/dev/null; then
        echo "SECURITY: Detected redirection to sensitive path" >&2
        return 0
    fi
    
    # Variable expansion with injection potential
    if echo "$input" | grep -E '\$\{[^}]*[;|&<>][^}]*\}' >/dev/null; then
        echo "SECURITY: Detected dangerous variable expansion" >&2
        return 0
    fi
    
    return 1  # No dangerous patterns found
}

# ===================================================================
# SECURE PROMPT GENERATION
# ===================================================================

# Generate secure agent prompts with proper escaping
generate_secure_agent_prompt() {
    local agent_type="$1"
    local task="$2"
    local context="$3"
    local template="$4"
    local extra="${5:-}"
    
    # Validate all inputs
    if ! validate_agent_input "agent_type" "$agent_type"; then
        echo "ERROR: Invalid agent type" >&2
        return 1
    fi
    
    if ! validate_agent_input "task" "$task"; then
        echo "ERROR: Invalid task description" >&2
        return 1
    fi
    
    if ! validate_agent_input "context" "$context"; then
        echo "ERROR: Invalid context" >&2
        return 1
    fi
    
    # Escape special characters in inputs
    local safe_task=$(escape_for_output "$task")
    local safe_context=$(escape_for_output "$context")
    local safe_extra=$(escape_for_output "$extra")
    
    # Replace placeholders in template
    local prompt="$template"
    prompt="${prompt//%TASK%/$safe_task}"
    prompt="${prompt//%CONTEXT%/$safe_context}"
    prompt="${prompt//%EXTRA%/$safe_extra}"
    
    # Output in secure format
    cat << 'EOF'
AGENT_TYPE:
EOF
    echo "$agent_type"
    cat << 'EOF'
TASK:
EOF
    echo "$safe_task"
    cat << 'EOF'
CONTEXT:
EOF
    echo "$safe_context"
    cat << 'EOF'
PROMPT:
EOF
    echo "$prompt"
}

# Escape special characters for safe output
escape_for_output() {
    local input="$1"
    # Escape backticks, dollar signs, and backslashes
    echo "$input" | sed 's/[`$\\]/\\&/g'
}

# ===================================================================
# LOGGING AND MONITORING
# ===================================================================

# Log security events
log_security_event() {
    local action="$1"      # ALLOWED, BLOCKED, ERROR
    local input_type="$2"
    local input_sample="$3"
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_entry="$timestamp - $action - $input_type - $input_sample"
    
    echo "$log_entry" >> "$SECURITY_LOG"
    
    if [[ "$action" == "BLOCKED" ]]; then
        echo "🚨 SECURITY: Blocked potentially dangerous input" >&2
    fi
}

# Get security statistics
get_security_stats() {
    if [[ -f "$SECURITY_LOG" ]]; then
        echo "🔒 Security Statistics:" >&2
        echo "   Allowed: $(grep -c "ALLOWED" "$SECURITY_LOG" 2>/dev/null || echo 0)" >&2
        echo "   Blocked: $(grep -c "BLOCKED" "$SECURITY_LOG" 2>/dev/null || echo 0)" >&2
        echo "   Errors: $(grep -c "ERROR" "$SECURITY_LOG" 2>/dev/null || echo 0)" >&2
        echo "   Log: $SECURITY_LOG" >&2
    else
        echo "🔒 Security: No activity logged yet" >&2
    fi
}

# ===================================================================
# INITIALIZATION
# ===================================================================

# Auto-initialize when sourced
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    init_security_validation
    echo "🔒 Security Input Validation Library v2.1 loaded successfully" >&2
    echo "   Use validate_agent_input() for input validation" >&2
    echo "   Use generate_secure_agent_prompt() for safe prompt generation" >&2
fi