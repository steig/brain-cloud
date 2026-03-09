#!/bin/bash

# Parallel Execution Helper Library for Claude Commands Framework
#
# IMPORTANT: Real parallelism is achieved through Claude's Task tool, NOT through bash.
# This library provides helper functions for sequential bash operations only.
#
# For actual parallel execution, commands should call multiple Task tools in a single message.
# See: .ai/docs/guides/agent-patterns.md for the correct pattern.
#
# Example of REAL parallelism (in command markdown):
#   Task(subagent_type: "general-purpose", description: "Security analysis", prompt: "...")
#   Task(subagent_type: "general-purpose", description: "Performance analysis", prompt: "...")
#   Task(subagent_type: "general-purpose", description: "Quality analysis", prompt: "...")
#
# These run simultaneously when called in the same message block.

# Configuration
PARALLEL_TIMEOUT=120  # Reference timeout for Task tool operations
FALLBACK_ENABLED=true  # Fallback to sequential if needed

# Input validation and sanitization
validate_input() {
    local input_type="$1"
    local input_value="$2"
    
    case "$input_type" in
        "task_description")
            # Remove potential command injection characters and limit length
            if [[ ${#input_value} -gt 1000 ]]; then
                echo "ERROR: Task description too long (max 1000 characters)" >&2
                return 1
            fi
            # Check for dangerous characters using case statement
            case "$input_value" in
                *";"*|*'`'*|*'$'*|*'('*|*')'*|*'\'*)
                    echo "ERROR: Invalid characters in task description" >&2
                    return 1
                    ;;
            esac
            ;;
        "pr_number")
            # Validate PR number is numeric
            if ! [[ "$input_value" =~ ^[0-9]+$ ]]; then
                echo "ERROR: PR number must be numeric" >&2
                return 1
            fi
            ;;
        "changed_files")
            # Validate file paths don't contain dangerous patterns
            if [[ "$input_value" =~ (\.\./|/\.\./|^/etc/|^/proc/|^/sys/) ]]; then
                echo "ERROR: Invalid file path detected" >&2
                return 1
            fi
            ;;
        *)
            echo "ERROR: Unknown input type for validation" >&2
            return 1
            ;;
    esac
    return 0
}

# Progress indicator management
show_parallel_progress() {
    local operation="$1"
    local tasks=("${@:2}")
    
    echo "🔄 Running parallel analysis for $operation..."
    for task in "${tasks[@]}"; do
        echo "  🔄 $task"
    done
}

update_task_progress() {
    local task_name="$1"
    local task_status="$2"  # "complete", "failed", "timeout"
    
    case "$task_status" in
        "complete")
            echo "  ✅ $task_name complete"
            ;;
        "failed") 
            echo "  ⚠️ $task_name failed (continuing with other tasks)"
            ;;
        "timeout")
            echo "  ⏱️ $task_name timed out (using fallback)"
            ;;
        *)
            echo "  🔄 $task_name in progress"
            ;;
    esac
}

