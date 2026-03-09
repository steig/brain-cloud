---
category: daily
---

You are helping the user implement a development task following the "Explore, Plan, Code, Test" workflow.

## Model Selection for Cost Efficiency

**IMPORTANT:** When spawning Task agents for implementation work, use the `model: "haiku"` parameter to reduce costs:

```
Task(subagent_type="general-purpose", model="haiku", prompt="...")
```

Use Haiku for:
- Code exploration and file analysis
- Implementation work (writing code)
- Running tests and validation
- Simple research tasks

Keep Sonnet/Opus (default) for:
- Planning and architectural decisions
- Complex analysis requiring deeper reasoning
- PR descriptions and documentation writing

This reduces costs by ~60-80% on bulk implementation work while maintaining quality for decisions.

## Usage
- `/do_task 123` - Implement GitHub issue #123 (TDD enforced by default)
- `/do_task "Add login button"` - Implement described task (TDD enforced)
- `/do_task 123 --detailed` - Create granular implementation plan with bite-sized TDD tasks
- `/do_task 123 --no-tdd "reason"` - Opt out of TDD with required justification
- `/do_task 123 --detailed --no-tdd "config only"` - Detailed plan without TDD

## TDD is Default (Inspired by Superpowers)

**Iron Law:** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST

This command enforces Test-Driven Development by default. For each implementation step:
1. **RED**: Write ONE failing test
2. **Verify RED**: Run test, confirm it fails correctly
3. **GREEN**: Write MINIMAL code to pass
4. **Verify GREEN**: Run test, confirm it passes
5. **REFACTOR**: Clean up (keep tests green)
6. **REPEAT**: Next failing test

### Opting Out of TDD

Use `--no-tdd "reason"` only for:
- Configuration-only changes (`--no-tdd "config files only"`)
- Documentation updates (`--no-tdd "docs update"`)
- Generated code (`--no-tdd "auto-generated"`)
- Explicit user decision (`--no-tdd "user requested"`)

When `--no-tdd` is used:
1. Reason is **required** and logged to work log
2. Tests are still suggested after implementation
3. Decision is recorded for retrospectives

**If code is written before a test, delete it and start over.**

## Workflow

### 0. Initialize Time Tracking & Work Log (ADR-002)
Start session monitoring, issue tracking, and agent continuity:
- **Start time tracking**: Use `source .claude/lib/time-tracking.sh && start_time_tracking "do_task" "$ISSUE_NUMBER" "$TASK_DESCRIPTION"`
- **Log start activity**: Record task start with GitHub issue comment
- **Initialize progress**: Set up activity and issue logging for retrospectives
- **Load work log**: Check for existing work log at `.ai/work/issue-{N}.md`
- **Display handoff context**: Show previous session's progress, decisions, and blockers

```bash
# Load work log utilities (ADR-002)
source .claude/lib/work-log-utils.sh

# Check for existing work log
if work_log_exists "$ISSUE_NUMBER"; then
    echo "📋 **Previous Work Log Found** — Loading context..."
    echo ""
    get_work_log_summary "$ISSUE_NUMBER"
    echo ""
    
    # Update status to in-progress
    update_work_log_status "$ISSUE_NUMBER" "in-progress"
    add_session_entry "$ISSUE_NUMBER" "- Resuming work on this issue"
else
    echo "📋 **No previous work log** — Starting fresh"
    # Create new work log if one doesn't exist
    create_work_log "$ISSUE_NUMBER" "$TASK_TITLE" "$BRANCH_NAME"
fi
```

