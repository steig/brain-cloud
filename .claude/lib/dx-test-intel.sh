#!/usr/bin/env bash

# DX Test Intelligence Library
# Smart test selection based on file changes and historical correlations
# Version: 1.0.0

# Get script directory (bash/zsh compatible)
if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    SCRIPT_DIR="${HOME}/.claude/lib"
fi

# Load dependencies
source "${SCRIPT_DIR}/dx-db.sh" 2>/dev/null || true

# Find test files that match source files by convention
dx_find_tests_by_convention() {
    local source_file="$1"
    local tests=()

    # Get base name without extension
    local base_name="${source_file%.*}"
    local dir_name=$(dirname "$source_file")
    local file_name=$(basename "$source_file")
    local name_only="${file_name%.*}"

    # Common test file patterns
    local patterns=(
        "${base_name}.test.ts"
        "${base_name}.test.tsx"
        "${base_name}.test.js"
        "${base_name}.test.jsx"
        "${base_name}_test.py"
        "${base_name}_test.go"
        "test_${name_only}.py"
        "${dir_name}/__tests__/${name_only}.test.ts"
        "${dir_name}/__tests__/${name_only}.test.tsx"
        "${dir_name}/../__tests__/${name_only}.test.ts"
        "tests/${name_only}_test.py"
        "tests/test_${name_only}.py"
        "${base_name}_test.rs"
    )

    for pattern in "${patterns[@]}"; do
        if [[ -f "$pattern" ]]; then
            tests+=("$pattern")
        fi
    done

    # Also check test directories
    if [[ -d "tests" ]]; then
        local found
        found=$(find tests -name "*${name_only}*" -type f 2>/dev/null | head -3)
        for t in $found; do
            tests+=("$t")
        done
    fi

    if [[ -d "__tests__" ]]; then
        local found
        found=$(find __tests__ -name "*${name_only}*" -type f 2>/dev/null | head -3)
        for t in $found; do
            tests+=("$t")
        done
    fi

    printf '%s\n' "${tests[@]}" | sort -u
}

# Find tests by import analysis (for JS/TS)
dx_find_tests_by_imports() {
    local source_file="$1"

    # Get module name for import matching
    local module_path="${source_file%.ts}"
    module_path="${module_path%.tsx}"
    module_path="${module_path%.js}"
    module_path="${module_path%.jsx}"

    # Search for test files that import this module
    grep -rl "from ['\"].*${module_path}['\"]" . \
        --include="*.test.ts" \
        --include="*.test.tsx" \
        --include="*.test.js" \
        --include="*.spec.ts" \
        --include="*.spec.tsx" \
        2>/dev/null | head -10
}

# Get tests by historical correlation
dx_find_tests_by_correlation() {
    local source_file="$1"
    local threshold="${2:-0.3}"

    dx_query "
        SELECT DISTINCT test_file,
               ROUND(correlation_strength * 100, 1) as confidence
        FROM test_correlations
        WHERE source_file = '$(dx_escape "$source_file")'
          AND correlation_strength >= $threshold
        ORDER BY correlation_strength DESC
        LIMIT 10;
    " 2>/dev/null
}

# Record a test failure correlation
dx_record_test_correlation() {
    local source_file="$1"
    local test_file="$2"

    dx_exec "
        INSERT INTO test_correlations (source_file, test_file, co_failures, total_changes, last_failure, correlation_strength)
        VALUES ('$(dx_escape "$source_file")', '$(dx_escape "$test_file")', 1, 1, datetime('now'), 1.0)
        ON CONFLICT(source_file, test_file) DO UPDATE SET
            co_failures = co_failures + 1,
            last_failure = datetime('now'),
            correlation_strength = CAST(co_failures + 1 AS REAL) / CAST(total_changes AS REAL);
    " 2>/dev/null
}

# Record that a file was changed (for correlation calculation)
dx_record_file_change() {
    local source_file="$1"

    dx_exec "
        UPDATE test_correlations
        SET total_changes = total_changes + 1,
            correlation_strength = CAST(co_failures AS REAL) / CAST(total_changes + 1 AS REAL)
        WHERE source_file = '$(dx_escape "$source_file")';
    " 2>/dev/null
}