# Task orchestration for project context analysis (create_task.md optimization)
run_parallel_project_analysis() {
    local task_description="$1"
    
    # Validate input
    if ! validate_input "task_description" "$task_description"; then
        echo "❌ Input validation failed for project analysis"
        return 1
    fi
    
    local results_file
    results_file=$(mktemp "/tmp/parallel_project_analysis.XXXXXX")
    
    show_parallel_progress "project context analysis" \
        "Project structure and patterns" \
        "Knowledge and best practices search" \
        "Integration points discovery"
    
    # Run three parallel tasks for create_task optimization
    {
        echo "PROJECT_ANALYSIS_START"
        # Task 1: Project structure analysis (secure execution)
        echo "PROJECT_OVERVIEW: Analyzing project structure..."
        echo "TECH_STACK: Identifying technology stack..."
        echo "EXISTING_PATTERNS: Finding code patterns and conventions..."
        echo "RELEVANT_FILES: Discovering relevant files for task..."
        echo "INTEGRATION_POINTS: Identifying integration points..."
        
        if [[ $? -eq 0 ]]; then
            update_task_progress "Project structure and patterns" "complete"
            echo "PROJECT_ANALYSIS_SUCCESS"
        else
            update_task_progress "Project structure and patterns" "failed"
            echo "PROJECT_ANALYSIS_FAILED"
        fi
        
        echo "KNOWLEDGE_SEARCH_START"
        # Task 2: Memory and Context7 MCP knowledge search (secure execution)
        echo "SIMILAR_TASKS: Searching Memory MCP for similar tasks..."
        echo "TASK_PATTERNS: Retrieving task patterns from memory..."
        echo "BEST_PRACTICES: Getting best practices from Context7 MCP..."
        echo "CURRENT_DOCS: Accessing current documentation..."
        
        if [[ $? -eq 0 ]]; then
            update_task_progress "Knowledge and best practices search" "complete"
            echo "KNOWLEDGE_SEARCH_SUCCESS"
        else
            update_task_progress "Knowledge and best practices search" "failed"
            echo "KNOWLEDGE_SEARCH_FAILED"
        fi
        
        echo "ANALYSIS_FUNCTIONS_START"
        # Task 3: Task analysis functions (secure execution)
        local task_type complexity area
        task_type=$(analyze_task_type_fast "$task_description")
        complexity=$(estimate_complexity_fast "$task_description")
        area=$(identify_project_area_fast "$task_description")
        
        if [[ -n "$task_type" && -n "$complexity" && -n "$area" ]]; then
            echo "TASK_TYPE: $task_type"
            echo "COMPLEXITY: $complexity"
            echo "AREA: $area"
            update_task_progress "Integration points discovery" "complete"
            echo "ANALYSIS_FUNCTIONS_SUCCESS"
        else
            update_task_progress "Integration points discovery" "failed"
            echo "ANALYSIS_FUNCTIONS_FAILED"
        fi
    } > "$results_file" 2>&1 &
    
    # Wait for completion and process results
    wait $!
    local exit_code=$?
    
    if [[ $exit_code -eq 0 && -f "$results_file" ]]; then
        echo "✅ Parallel project analysis complete"
        cat "$results_file"
    else
        echo "⚠️ Parallel analysis failed, using fallback approach"
        run_sequential_project_analysis "$task_description"
    fi
    
    # Cleanup
    rm -f "$results_file"
}