**Work Log Enables:**
- Agent continuity across sessions
- Multi-agent coordination
- Decision tracking (don't re-litigate)
- Failure logging (don't retry failed approaches)

### 1. Enhanced Explore Phase (5-15 minutes)
Systematic issue analysis and contextual understanding:
- **Parse input**: GitHub issue number or task description with metadata extraction
- **Issue analysis**: Extract acceptance criteria, requirements, and constraints
- **Log exploration**: `log_activity "Starting issue analysis for #$ISSUE_NUMBER"`
- **🧠 Brain Context Recall**: Query brain for relevant past decisions and context
- **CREATE FEATURE BRANCH**: `git checkout -b issue-123-feature-name` with intelligent naming
- **Parallel discovery**: Use parallel subagents for comprehensive codebase analysis
- **Pattern recognition**: Find similar implementations and established patterns
- **Dependency mapping**: Identify related components and integration points
- **Progress tracking**: Initialize task progress indicators and milestones

#### Brain Context Integration

**BEFORE starting implementation**, query the brain for relevant history and coaching:

```
brain_recall(query="{task_title} {key_terms}", limit=10, include_details=true)
brain_coaching_insights(period="this week", project="{current_project}")
brain_decision_templates(decision_type="architecture")
```

This surfaces:
- **Past decisions** about similar features (why we chose X over Y)
- **Previous implementations** of related functionality
- **Known issues** or gotchas in this area
- **Architectural context** that affects this work
- **AI coaching tips** based on recent patterns (prompt quality, common mistakes)
- **Decision templates** for structured decision-making during implementation

**Display brain context to inform implementation:**
```
🧠 BRAIN CONTEXT
════════════════

Past Decisions:
• [DECISION] Authentication: Use JWT tokens (2 days ago)
  → Chose: JWT with refresh tokens
  → Why: Stateless, scalable, industry standard

Related Work:
• [note] User session handling patterns (3 days ago)
• [insight] Rate limiting on auth endpoints (last week)

Use this context to inform your implementation approach.
```

### 2. Enhanced Planning Phase (5-20 minutes)
Comprehensive implementation strategy with validation:
- **Log planning start**: `log_activity "Beginning implementation planning"`
- **Requirements analysis**: Break down acceptance criteria into actionable tasks
- **Architecture assessment**: Evaluate implementation approach against existing patterns
- **Test strategy**: Define comprehensive testing approach (unit, integration, e2e)
- **Risk assessment**: Identify potential implementation challenges and mitigation
- **Progress milestones**: Define measurable checkpoints and success criteria
- **Parallel research**: Use subagents for technology research and best practices
- **Stakeholder validation**: Get user approval with clear implementation roadmap

#### Detailed Planning Mode (--detailed flag)

When `--detailed` flag is used, create granular implementation plans with bite-sized tasks:

**Principles:**
- Each task is ONE action (2-5 minutes)
- Exact file paths with line numbers
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Assume implementer has zero codebase context

**Task Structure:**
```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts:123-145`
- Test: `tests/exact/path/to/test.ts`

**Step 1: Write the failing test**
```typescript
// Complete test code here
test('specific behavior description', () => {
  const result = functionName(input);
  expect(result).toBe(expected);
});
```

**Step 2: Run test to verify it fails**
Run: `npm test tests/path/test.ts::test_name -v`
Expected: FAIL with "functionName is not defined"

**Step 3: Write minimal implementation**
```typescript
// Complete implementation code
export function functionName(input: Type): ReturnType {
  return expected;
}
```

**Step 4: Run test to verify it passes**
Run: `npm test tests/path/test.ts::test_name -v`
Expected: PASS

**Step 5: Commit**
```bash
git add tests/path/test.ts src/path/file.ts
git commit -m "feat: add specific feature"
```
```

**Example Detailed Plan:**
```markdown
# User Email Validation Implementation Plan

**Goal:** Add email validation to user registration

**Architecture:** Add validation utility, integrate with registration form

**Tech Stack:** TypeScript, Zod, React Hook Form

---

### Task 1: Create Email Validation Utility

**Files:**
- Create: `src/utils/validation.ts`
- Test: `tests/utils/validation.test.ts`

**Step 1: Write failing test**
```typescript
// tests/utils/validation.test.ts
import { validateEmail } from '@/utils/validation';

describe('validateEmail', () => {
  test('returns true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  test('returns false for invalid email', () => {
    expect(validateEmail('invalid')).toBe(false);
  });
});
```

**Step 2: Verify test fails**
Run: `npm test tests/utils/validation.test.ts`
Expected: FAIL - "Cannot find module '@/utils/validation'"

**Step 3: Implement**
```typescript
// src/utils/validation.ts
export function validateEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}
```

**Step 4: Verify test passes**
Run: `npm test tests/utils/validation.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**
```bash
git add src/utils/validation.ts tests/utils/validation.test.ts
git commit -m "feat: add email validation utility"
```

---

### Task 2: Integrate with Registration Form
[... continue with same structure ...]
```

**Save detailed plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

#### TDD Enforcement (Default Behavior)

TDD is enforced by default. The workflow for each feature:
1. **RED**: Write ONE failing test
2. **Verify RED**: Run test, confirm it fails correctly
3. **GREEN**: Write MINIMAL code to pass
4. **Verify GREEN**: Run test, confirm it passes
5. **REFACTOR**: Clean up (keep tests green)
6. **REPEAT**: Next failing test

**TDD Checklist (enforced for each implementation step):**
```
[ ] Test written BEFORE implementation code
[ ] Test run and confirmed FAILING
[ ] Implementation is MINIMAL (just enough to pass)
[ ] Test run and confirmed PASSING
[ ] All other tests still pass
[ ] Code committed with test
```

**If code written before test:** Delete it. Start over. No exceptions.

**See `/tdd` command for full TDD workflow documentation.**

### 3. Code (varies by complexity)
Implement the solution:
- **Log coding start**: `log_activity "Starting code implementation"`
- **VERIFY ON FEATURE BRANCH**: Ensure you're working on the feature branch created in step 1
- Write code following existing codebase style and patterns
- Prefer clearly named variables and methods over extensive comments
- Create/modify files as needed
- Run autoformatting and fix reasonable linter warnings

### 4. Test (10-30 minutes)
Validate the implementation:
- **Log testing start**: `log_activity "Beginning testing phase"`
- Use parallel subagents to run tests and ensure they pass
- If changes affect UX significantly, test in browser
- Create test plan and use subagents for testing
- If problems found, return to planning stage

### 5. Write Up (5-10 minutes)
Document the work completed:
- Write a short report suitable for PR description
- Include what was implemented and key design choices
- Note any useful commands for future developers
- **Score the session**: `brain_score_session()` to get productivity/flow/sentiment scores
- **Complete time tracking**: `end_time_tracking "completed" "Task implementation finished"`
- **Log final summary**: Post session summary to GitHub issue with activities and any issues encountered
- **Story point analysis**: Compare actual time spent vs estimated story points for retrospective

### 6. Update Work Log & Finalize (ADR-002)
Update the agent work log with session outcomes:

```bash
# Load work log utilities
source .claude/lib/work-log-utils.sh

# Update work log with session summary
if work_log_exists "$ISSUE_NUMBER"; then
    # Update status
    update_work_log_status "$ISSUE_NUMBER" "ready-for-review"
    
    # Add final session entry
    add_session_entry "$ISSUE_NUMBER" "- Completed implementation
- All tests passing
- Ready for code review"
    
    echo "📋 Work log updated: .ai/work/issue-${ISSUE_NUMBER}.md"
    echo "   → Status: ready-for-review"
    echo "   → Next agent can continue from here if needed"
fi

# Note: Work log will be deleted when issue is closed
# Key decisions should be captured in commit messages
```

**Work Log Purpose:**
- **Ephemeral**: Deleted when issue closes (not permanent documentation)
- **Handoff-focused**: Context for next agent/session
- **Decision record**: What was decided and why
- **Failure log**: What didn't work (don't retry)
- Files changed
- Key architectural decisions
- Testing approach and results
- Notes for future developers

**Location:** `.ai/docs/sprints/{version}/implementations/issue-{number}-{slug}.md`

- **Recommended next steps**: 
  1. `/code_review` - Review changes for quality, security, and best practices ⭐ (Suggested)
  2. `/commit` (on feature branch) → `/create_pr` (feature branch → main) → `/pr_review` → `/pr_merge`

## Implementation

## Systematic Issue Analysis

### Enhanced Task Input Parsing
```bash
# Extract and analyze task information with metadata
parse_task_input() {
    local input="$1"
    
    if [[ "$input" =~ ^[0-9]+$ ]]; then
        # GitHub issue number provided
        echo "🔍 **Fetching GitHub issue #$input...**"
        
        # Load security utilities
        source /.claude/lib/security-utils.sh
        
        # Validate issue number format (basic integer validation)
        if ! [[ "$input" =~ ^[0-9]+$ ]] || [[ ${#input} -gt 10 ]]; then
            echo "❌ Invalid issue number format"
            exit 1
        fi
        
        # Try GitHub MCP first, fallback to GitHub CLI
        if should_try_mcp && is_github_mcp_available; then
            echo "✅ Using GitHub MCP for issue fetch"
            
            # Create temporary file for secure MCP communication
            local temp_file=$(mktemp)
            chmod 600 "$temp_file"
            
            cat > "$temp_file" << 'EOF'
Please fetch GitHub issue #__ISSUE_NUMBER__ details including title, body, labels, milestone, assignees, and state.
Store the results in these environment variables:
- TASK_TITLE: issue title
- TASK_BODY: issue body  
- TASK_LABELS: comma-separated labels
- TASK_MILESTONE: milestone title or "None"
- TASK_STATE: issue state

Use the GitHub MCP to get this information.
EOF
            
            # Safe replacement of issue number
            sed -i "s/__ISSUE_NUMBER__/$input/g" "$temp_file"
            
            if claude < "$temp_file"; then
                echo "✅ Issue details fetched successfully with GitHub MCP"
                record_mcp_success
                FETCH_WITH_CLI=false
            else
                echo "⚠️ GitHub MCP fetch failed, falling back to GitHub CLI"
                record_mcp_failure
                FETCH_WITH_CLI=true
            fi
            
            # Clean up
            rm -f "$temp_file"
        else
            echo "⚠️ GitHub MCP not available or circuit breaker active, using GitHub CLI fallback"
            FETCH_WITH_CLI=true
        fi
        
        # Fallback to GitHub CLI if MCP failed or unavailable
        if [[ "$FETCH_WITH_CLI" == "true" ]]; then
            echo "🔄 Fetching issue with GitHub CLI..."
            
            # Sanitize issue number for CLI usage
            SAFE_ISSUE_NUM=$(safe_quote "$input")
            
            if TASK_INFO=$(gh issue view "$SAFE_ISSUE_NUM" --json title,body,labels,milestone,assignees,state 2>/dev/null); then
                TASK_TITLE=$(echo "$TASK_INFO" | jq -r '.title')
                TASK_BODY=$(echo "$TASK_INFO" | jq -r '.body')
                TASK_LABELS=$(echo "$TASK_INFO" | jq -r '.labels[].name' | tr '\n' ',' | sed 's/,$//')
                TASK_MILESTONE=$(echo "$TASK_INFO" | jq -r '.milestone.title // "None"')
                TASK_STATE=$(echo "$TASK_INFO" | jq -r '.state')
                
                echo "✅ Issue details fetched successfully with GitHub CLI"
            else
                ERROR_MSG=$(sanitize_error_message "Failed to fetch issue with both GitHub MCP and CLI. Issue #$input may not exist or you may not have access.")
                echo "❌ $ERROR_MSG"
                exit 1
            fi
        fi
        
        echo "📋 **Task Analysis:**"
        echo "- **Title**: $TASK_TITLE"
        echo "- **Issue**: #$input"
        echo "- **State**: $TASK_STATE"
        echo "- **Labels**: $TASK_LABELS"
        echo "- **Milestone**: $TASK_MILESTONE"
        echo ""
        
        # Analyze issue complexity and type
        local task_complexity=$(analyze_task_complexity "$TASK_BODY" "$TASK_LABELS")
        local task_type=$(determine_task_type "$TASK_LABELS" "$TASK_TITLE")
        
        echo "🧠 **Smart Analysis:**"
        echo "- **Type**: $task_type"
        echo "- **Complexity**: $task_complexity"
        echo "- **Estimated Time**: $(estimate_task_time "$task_complexity")"
        echo ""
        
        # Create intelligent feature branch
        BRANCH_NAME="issue-$input-$(echo "$TASK_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-50)"
        
        # Extract acceptance criteria
        extract_acceptance_criteria "$TASK_BODY"
        
    else
        # Task description provided
        TASK_TITLE="$input"
        TASK_BODY="Implementation needed for: $input"
        TASK_LABELS="custom-task"
        TASK_MILESTONE="None"
        
        echo "📋 **Custom Task:**"
        echo "- **Description**: $TASK_TITLE"
        echo ""
        
        # Create feature branch for custom task
        BRANCH_NAME="task-$(echo "$input" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-50)"
    fi
    
    # Create feature branch with confirmation
    echo "🌿 **Creating feature branch**: $BRANCH_NAME"
    git checkout -b "$BRANCH_NAME"
    echo "✅ **Branch created and checked out**"
}

# Analyze task complexity from description and labels
analyze_task_complexity() {
    local body="$1"
    local labels="$2"
    local complexity_score=0
    
    # Label-based complexity assessment
    if echo "$labels" | grep -q "epic\|large"; then
        complexity_score=$((complexity_score + 3))
    elif echo "$labels" | grep -q "medium"; then
        complexity_score=$((complexity_score + 2))
    elif echo "$labels" | grep -q "small\|quick"; then
        complexity_score=$((complexity_score + 1))
    fi
    
    # Content-based complexity assessment
    local acceptance_criteria_count=$(echo "$body" | grep -c "- \[ \]")
    if [[ $acceptance_criteria_count -gt 5 ]]; then
        complexity_score=$((complexity_score + 2))
    elif [[ $acceptance_criteria_count -gt 2 ]]; then
        complexity_score=$((complexity_score + 1))
    fi
    
    # Technical complexity indicators
    if echo "$body" | grep -qi "database\|migration\|schema"; then
        complexity_score=$((complexity_score + 2))
    fi
    
    if echo "$body" | grep -qi "api\|endpoint\|integration"; then
        complexity_score=$((complexity_score + 2))
    fi
    
    if echo "$body" | grep -qi "authentication\|security\|permissions"; then
        complexity_score=$((complexity_score + 2))
    fi
    
    # Return complexity level
    if [[ $complexity_score -le 2 ]]; then
        echo "simple"
    elif [[ $complexity_score -le 5 ]]; then
        echo "medium"
    else
        echo "complex"
    fi
}

# Determine task type from labels and title
determine_task_type() {
    local labels="$1"
    local title="$2"
    
    if echo "$labels" | grep -q "bug\|fix"; then
        echo "bug-fix"
    elif echo "$labels" | grep -q "feature\|enhancement"; then
        echo "feature"
    elif echo "$labels" | grep -q "docs\|documentation"; then
        echo "documentation"
    elif echo "$labels" | grep -q "test\|testing"; then
        echo "testing"
    elif echo "$labels" | grep -q "refactor\|cleanup"; then
        echo "refactor"
    elif echo "$title" | grep -qi "add\|implement\|create"; then
        echo "feature"
    elif echo "$title" | grep -qi "fix\|resolve\|bug"; then
        echo "bug-fix"
    else
        echo "general"
    fi
}

# Estimate task time based on complexity
estimate_task_time() {
    local complexity="$1"
    
    case "$complexity" in
        "simple")   echo "1-3 hours" ;;
        "medium")   echo "4-8 hours" ;;
        "complex")  echo "1-3 days" ;;
        *)          echo "2-6 hours" ;;
    esac
}

# Extract acceptance criteria from issue body
extract_acceptance_criteria() {
    local body="$1"
    
    echo "✅ **Acceptance Criteria Analysis:**"
    
    # Extract checkbox items
    local criteria=$(echo "$body" | grep "- \[ \]" | sed 's/- \[ \] //')
    
    if [[ -n "$criteria" ]]; then
        local count=1
        while IFS= read -r criterion; do
            [[ -n "$criterion" ]] && echo "  $count. $criterion"
            ((count++))
        done <<< "$criteria"
        
        echo ""
        echo "📊 **Total Criteria**: $((count-1)) items to implement"
    else
        echo "  ⚠️ No explicit acceptance criteria found"
        echo "  💡 Will extract requirements from description during planning"
    fi
    echo ""
}
```

## Visual Progress Tracking

### Progress Indicator System
```bash
# Initialize progress tracking for the task
init_progress_tracking() {
    local task_id="$1"
    local total_phases=5  # Explore, Plan, Code, Test, Write-up
    
    echo "🎯 **Task Progress Tracking Initialized**"
    echo ""
    echo "📊 **Implementation Phases:**"
    echo "  🔍 [  ] 1. Explore & Analyze"
    echo "  📋 [  ] 2. Plan & Design"
    echo "  💻 [  ] 3. Code Implementation"
    echo "  🧪 [  ] 4. Test & Validate"
    echo "  📝 [  ] 5. Document & Wrap-up"
    echo ""
    
    # Store progress state
    export TASK_CURRENT_PHASE=1
    export TASK_TOTAL_PHASES=$total_phases
    export TASK_START_TIME=$(date +%s)
}

# Update progress indicator
update_progress() {
    local phase="$1"
    local status="$2"  # "in_progress", "completed"
    local message="$3"
    
    local phase_names=("" "Explore & Analyze" "Plan & Design" "Code Implementation" "Test & Validate" "Document & Wrap-up")
    local phase_icons=("" "🔍" "📋" "💻" "🧪" "📝")
    
    echo ""
    echo "🎯 **Progress Update:**"
    
    # Show all phases with current status
    for i in {1..5}; do
        local icon="${phase_icons[$i]}"
        local name="${phase_names[$i]}"
        local indicator
        
        if [[ $i -lt $phase ]]; then
            indicator="[✅]"
        elif [[ $i -eq $phase && "$status" == "completed" ]]; then
            indicator="[✅]"
        elif [[ $i -eq $phase && "$status" == "in_progress" ]]; then
            indicator="[🔄]"
        else
            indicator="[  ]"
        fi
        
        echo "  $icon $indicator $i. $name"
    done
    
    if [[ -n "$message" ]]; then
        echo ""
        echo "  💬 **Current**: $message"
    fi
    
    # Calculate and show time elapsed
    local elapsed=$(($(date +%s) - TASK_START_TIME))
    local elapsed_formatted=$(format_duration $elapsed)
    echo "  ⏱️  **Elapsed**: $elapsed_formatted"
    echo ""
    
    # Update current phase
    if [[ "$status" == "completed" ]]; then
        export TASK_CURRENT_PHASE=$((phase + 1))
    else
        export TASK_CURRENT_PHASE=$phase
    fi
}

# Format duration in human-readable format
format_duration() {
    local seconds="$1"
    local hours=$((seconds / 3600))
    local minutes=$(((seconds % 3600) / 60))
    local secs=$((seconds % 60))
    
    if [[ $hours -gt 0 ]]; then
        echo "${hours}h ${minutes}m ${secs}s"
    elif [[ $minutes -gt 0 ]]; then
        echo "${minutes}m ${secs}s"
    else
        echo "${secs}s"
    fi
}

# Show final progress summary
show_progress_summary() {
    local total_time=$(($(date +%s) - TASK_START_TIME))
    local formatted_time=$(format_duration $total_time)
    
    echo "🎉 **Task Completion Summary:**"
    echo ""
    echo "  ✅ All phases completed successfully"
    echo "  ⏱️  Total time: $formatted_time"
    echo "  🎯 Implementation ready for review"
    echo ""
    echo "📋 **Next Steps:**"
    echo "  1. Run '/commit' to create commits"
    echo "  2. Run '/create_pr' to open pull request"
    echo "  3. Use '/pr_review' for quality assurance"
    echo ""
}
```

## Enhanced Workflow Implementation

### Explore Phase with Progress Tracking
```bash
# Enhanced exploration with systematic analysis
enhanced_explore_phase() {
    update_progress 1 "in_progress" "Analyzing GitHub issue and codebase context"

    echo "🔍 **Phase 1: Enhanced Exploration & Analysis**"
    echo ""

    # Parse and analyze the task
    parse_task_input "$1"

    # Initialize progress tracking
    init_progress_tracking "$1"

    # 🧠 BRAIN CONTEXT RECALL - Query for relevant past decisions
    echo "🧠 **Querying brain for relevant context...**"
    echo ""

    # Extract key terms from task title for brain search
    KEY_TERMS=$(echo "$TASK_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z ]//g')

    # Query brain for past decisions and related work
    # brain_recall(query="$TASK_TITLE $KEY_TERMS", limit=10, include_details=true)
    #
    # Display results:
    # - Past decisions about similar features
    # - Previous implementations
    # - Known issues or gotchas
    # - Architectural context

    echo "🧠 **Brain Context Loaded** - Past decisions will inform implementation"
    echo ""

    # Use parallel subagents for comprehensive analysis
    echo "🚀 **Starting parallel codebase analysis...**"

    # Parallel analysis streams:
    # Stream 1: Similar implementations and patterns
    # Stream 2: Dependencies and integration points
    # Stream 3: Testing strategies and examples

    # Complete exploration phase
    update_progress 1 "completed" "Codebase analysis complete, moving to planning"
}
```

### Plan Phase with Validation
```bash
# Enhanced planning with stakeholder validation
enhanced_plan_phase() {
    update_progress 2 "in_progress" "Creating detailed implementation strategy"
    
    echo "📋 **Phase 2: Enhanced Planning & Design**"
    echo ""
    
    # Create comprehensive implementation plan
    echo "🎯 **Implementation Strategy:**"
    echo "- Requirements breakdown from acceptance criteria"
    echo "- Architecture assessment against existing patterns"
    echo "- Comprehensive testing approach (unit, integration, e2e)"
    echo "- Risk assessment with mitigation strategies"
    echo "- Measurable progress milestones"
    echo ""
    
    # Get user approval
    read -p "📋 Review and approve implementation plan? [Y/n]: " approval
    case "$approval" in
        "n"|"N")
            echo "⚠️ Plan needs revision. Please provide feedback..."
            return 1
            ;;
        *)
            echo "✅ Plan approved - proceeding to implementation"
            update_progress 2 "completed" "Implementation plan approved"
            ;;
    esac
}
```

### Code Phase with Validation
```bash
# Enhanced coding with continuous validation
enhanced_code_phase() {
    update_progress 3 "in_progress" "Implementing solution with best practices"
    
    echo "💻 **Phase 3: Code Implementation**"
    echo ""
    
    # Verify feature branch
    local current_branch=$(git branch --show-current)
    echo "🌿 **Working on branch**: $current_branch"
    
    # Implementation with pattern following
    echo "🔧 **Implementation Guidelines:**"
    echo "- Following existing codebase patterns and conventions"
    echo "- Writing clean, maintainable code with clear naming"
    echo "- Implementing proper error handling and validation"
    echo "- Adding appropriate logging and monitoring"
    echo ""
    
    # Code implementation happens here via Task tool
    
    update_progress 3 "completed" "Core implementation complete"
}
```

### Test Phase with Comprehensive Validation
```bash
# Enhanced testing with multiple validation levels
enhanced_test_phase() {
    update_progress 4 "in_progress" "Running comprehensive test suite and validation"
    
    echo "🧪 **Phase 4: Test & Validation**"
    echo ""
    
    # Comprehensive testing strategy
    echo "📋 **Testing Checklist:**"
    echo "- [ ] Unit tests for new functionality"
    echo "- [ ] Integration tests for component interaction"
    echo "- [ ] End-to-end tests for user workflows"
    echo "- [ ] Performance testing for scalability"
    echo "- [ ] Security testing for vulnerabilities"
    echo "- [ ] Accessibility testing for compliance"
    echo ""
    
    # Run tests and validate
    echo "🔄 **Running test suite...**"
    
    # Test execution via Task tool
    
    update_progress 4 "completed" "All tests passing, validation complete"
}
```

### Write-up Phase with Documentation
```bash
# Enhanced documentation and completion
enhanced_writeup_phase() {
    update_progress 5 "in_progress" "Documenting implementation and preparing for review"
    
    echo "📝 **Phase 5: Documentation & Wrap-up**"
    echo ""
    
    # Generate comprehensive documentation
    echo "📋 **Implementation Summary:**"
    echo "- Feature implemented according to acceptance criteria"
    echo "- All tests passing with comprehensive coverage"
    echo "- Code follows project patterns and best practices"
    echo "- Security and accessibility requirements met"
    echo ""
    
    # Prepare for next steps
    echo "🚀 **Ready for Code Review:**"
    echo "- Implementation validated and tested"
    echo "- Documentation updated and complete"
    echo "- Branch ready for pull request creation"
    echo ""
    
    update_progress 5 "completed" "Implementation complete and ready for review"
    show_progress_summary
}
```

## Error Handling

**GitHub issue not found:**
```
❌ Issue #123 not found
Check issue number or try: /do_task "description of task"
```

**Unclear requirements:**
```
❌ Task requirements unclear
Please provide more specific description or acceptance criteria
```

**Implementation challenges:**
```
⚠️ Complex implementation detected
Returning to planning phase for refinement
```

## Phase Success Indicators

**Explore Phase Success:**
- Found 3-5 relevant files and identified code patterns
- Understanding of existing architecture and conventions
- Clear list of files that need modification
- Context about dependencies and integration points

**Plan Phase Success:**
- Clear implementation steps with user approval
- Identified required tests and documentation updates
- Researched unknowns with concrete solutions
- Realistic time estimate and complexity assessment

**Code Phase Success:**
- Working implementation following existing patterns
- All files created/modified as planned
- Code passes basic linting and formatting
- Proper error handling and edge case coverage

**Test Phase Success:**
- All tests pass and functionality validates
- Manual testing confirms user requirements met
- No regressions in existing functionality
- Performance and security considerations addressed

**Write Up Phase Success:**
- Clear documentation of what was implemented
- Key design choices explained with justification
- Useful commands and next steps documented
- Ready for team review and deployment

## Success Criteria
- ✅ Task requirements understood and implemented
- ✅ Code follows existing project patterns
- ✅ Tests pass and functionality works
- ✅ Clear documentation of changes made
- ✅ Ready for commit and review

The goal is practical task implementation with a clear, structured workflow that delivers working code efficiently.