# Get all affected tests for changed files
dx_get_affected_tests() {
    local base_ref="${1:-HEAD~1}"

    echo "=== AFFECTED TESTS ==="
    echo ""

    # Get changed files
    local changed_files
    changed_files=$(git diff --name-only "$base_ref" 2>/dev/null)

    if [[ -z "$changed_files" ]]; then
        echo "No changed files detected."
        return
    fi

    echo "Changed files:"
    echo "$changed_files" | head -10
    echo ""

    local all_tests=()
    local test_sources=()

    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        [[ "$file" == *test* ]] && continue  # Skip test files themselves
        [[ "$file" == *spec* ]] && continue

        echo "Finding tests for: $file"

        # Convention-based
        local conv_tests
        conv_tests=$(dx_find_tests_by_convention "$file")
        if [[ -n "$conv_tests" ]]; then
            while IFS= read -r t; do
                all_tests+=("$t")
                test_sources+=("$t (convention)")
            done <<< "$conv_tests"
        fi

        # Import-based (for JS/TS)
        if [[ "$file" == *.ts ]] || [[ "$file" == *.tsx ]] || [[ "$file" == *.js ]]; then
            local import_tests
            import_tests=$(dx_find_tests_by_imports "$file")
            if [[ -n "$import_tests" ]]; then
                while IFS= read -r t; do
                    all_tests+=("$t")
                    test_sources+=("$t (imports)")
                done <<< "$import_tests"
            fi
        fi

        # Correlation-based
        local corr_tests
        corr_tests=$(dx_find_tests_by_correlation "$file" | tail -n +2)  # Skip header
        if [[ -n "$corr_tests" ]]; then
            while IFS= read -r line; do
                local t=$(echo "$line" | awk '{print $1}')
                local conf=$(echo "$line" | awk '{print $2}')
                if [[ -n "$t" ]] && [[ -f "$t" ]]; then
                    all_tests+=("$t")
                    test_sources+=("$t (historical: ${conf}%)")
                fi
            done <<< "$corr_tests"
        fi

    done <<< "$changed_files"

    echo ""
    echo "=== RECOMMENDED TESTS ==="

    if [[ ${#all_tests[@]} -eq 0 ]]; then
        echo "No specific tests identified. Consider running full test suite."
    else
        # Deduplicate and list
        printf '%s\n' "${all_tests[@]}" | sort -u | while read -r test; do
            if [[ -f "$test" ]]; then
                echo "  $test"
            fi
        done

        echo ""
        echo "Test sources:"
        printf '%s\n' "${test_sources[@]}" | sort -u | head -10
    fi
}

# Generate test command for affected tests
dx_generate_test_command() {
    local base_ref="${1:-HEAD~1}"
    local profile="${2:-}"

    # Get affected tests
    local tests
    tests=$(dx_get_affected_tests "$base_ref" 2>/dev/null | grep '^\s' | awk '{print $1}' | sort -u)

    if [[ -z "$tests" ]]; then
        echo "No specific tests found. Running full suite."
        # Get test command from profile
        if [[ -n "$profile" ]]; then
            source .claude/lib/profile-utils.sh 2>/dev/null
            get_test_command
        else
            echo "npm test"  # Default fallback
        fi
        return
    fi

    # Count tests
    local test_count
    test_count=$(echo "$tests" | wc -l | tr -d ' ')

    if [[ $test_count -gt 20 ]]; then
        echo "# Too many tests ($test_count). Running full suite."
        echo "npm test"
        return
    fi

    # Generate command based on file types
    local first_test
    first_test=$(echo "$tests" | head -1)

    case "$first_test" in
        *.test.ts|*.test.tsx|*.test.js|*.test.jsx|*.spec.ts|*.spec.js)
            # Jest/Vitest
            echo "npx jest $(echo "$tests" | tr '\n' ' ')"
            ;;
        *_test.py|test_*.py)
            # Pytest
            echo "pytest $(echo "$tests" | tr '\n' ' ')"
            ;;
        *_test.go)
            # Go test
            local packages
            packages=$(echo "$tests" | xargs -I{} dirname {} | sort -u | tr '\n' ' ')
            echo "go test $packages"
            ;;
        *_test.rs)
            # Cargo test
            echo "cargo test"
            ;;
        *)
            # Unknown - run full suite
            echo "npm test"
            ;;
    esac
}