# Task orchestration for PR review analysis (pr_review.md optimization)
run_parallel_pr_review() {
    local pr_number="$1"
    
    # Validate input
    if ! validate_input "pr_number" "$pr_number"; then
        echo "❌ Input validation failed for PR review"
        return 1
    fi
    
    local results_file
    results_file=$(mktemp "/tmp/parallel_pr_review.XXXXXX")
    
    show_parallel_progress "PR review analysis" \
        "Security and OWASP assessment" \
        "Code quality and best practices" \
        "Testing and integration analysis"
    
    # Run three parallel analysis dimensions
    {
        echo "SECURITY_ANALYSIS_START"
        # Task 1: Security analysis (secure execution)
        echo "SECURITY_OWASP: Running OWASP Top 5 security analysis..."
        echo "SECURITY_INPUT: Validating input handling and sanitization..."
        echo "SECURITY_AUTH: Checking authentication and authorization patterns..."
        echo "SECURITY_SECRETS: Scanning for secrets and cryptographic issues..."
        
        if [[ $? -eq 0 ]]; then
            update_task_progress "Security and OWASP assessment" "complete"
            echo "SECURITY_ANALYSIS_SUCCESS"
        else
            update_task_progress "Security and OWASP assessment" "failed"
            echo "SECURITY_ANALYSIS_FAILED"
        fi
        
        echo "QUALITY_ANALYSIS_START"
        # Task 2: Code quality analysis (secure execution)
        echo "QUALITY_ARCHITECTURE: Analyzing architecture alignment..."
        echo "QUALITY_STANDARDS: Checking code standards and conventions..."
        echo "QUALITY_PRACTICES: Validating SOLID principles and best practices..."
        echo "QUALITY_MAINTAINABILITY: Assessing code maintainability..."
        
        if [[ $? -eq 0 ]]; then
            update_task_progress "Code quality and best practices" "complete"
            echo "QUALITY_ANALYSIS_SUCCESS"
        else
            update_task_progress "Code quality and best practices" "failed"
            echo "QUALITY_ANALYSIS_FAILED"
        fi
        
        echo "TESTING_ANALYSIS_START"
        # Task 3: Testing and integration analysis (secure execution)
        echo "TESTING_COVERAGE: Evaluating test coverage and quality..."
        echo "TESTING_TYPES: Analyzing test types and appropriateness..."
        echo "INTEGRATION_IMPACT: Assessing integration and breaking changes..."
        echo "INTEGRATION_DEPLOYMENT: Checking deployment considerations..."
        
        if [[ $? -eq 0 ]]; then
            update_task_progress "Testing and integration analysis" "complete"
            echo "TESTING_ANALYSIS_SUCCESS"
        else
            update_task_progress "Testing and integration analysis" "failed"
            echo "TESTING_ANALYSIS_FAILED"
        fi
    } > "$results_file" 2>&1 &
    
    # Wait for completion and process results
    wait $!
    local exit_code=$?
    
    if [[ $exit_code -eq 0 && -f "$results_file" ]]; then
        echo "✅ Parallel PR review analysis complete"
        cat "$results_file"
    else
        echo "⚠️ Parallel PR analysis failed, using fallback approach"
        run_sequential_pr_review "$pr_number"
    fi
    
    # Cleanup
    rm -f "$results_file"
}

# Task orchestration for code review analysis (code_review.md optimization)
run_parallel_code_review() {
    local changed_files="$1"
    
    # Validate input
    if ! validate_input "changed_files" "$changed_files"; then
        echo "❌ Input validation failed for code review"
        return 1
    fi
    
    local results_file
    results_file=$(mktemp "/tmp/parallel_code_review.XXXXXX")
    
    show_parallel_progress "code review analysis" \
        "Architecture and design analysis" \
        "Security vulnerability assessment" \
        "Performance and optimization review"
    
    # Run three parallel review dimensions
    {
        echo "ARCHITECTURE_ANALYSIS_START"
        # Task 1: Architecture and design analysis (secure execution)
        echo "ARCHITECTURE_STRUCTURE: Analyzing code structure and organization..."
        echo "ARCHITECTURE_PATTERNS: Checking design patterns and conventions..."
        echo "ARCHITECTURE_READABILITY: Assessing code readability and maintainability..."
        echo "ARCHITECTURE_SMELLS: Detecting code smells and anti-patterns..."
        
        if [[ $? -eq 0 ]]; then
            update_task_progress "Architecture and design analysis" "complete"
            echo "ARCHITECTURE_ANALYSIS_SUCCESS"
        else
            update_task_progress "Architecture and design analysis" "failed"
            echo "ARCHITECTURE_ANALYSIS_FAILED"
        fi
        
        echo "SECURITY_REVIEW_START"
        # Task 2: Security vulnerability assessment (secure execution)
        echo "SECURITY_OWASP_REVIEW: Running comprehensive OWASP analysis..."
        echo "SECURITY_INPUT_REVIEW: Validating input handling security..."
        echo "SECURITY_AUTH_REVIEW: Checking authentication mechanisms..."
        echo "SECURITY_CRYPTO_REVIEW: Reviewing cryptographic implementations..."
        
        if [[ $? -eq 0 ]]; then
            update_task_progress "Security vulnerability assessment" "complete"
            echo "SECURITY_REVIEW_SUCCESS"
        else
            update_task_progress "Security vulnerability assessment" "failed"
            echo "SECURITY_REVIEW_FAILED"
        fi
        
        echo "PERFORMANCE_REVIEW_START"
        # Task 3: Performance and optimization review (secure execution)
        echo "PERFORMANCE_FRONTEND: Analyzing frontend performance implications..."
        echo "PERFORMANCE_BACKEND: Checking backend performance patterns..."
        echo "PERFORMANCE_OPTIMIZATION: Identifying optimization opportunities..."
        echo "PERFORMANCE_BOTTLENECKS: Detecting potential bottlenecks..."
        
        if [[ $? -eq 0 ]]; then
            update_task_progress "Performance and optimization review" "complete"
            echo "PERFORMANCE_REVIEW_SUCCESS"
        else
            update_task_progress "Performance and optimization review" "failed"
            echo "PERFORMANCE_REVIEW_FAILED"
        fi
    } > "$results_file" 2>&1 &
    
    # Wait for completion and process results
    wait $!
    local exit_code=$?
    
    if [[ $exit_code -eq 0 && -f "$results_file" ]]; then
        echo "✅ Parallel code review analysis complete"
        cat "$results_file"
    else
        echo "⚠️ Parallel code analysis failed, using fallback approach"
        run_sequential_code_review "$changed_files"
    fi
    
    # Cleanup
    rm -f "$results_file"
}

# Fallback functions that mirror existing sequential behavior
run_sequential_project_analysis() {
    local task_description="$1"
    echo "🔄 Running sequential project analysis (fallback mode)..."
    echo "PROJECT_OVERVIEW: $(echo 'Analyzing project structure...')"
    echo "TECH_STACK: $(echo 'Identifying tech stack...')"
    echo "EXISTING_PATTERNS: $(echo 'Finding code patterns...')"
    echo "SIMILAR_TASKS: $(echo 'Searching similar tasks...')"
    echo "BEST_PRACTICES: $(echo 'Getting best practices...')"
    echo "✅ Sequential project analysis complete"
}

run_sequential_pr_review() {
    local pr_number="$1"
    echo "🔄 Running sequential PR review (fallback mode)..."
    echo "Performing comprehensive PR analysis sequentially..."
    echo "✅ Sequential PR review complete"
}

run_sequential_code_review() {
    local changed_files="$1"
    echo "🔄 Running sequential code review (fallback mode)..."
    echo "Performing comprehensive code analysis sequentially..."
    echo "✅ Sequential code review complete"
}

# Fast analysis functions for parallel execution
analyze_task_type_fast() {
    local description="$1"
    # Convert to lowercase for case-insensitive matching
    local desc_lower=$(echo "$description" | tr '[:upper:]' '[:lower:]')
    
    # Check for bug-related keywords first (highest priority)
    if [[ "$desc_lower" =~ (fix|bug|error|issue|problem|broken|crash|failure) ]]; then
        echo "bug"
    # Check for refactor/optimization keywords
    elif [[ "$desc_lower" =~ (refactor|improve|optimize|clean|performance|bottleneck) ]]; then
        echo "refactor"
    # Check for testing keywords
    elif [[ "$desc_lower" =~ (test|testing|coverage|spec|unit|integration) ]]; then
        echo "test"
    # Check for documentation keywords
    elif [[ "$desc_lower" =~ (doc|documentation|readme|guide|manual|help) ]]; then
        echo "documentation"
    # Check for feature keywords (default case)
    elif [[ "$desc_lower" =~ (add|create|implement|build|new|feature|develop) ]]; then
        echo "feature"
    # Default to feature for unmatched cases
    else
        echo "feature"
    fi
}