# Track flaky tests
dx_record_flaky_test() {
    local test_file="$1"
    local test_name="${2:-}"
    local was_flaky="${3:-1}"  # 1 if flaky (failed without code changes)

    dx_exec "
        INSERT INTO flaky_tests (test_file, test_name, total_runs, failures, flaky_failures, last_run, last_flaky)
        VALUES ('$(dx_escape "$test_file")', '$(dx_escape "$test_name")', 1,
                $([ "$was_flaky" = "1" ] && echo "1" || echo "0"),
                $([ "$was_flaky" = "1" ] && echo "1" || echo "0"),
                datetime('now'),
                $([ "$was_flaky" = "1" ] && echo "datetime('now')" || echo "NULL"))
        ON CONFLICT(test_file, test_name) DO UPDATE SET
            total_runs = total_runs + 1,
            failures = failures + $([ "$was_flaky" = "1" ] && echo "1" || echo "0"),
            flaky_failures = flaky_failures + $([ "$was_flaky" = "1" ] && echo "1" || echo "0"),
            last_run = datetime('now'),
            last_flaky = CASE WHEN $was_flaky = 1 THEN datetime('now') ELSE last_flaky END;
    " 2>/dev/null
}

# Get flaky tests report
dx_get_flaky_tests() {
    echo "=== FLAKY TESTS ==="
    echo ""

    dx_query "
        SELECT test_file,
               test_name,
               flaky_failures as flaky,
               total_runs as runs,
               ROUND(100.0 * flaky_failures / total_runs, 1) as flaky_rate,
               CASE WHEN quarantined = 1 THEN 'YES' ELSE 'NO' END as quarantined
        FROM flaky_tests
        WHERE flaky_failures > 0
        ORDER BY flaky_rate DESC
        LIMIT 20;
    " 2>/dev/null || echo "(no flaky test data)"
}

# Quarantine a flaky test
dx_quarantine_test() {
    local test_file="$1"
    local test_name="${2:-}"

    dx_exec "
        UPDATE flaky_tests
        SET quarantined = 1
        WHERE test_file = '$(dx_escape "$test_file")'
          AND (test_name = '$(dx_escape "$test_name")' OR '$(dx_escape "$test_name")' = '');
    " 2>/dev/null

    echo "Test quarantined: $test_file ${test_name:+($test_name)}"
}

# CLI interface
if [[ "${BASH_SOURCE[0]}" == "${0}" ]] || [[ "${0}" == *"dx-test-intel.sh" ]]; then
    case "${1:-help}" in
        affected)
            dx_get_affected_tests "${2:-HEAD~1}"
            ;;
        command)
            dx_generate_test_command "${2:-HEAD~1}" "${3:-}"
            ;;
        flaky)
            dx_get_flaky_tests
            ;;
        quarantine)
            dx_quarantine_test "$2" "${3:-}"
            ;;
        correlate)
            dx_record_test_correlation "$2" "$3"
            echo "Correlation recorded: $2 -> $3"
            ;;
        *)
            echo "DX Test Intelligence"
            echo ""
            echo "Usage: $0 <command> [args]"
            echo ""
            echo "Commands:"
            echo "  affected [ref]        Find tests affected by changes since ref"
            echo "  command [ref]         Generate test command for affected tests"
            echo "  flaky                 Show flaky test report"
            echo "  quarantine <file>     Quarantine a flaky test"
            echo "  correlate <src> <tst> Record test correlation"
            ;;
    esac
fi

# Export functions
export -f dx_find_tests_by_convention dx_find_tests_by_imports dx_find_tests_by_correlation
export -f dx_record_test_correlation dx_record_file_change
export -f dx_get_affected_tests dx_generate_test_command
export -f dx_record_flaky_test dx_get_flaky_tests dx_quarantine_test