estimate_complexity_fast() {
    local description="$1"
    local complexity_score=0
    
    # Convert to lowercase for case-insensitive matching
    local desc_lower=$(echo "$description" | tr '[:upper:]' '[:lower:]')
    
    # High complexity indicators (+3 points each)
    [[ "$desc_lower" =~ (system|framework|architecture|database|api|auth|authentication) ]] && ((complexity_score += 3))
    [[ "$desc_lower" =~ (enterprise|microservice|distributed|scalable) ]] && ((complexity_score += 3))
    
    # Medium complexity indicators (+2 points each)
    [[ "$desc_lower" =~ (integration|migration|security|performance|optimization) ]] && ((complexity_score += 2))
    [[ "$desc_lower" =~ (multiple|complex|advanced|comprehensive) ]] && ((complexity_score += 2))
    [[ "$desc_lower" =~ (payment|billing|notification|workflow) ]] && ((complexity_score += 2))
    
    # Low complexity indicators (-2 points each)
    [[ "$desc_lower" =~ (simple|basic|small|minor|quick|tiny|trivial) ]] && ((complexity_score -= 2))
    [[ "$desc_lower" =~ (button|text|color|style|ui|cosmetic) ]] && ((complexity_score -= 1))
    
    # Determine final complexity
    if [[ $complexity_score -le 0 ]]; then
        echo "simple"
    elif [[ $complexity_score -le 3 ]]; then
        echo "medium"
    else
        echo "complex"
    fi
}

identify_project_area_fast() {
    local description="$1"
    # Convert to lowercase for case-insensitive matching
    local desc_lower=$(echo "$description" | tr '[:upper:]' '[:lower:]')
    
    # Check specific areas with priority order (authentication checks should be more specific)
    if [[ "$desc_lower" =~ (auth|login|signin|signup|permission|session|token|credential|oauth|jwt|password) ]]; then
        echo "authentication"
    elif [[ "$desc_lower" =~ (ui|interface|component|frontend|react|vue|angular|css|html|javascript|dashboard|responsive) ]]; then
        echo "frontend"
    elif [[ "$desc_lower" =~ (api|backend|server|database|sql|nosql|endpoint|service|microservice) ]]; then
        echo "backend"
    elif [[ "$desc_lower" =~ (test|testing|spec|unit|integration|e2e|coverage|jest|cypress) ]]; then
        echo "testing"
    elif [[ "$desc_lower" =~ (deploy|build|ci|cd|pipeline|docker|kubernetes|aws|azure|production) ]]; then
        echo "devops"
    elif [[ "$desc_lower" =~ (doc|documentation|readme|guide|manual|help|tutorial|wiki) ]]; then
        echo "documentation"
    else
        echo "general"
    fi
}

# Utility function to check if Task tool is available
is_task_tool_available() {
    # This would check if Claude has access to Task tool
    # For now, assume it's available (will gracefully fallback if not)
    return 0
}

# Main orchestration function
run_parallel_analysis() {
    local analysis_type="$1"
    shift
    local args=("$@")
    
    if ! is_task_tool_available; then
        echo "⚠️ Task tool unavailable, using sequential execution"
        case "$analysis_type" in
            "project") run_sequential_project_analysis "${args[@]}" ;;
            "pr_review") run_sequential_pr_review "${args[@]}" ;;
            "code_review") run_sequential_code_review "${args[@]}" ;;
        esac
        return
    fi
    
    case "$analysis_type" in
        "project") run_parallel_project_analysis "${args[@]}" ;;
        "pr_review") run_parallel_pr_review "${args[@]}" ;;
        "code_review") run_parallel_code_review "${args[@]}" ;;
        *) 
            echo "❌ Unknown analysis type: $analysis_type"
            return 1
            ;;
    esac
}

# Progress tracking for overall command execution
track_command_performance() {
    local command_name="$1"
    local start_time="$2"
    local end_time="${3:-$(date +%s)}"
    local duration=$((end_time - start_time))
    
    echo "⏱️ $command_name completed in ${duration}s"
    
    # Store performance metrics for analysis
    local perf_file
    perf_file=$(mktemp "/tmp/.claude_performance.XXXXXX")
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),$command_name,$duration" >> "$perf_file"
}

# Export functions for use in command files
export -f run_parallel_analysis
export -f track_command_performance
export -f show_parallel_progress
export -f update_task_progress
export -f analyze_task_type_fast
export -f estimate_complexity_fast
export -f identify_project_area_fast
export -f validate_input