---
category: planning
---

You are helping the user create intelligent tasks with comprehensive project context using the "Explore, Plan, Create" workflow.

## Usage
- `/create_task "Add user authentication system"` - Create task with parallel analysis
- `/create_task "Fix mobile responsive layout"` - Create task with context exploration
- `/create_task "add dashboard" --brainstorm` - Iterative refinement with questions
- `/create_task -b "improve performance"` - Short form brainstorm mode
- `/create_task "Add OAuth login" --panel` - Expert panel reviews the plan before issue creation

## Brainstorming Mode (Inspired by Superpowers)

When `--brainstorm` or `-b` flag is used, switch to an iterative question-driven approach.
This is ideal for vague ideas that need refinement.

### Auto-Suggest Brainstorming

**PROACTIVELY suggest brainstorm mode when:**
- Task description is less than 10 words
- Description contains vague terms: "something", "somehow", "maybe", "improve", "better"
- Multiple interpretations are possible
- User seems uncertain about scope

Example:
```
User: /create_task "add some kind of dashboard"

Claude: This idea could go several directions. Would you like to use
brainstorming mode to refine it? I'll ask you 5 focused questions.

Suggest: /create_task "add some kind of dashboard" --brainstorm
```

### Brainstorming Question Flow

Ask ONE question at a time. Wait for the answer before proceeding.

**Round 1: Problem Definition**
```
What specific problem are you trying to solve? Who experiences this problem?
```
[Wait for user response]

**Round 2: Success Criteria**
```
How will you know this is working? What does "done" look like?
```
[Wait for user response]

**Round 3: Scope Definition**
```
What should this definitely NOT include? What's out of scope?
```
[Wait for user response]

**Round 4: Technical Context**
```
Are there existing patterns in this codebase we should follow? Any constraints?
```
[Wait for user response]

**Round 5: Dependencies**
```
Does this depend on anything else? Does anything depend on this?
```
[Wait for user response]

### Synthesis After Questions

After gathering all answers, synthesize into:
1. **Clear task title** based on refined understanding
2. **Detailed acceptance criteria** from success criteria answers
3. **Explicit scope boundaries** from out-of-scope answers
4. **Implementation approach** from technical context
5. **Dependency notes** for planning

Then proceed to GitHub issue creation with this refined context.

## Expert Panel Mode (`--panel`)

After exploring project context, convene a panel of 5-10 domain experts who interrogate the task plan. Unlike `--brainstorm` (which asks the user questions), the panel simulates experts challenging the approach — surfacing risks, gaps, and alternatives the user hasn't considered.

### How it works

1. **Explore context** — analyze codebase, understand the domain (normal explore phase)
2. **Draft initial plan** — create a preliminary implementation approach
3. **Assemble panel** — select 5-10 experts relevant to the task domain
4. **Each expert interrogates the plan** — asks 1-2 pointed questions about their domain
5. **Present questions to user** — grouped by expert, one round of interactive Q&A
6. **Experts score and advise** — based on the answers, each expert scores 0-100 and provides concrete recommendations
7. **Incorporate feedback** — revise the plan, then create the GitHub issue

### Expert Question Style

Experts ask **specific, actionable questions** — not generic. They draw from the codebase context found during exploration.

```
## Expert Panel Questions

### Dr. Sarah Chen — Security (asks about auth code)
Your plan adds a public API endpoint. How will you prevent unauthorized access?
The existing codebase uses middleware at `src/middleware/auth.ts` — will you reuse it or create new auth?

### James Park — Data Architecture (asks about schema changes)
You're adding a `preferences` field. Will this be a JSON column or a normalized table?
The existing User model has 12 columns already — have you considered a separate table?

### Maria Santos — API Design (asks about contracts)
Will this be a breaking change for existing API consumers?
The current API follows REST conventions in `src/routes/v1/` — does your plan maintain backwards compatibility?
```

### After User Answers

Each expert reviews the answers and provides:

```
## Expert Panel Review

### 1. Dr. Sarah Chen — Security (Score: 91/100)
**Strengths**: Reusing existing auth middleware is the right call.
**Recommendations**:
- Add rate limiting on the new endpoint → **Incorporated**
- Validate input size to prevent payload abuse → **Incorporated**

### 2. James Park — Data Architecture (Score: 87/100)
**Strengths**: Separate table avoids schema bloat.
**Recommendations**:
- Add an index on user_id for the new table → **Incorporated**
- Consider a migration rollback strategy → **Noted**: will address in implementation

[...etc...]

### Score Summary
| Expert | Domain | Score |
|--------|--------|-------|
| Dr. Sarah Chen | Security | 91 |
| James Park | Data Architecture | 87 |
| Maria Santos | API Design | 93 |
| **Average** | | **90.3** |
```

### Expert Selection Guidelines

Pick experts whose domains match the task. Common archetypes:

| Domain | When to include |
|--------|----------------|
| Security Engineer | Auth, input handling, crypto, API endpoints |
| Data Architect / DBA | Schema changes, queries, migrations |
| API Designer | Route changes, contracts, versioning |
| Platform Specialist | Framework-specific concerns (Workers, Next.js, etc.) |
| Frontend Architect | Components, state, UX implications |
| Performance Engineer | Hot paths, scaling, caching |
| DevOps / SRE | Deployment, monitoring, infra impact |
| Privacy / Compliance | PII, data retention, consent |
| Domain Expert | Business logic specific to the project |
| DX / Product Engineer | Pragmatic trade-offs, scope, developer experience |

### Combining with brainstorm

`--panel` and `--brainstorm` can combine:
- `--brainstorm` refines the idea first (user Q&A)
- `--panel` then interrogates the refined plan (expert Q&A)
- `/create_task "add auth" -b --panel` — brainstorm first, then panel review

---

## Workflow: "Explore, Plan, Create"

### 1. Explore Project Context (2-5 minutes)
Understand the project before creating the task:
- **Analyze codebase structure** using Explore agent or Grep/Glob to understand architecture
- **Search Memory MCP** for similar tasks and implementation patterns
- **Review current project state** and identify relevant files/components
- **Understand tech stack** and project conventions
- **Identify existing patterns** that relate to the requested task

### 2. Plan Task Intelligently (5-15 minutes)
Create a comprehensive task specification:
- **Generate smart acceptance criteria** based on project patterns found
- **Suggest implementation approach** using Context7 MCP for best practices
- **Estimate effort** based on similar tasks and complexity analysis
- **Identify dependencies** and potential integration challenges
- **Create detailed task specification** with context-aware details

### 3. Create Enhanced Task (2-5 minutes)
Generate the final task with intelligent content:
- **Create GitHub issue** with rich, context-aware description
- **Store task knowledge** in Memory MCP for future reference
- **Generate local task file** with enhanced planning and context
- **Set up AI implementation context** for seamless /do_task integration

## Implementation

### Project Context Exploration (Optimized with Parallel Execution)
```bash
# Import parallel execution helpers
source .claude/lib/parallel-helpers.sh

# Track performance for optimization metrics
START_TIME=$(date +%s)

# Configuration for project board (customizable via environment)
# For individual users: set GITHUB_ORG to your GitHub username
# To skip project board: set SKIP_PROJECT_BOARD=true or leave vars empty
PROJECT_BOARD_NUMBER="${PROJECT_BOARD_NUMBER:-}"
GITHUB_ORG="${GITHUB_ORG:-}"
SKIP_PROJECT_BOARD="${SKIP_PROJECT_BOARD:-false}"

echo "🚀 Starting intelligent task creation with parallel analysis..."

# Use parallel execution to optimize MCP operations
echo "🔍 Analyzing project context with parallel MCP operations..."
PARALLEL_RESULTS=$(run_parallel_analysis "project" "$TASK_DESCRIPTION")

# Process parallel analysis results
if [[ $? -eq 0 ]]; then
    echo "✅ Parallel project analysis successful"
    
    # Extract results from parallel execution
    PROJECT_OVERVIEW=$(echo "$PARALLEL_RESULTS" | grep "PROJECT_OVERVIEW:" | cut -d: -f2-)
    TECH_STACK=$(echo "$PARALLEL_RESULTS" | grep "TECH_STACK:" | cut -d: -f2-)
    EXISTING_PATTERNS=$(echo "$PARALLEL_RESULTS" | grep "EXISTING_PATTERNS:" | cut -d: -f2-)
    RELEVANT_FILES=$(echo "$PARALLEL_RESULTS" | grep "RELEVANT_FILES:" | cut -d: -f2-)
    INTEGRATION_POINTS=$(echo "$PARALLEL_RESULTS" | grep "INTEGRATION_POINTS:" | cut -d: -f2-)
    SIMILAR_TASKS=$(echo "$PARALLEL_RESULTS" | grep "SIMILAR_TASKS:" | cut -d: -f2-)
    TASK_PATTERNS=$(echo "$PARALLEL_RESULTS" | grep "TASK_PATTERNS:" | cut -d: -f2-)
    BEST_PRACTICES=$(echo "$PARALLEL_RESULTS" | grep "BEST_PRACTICES:" | cut -d: -f2-)
    CURRENT_DOCS=$(echo "$PARALLEL_RESULTS" | grep "CURRENT_DOCS:" | cut -d: -f2-)
    
    # Extract fast analysis results
    TASK_TYPE=$(echo "$PARALLEL_RESULTS" | grep "TASK_TYPE:" | cut -d: -f2- | xargs)
    COMPLEXITY=$(echo "$PARALLEL_RESULTS" | grep "COMPLEXITY:" | cut -d: -f2- | xargs)
    AREA=$(echo "$PARALLEL_RESULTS" | grep "AREA:" | cut -d: -f2- | xargs)
    
    echo "📊 Project analysis complete:"
    echo "  • Task Type: $TASK_TYPE"
    echo "  • Complexity: $COMPLEXITY" 
    echo "  • Project Area: $AREA"
    
else
    echo "⚠️ Parallel analysis failed, using fallback mode"
    # Fallback to basic analysis without MCP if parallel execution fails
    TASK_TYPE=$(analyze_task_type_fast "$TASK_DESCRIPTION")
    COMPLEXITY=$(estimate_complexity_fast "$TASK_DESCRIPTION")
    AREA=$(identify_project_area_fast "$TASK_DESCRIPTION")
    
    # Set default values for missing context
    PROJECT_OVERVIEW="Basic project analysis (fallback mode)"
    TECH_STACK="Standard technology stack"
    EXISTING_PATTERNS="Common development patterns"
    RELEVANT_FILES="To be identified during implementation"
    INTEGRATION_POINTS="Standard integration points"
    SIMILAR_TASKS="No similar tasks found"
    BEST_PRACTICES="Standard best practices"
    CURRENT_DOCS="Documentation to be reviewed"
fi

# Track performance metrics
track_command_performance "create_task_analysis" "$START_TIME"
```

### Intelligent Analysis Functions
```bash
# Analyze task type based on description
analyze_task_type() {
  local description="$1"
  case "$description" in
    *"add"*|*"create"*|*"implement"*|*"build"*) echo "feature" ;;
    *"fix"*|*"bug"*|*"error"*|*"issue"*) echo "bug" ;;
    *"refactor"*|*"improve"*|*"optimize"*|*"clean"*) echo "refactor" ;;
    *"test"*|*"testing"*|*"coverage"*) echo "test" ;;
    *"doc"*|*"documentation"*|*"readme"*) echo "documentation" ;;
    *) echo "feature" ;;
  esac
}

# Estimate complexity based on keywords and project analysis
estimate_complexity() {
  local description="$1"
  local complexity_score=0
  
  # Increase complexity for certain keywords
  [[ "$description" =~ (system|framework|architecture|database|api|auth) ]] && ((complexity_score += 3))
  [[ "$description" =~ (integration|migration|security|performance) ]] && ((complexity_score += 2))
  [[ "$description" =~ (multiple|complex|advanced|enterprise) ]] && ((complexity_score += 2))
  [[ "$description" =~ (simple|basic|small|minor|quick) ]] && ((complexity_score -= 2))
  
  # Analyze against existing codebase patterns
  local similar_tasks_complexity=$(analyze_similar_tasks_complexity "$description")
  complexity_score=$((complexity_score + similar_tasks_complexity))
  
  if [[ $complexity_score -le 1 ]]; then
    echo "simple"
  elif [[ $complexity_score -le 4 ]]; then
    echo "medium"
  else
    echo "complex"
  fi
}

# Identify project area based on description and codebase analysis
identify_project_area() {
  local description="$1"
  
  # Use Explore agent to analyze which part of codebase this relates to
  local codebase_areas=$(identify_codebase_areas "$description")
  
  case "$description" in
    *"ui"*|*"interface"*|*"component"*|*"frontend"*) echo "frontend" ;;
    *"api"*|*"backend"*|*"server"*|*"database"*) echo "backend" ;;
    *"auth"*|*"login"*|*"user"*|*"permission"*) echo "authentication" ;;
    *"test"*|*"testing"*) echo "testing" ;;
    *"deploy"*|*"build"*|*"ci"*|*"cd"*) echo "devops" ;;
    *"doc"*|*"documentation"*) echo "documentation" ;;
    *) echo "$codebase_areas" ;;
  esac
}

# Generate project context summary using parallel MCP analysis results
generate_project_context_summary() {
  cat <<EOF
**Architecture**: $(echo "$PROJECT_OVERVIEW" | head -2)
**Tech Stack**: $TECH_STACK
**Existing Patterns**: $(echo "$EXISTING_PATTERNS" | head -3)
**Related Components**: $(echo "$RELEVANT_FILES" | head -5)
EOF
}

# Generate intelligent acceptance criteria using parallel analysis results
generate_intelligent_acceptance_criteria() {
  cat <<EOF
- [ ] Implementation follows existing project patterns: $EXISTING_PATTERNS
- [ ] Integrates properly with identified components: $(echo "$INTEGRATION_POINTS" | tr '\n' ', ')
- [ ] Maintains consistency with project tech stack: $TECH_STACK
- [ ] Includes appropriate error handling and validation
- [ ] Follows established coding conventions and standards
- [ ] Includes tests consistent with existing test patterns
- [ ] Updates documentation if user-facing changes are made
$(generate_specific_criteria_from_context)
EOF
}

# Suggest implementation approach using parallel analysis insights
suggest_implementation_approach() {
  cat <<EOF
**Recommended Approach**:
1. **Leverage existing patterns**: $(echo "$EXISTING_PATTERNS" | head -1)
2. **Build on current architecture**: $(echo "$PROJECT_OVERVIEW" | head -1)
3. **Follow established conventions**: $TECH_STACK best practices
4. **Integration strategy**: $(echo "$INTEGRATION_POINTS" | head -1)

**Similar implementations found**: $(echo "$SIMILAR_TASKS" | head -2)
**Best practices to follow**: $(echo "$BEST_PRACTICES" | head -2)
EOF
}

# Estimate effort in hours
estimate_effort_hours() {
  local complexity=$(estimate_complexity "$TASK_DESCRIPTION")
  local similar_effort=$(get_similar_task_effort "$TASK_DESCRIPTION")
  
  case "$complexity" in
    "simple") echo "1-3" ;;
    "medium") echo "4-8" ;;
    "complex") echo "8-16" ;;
  esac
}

# Identify integration points
identify_integration_points() {
  echo "$INTEGRATION_POINTS"
}

# List relevant files
list_relevant_files() {
  echo "$RELEVANT_FILES"
}
```

### Intelligent Task Planning
Use MCP servers and agents to create context-aware tasks:
- **Explore Agent**: Project structure analysis and code pattern identification
- **Memory MCP**: Historical task patterns and successful approaches
- **Context7 MCP**: Latest best practices and documentation
- **GitHub MCP**: Repository information and issue management
- **Brain MCP (Decision Templates)**: Use `brain_decision_templates(decision_type)` to load structured templates when tasks involve architectural choices, library selection, or pattern decisions. Templates provide guided prompts for context, options, and rationale.
- **Brain MCP (Coaching)**: Use `brain_coaching_insights()` to surface prompt quality tips and learning patterns that should inform task description quality

### Enhanced GitHub Issue Creation
```bash
# Load security utilities
source .claude/lib/security-utils.sh

# Create issue with intelligent content and proper tagging
TASK_DESCRIPTION="$1"

# Validate input before processing
if ! validate_github_input "$TASK_DESCRIPTION" "title"; then
    echo "❌ Invalid task description provided"
    exit 1
fi

# Use fast analysis results from parallel execution
TASK_TYPE="$TASK_TYPE"
COMPLEXITY="$COMPLEXITY"
AREA="$AREA"

# Dynamic label assignment using GitHub MCP discovery
source .claude/lib/github-labels.sh

echo "🏷️  Discovering available repository labels..."
AVAILABLE_LABELS=$(get_available_labels)

# Select appropriate labels based on task analysis and available options
TASK_LABELS=$(select_task_labels "$TASK_TYPE" "$COMPLEXITY" "$AREA")

# Estimate story points using Fibonacci scale
echo "📊 Estimating story points..."
ESTIMATED_POINTS=$(estimate_story_points "$TASK_DESCRIPTION" "$TASK_TYPE")
echo "💡 Estimated story points: $ESTIMATED_POINTS (based on complexity analysis)"

# Find story point label
STORY_POINT_LABEL=$(find_story_point_label "$ESTIMATED_POINTS" "$AVAILABLE_LABELS")
if [[ -n "$STORY_POINT_LABEL" ]]; then
    echo "✅ Story point label available: $STORY_POINT_LABEL"
else
    echo "⚠️  Story point label points/$ESTIMATED_POINTS not found - may need to create labels"
    STORY_POINT_LABEL="points/$ESTIMATED_POINTS"
fi

# Add framework-specific labels if available
FRAMEWORK_LABEL=$(find_best_label_match "ai-planned" "$AVAILABLE_LABELS")
if [[ -z "$FRAMEWORK_LABEL" ]]; then
    FRAMEWORK_LABEL=$(find_best_label_match "ai-framework" "$AVAILABLE_LABELS")
fi

# Combine all labels (including story points)
LABELS_ARRAY=()
[[ -n "$TASK_LABELS" ]] && LABELS_ARRAY+=("$TASK_LABELS")
[[ -n "$STORY_POINT_LABEL" ]] && LABELS_ARRAY+=("$STORY_POINT_LABEL")
[[ -n "$FRAMEWORK_LABEL" ]] && LABELS_ARRAY+=("$FRAMEWORK_LABEL")

# Join labels with comma
LABELS=$(IFS=','; echo "${LABELS_ARRAY[*]}")

# Validate labels if present
if [[ -n "$LABELS" ]] && ! validate_github_input "$LABELS" "label"; then
    echo "⚠️ Invalid labels detected, proceeding without labels"
    LABELS=""
fi

# Provide user feedback about label selection
if [[ -n "$LABELS" ]]; then
    echo "$(get_label_feedback "enhancement,ai-planned,$TASK_TYPE,$COMPLEXITY,$AREA" "$LABELS")"
else
    echo "⚠️  No suitable labels found - proceeding without labels"
fi

# Create GitHub issue with intelligent content and proper tagging
ISSUE_BODY=$(cat <<EOF
## Description
$TASK_DESCRIPTION

## Project Context Analysis (Parallel MCP Analysis)
$(generate_project_context_summary)

## Smart Acceptance Criteria
$(generate_intelligent_acceptance_criteria)

## Implementation Approach
$(suggest_implementation_approach)

## Effort Estimation
**Estimated Complexity**: $COMPLEXITY
**Estimated Time**: $(estimate_effort_hours) hours
**Story Points**: $ESTIMATED_POINTS (Fibonacci scale)
**Project Area**: $AREA

## Integration Notes
$(identify_integration_points)

## Related Files
$(list_relevant_files)

---
*This task was created using AI project analysis with the LDC AI framework (Parallel MCP Optimization)*
EOF
)

# Validate issue body
if ! validate_github_input "$ISSUE_BODY" "body"; then
    echo "❌ Generated issue body contains invalid content"
    exit 1
fi

# Create the GitHub issue with GitHub MCP priority and CLI fallback
echo "🔗 Creating GitHub issue with GitHub MCP..."

# Check if we should try MCP (circuit breaker pattern)
if should_try_mcp && is_github_mcp_available; then
    echo "✅ Using GitHub MCP for issue creation"
    
    # Use secure MCP call wrapper
    if [[ -n "$LABELS" ]]; then
        if secure_mcp_call "create_issue" "$TASK_DESCRIPTION" "$ISSUE_BODY" "$LABELS"; then
            echo "✅ GitHub issue created successfully with GitHub MCP"
            record_mcp_success
            CREATE_WITH_CLI=false
        else
            echo "⚠️ GitHub MCP issue creation failed, falling back to GitHub CLI"
            record_mcp_failure
            CREATE_WITH_CLI=true
        fi
    else
        if secure_mcp_call "create_issue" "$TASK_DESCRIPTION" "$ISSUE_BODY" ""; then
            echo "✅ GitHub issue created successfully with GitHub MCP"
            record_mcp_success
            CREATE_WITH_CLI=false
        else
            echo "⚠️ GitHub MCP issue creation failed, falling back to GitHub CLI"
            record_mcp_failure
            CREATE_WITH_CLI=true
        fi
    fi
else
    echo "⚠️ GitHub MCP not available or circuit breaker active, using GitHub CLI fallback"
    CREATE_WITH_CLI=true
fi

# Fallback to GitHub CLI if MCP failed or unavailable
if [[ "$CREATE_WITH_CLI" == "true" ]]; then
    echo "🔄 Creating issue with GitHub CLI..."
    
    # Sanitize inputs for CLI usage
    SAFE_TITLE=$(safe_quote "$TASK_DESCRIPTION")
    SAFE_BODY=$(safe_quote "$ISSUE_BODY")
    
    if [[ -n "$LABELS" ]]; then
        SAFE_LABELS=$(safe_quote "$LABELS")
        if gh issue create --title "$SAFE_TITLE" --body "$SAFE_BODY" --label "$SAFE_LABELS" --assignee "@me"; then
            echo "✅ GitHub issue created successfully with GitHub CLI"
            ISSUE_URL=$(gh issue list --limit 1 --json url --jq '.[0].url')
            ISSUE_NUMBER=$(gh issue list --limit 1 --json number --jq '.[0].number')
            
            # Add to project board (if configured)
            if [[ "$SKIP_PROJECT_BOARD" != "true" && -n "$PROJECT_BOARD_NUMBER" && -n "$GITHUB_ORG" ]]; then
                echo "📊 Adding issue to project board #$PROJECT_BOARD_NUMBER..."
                if gh issue edit "$ISSUE_NUMBER" --add-project "$PROJECT_BOARD_NUMBER" 2>/dev/null; then
                    echo "✅ Issue added to project board successfully"
                else
                    echo "⚠️  Direct project assignment failed, trying alternative method..."
                    if gh project item-add "$PROJECT_BOARD_NUMBER" --owner "$GITHUB_ORG" --url "$ISSUE_URL" 2>/dev/null; then
                        echo "✅ Issue added to project board using alternative method"
                    else
                        echo "⚠️  Could not automatically add to project board"
                        echo "ℹ️  Please manually add issue #$ISSUE_NUMBER to project board if needed"
                    fi
                fi
            else
                echo "ℹ️  Project board integration skipped (not configured)"
            fi
        else
            ERROR_MSG=$(sanitize_error_message "Failed to create GitHub issue with both GitHub MCP and CLI")
            echo "❌ $ERROR_MSG"
            exit 1
        fi
    else
        echo "ℹ️  Creating issue without labels (none available)"
        if gh issue create --title "$SAFE_TITLE" --body "$SAFE_BODY" --assignee "@me"; then
            echo "✅ GitHub issue created successfully with GitHub CLI"
        else
            ERROR_MSG=$(sanitize_error_message "Failed to create GitHub issue with both GitHub MCP and CLI")
            echo "❌ $ERROR_MSG"
            exit 1
        fi
    fi
fi
```

### Smart Task File Generation
```bash
# Task creation now relies solely on GitHub issues - no local files created
create_enhanced_task_file() {
  local issue_number="$1"
  local task_title="$2"
  local issue_url="$3"
  
  # GitHub issue is now the single source of truth
  echo "✅ Task tracking: GitHub issue #$issue_number"
  echo "🔗 Issue URL: $issue_url"
  echo "📋 All task information stored in GitHub - no local files created"
}

# Store task knowledge in Memory MCP for future reference
store_task_knowledge() {
  local task_description="$1"
  local project_context="$2"
  local implementation_approach="$3"
  
  # Store task creation patterns in Memory MCP
  memory_store_task_pattern "$task_description" "$project_context" "$implementation_approach"
  
  # Store project insights for future tasks
  memory_store_project_insights "$PROJECT_OVERVIEW" "$TECH_STACK" "$EXISTING_PATTERNS"
  
  # Store successful analysis patterns
  memory_store_analysis_pattern "$TASK_TYPE" "$COMPLEXITY" "$AREA" "$INTEGRATION_POINTS"
  
  # Store performance metrics for optimization
  memory_store_performance_data "create_task" "parallel" "$START_TIME" "$(date +%s)"
  
  echo "🧠 Task knowledge stored in Memory MCP for future reference"
  echo "📊 Performance data stored for continuous optimization"
}

# Create agent work log for handoff continuity (ADR-002)
create_agent_work_log() {
  local issue_number="$1"
  local task_title="$2"
  local branch_name="${3:-main}"
  
  # Load work log utilities
  source .claude/lib/work-log-utils.sh
  
  # Create the work log from template
  local log_path=$(create_work_log "$issue_number" "$task_title" "$branch_name")
  
  echo "📋 Agent work log created: $log_path"
  echo "   → Enables agent continuity across sessions"
  echo "   → Tracks decisions, blockers, and progress"
  echo "   → Delete when issue is closed"
}
```

### Agent Work Log Creation (ADR-002)
After creating the GitHub issue, create an agent work log for session continuity:

```bash
# After successful issue creation, create work log
if [[ -n "$ISSUE_NUMBER" ]]; then
    create_agent_work_log "$ISSUE_NUMBER" "$TASK_DESCRIPTION" "$BRANCH_NAME"
fi
```

The work log is stored at `.ai/work/issue-{N}.md` and enables:
- **Agent continuity**: Pick up where previous sessions left off
- **Multi-agent coordination**: Shared context for parallel work
- **Decision tracking**: Prevent re-litigation of settled choices
- **Failure logging**: Don't repeat failed approaches

## MCP Integration Strategy

### Memory MCP Usage
- **Store task patterns**: Save successful task creation patterns
- **Retrieve similar tasks**: Find related implementations and approaches
- **Build project knowledge**: Accumulate understanding over time
- **Pattern recognition**: Identify common task types and solutions
- **Performance tracking**: Store optimization metrics for improvement

### Explore Agent Usage
- **Analyze project structure**: Understand architecture and organization
- **Identify code patterns**: Find existing implementations to build upon
- **Understand conventions**: Learn project coding standards and practices
- **Find integration points**: Locate where new functionality should connect

### Context7 MCP Usage
- **Access best practices**: Get latest documentation and guidelines
- **Validate approaches**: Check current technology recommendations
- **Research solutions**: Find established patterns for similar problems
- **Technology guidance**: Understand framework-specific implementations

### GitHub MCP Usage (Primary)
- **Create intelligent issues**: Enhanced issue creation with context (prioritized over CLI)
- **Link related issues**: Connect to existing tasks and epics
- **Manage labels and milestones**: Smart categorization and planning
- **Track relationships**: Build connections between related work
- **Automatic fallback**: GitHub CLI used only when MCP is unavailable or fails

## Enhanced Features

### Parallel Execution Optimization
Tasks now benefit from parallel MCP analysis:
- **Faster analysis**: Multiple MCP operations run simultaneously
- **Improved performance**: 2-5x faster task creation with parallel execution
- **Graceful fallback**: Automatic sequential mode if parallel execution fails
- **Progress indicators**: Real-time feedback on parallel operations
- **Performance tracking**: Metrics collection for continuous optimization

### Context-Aware Task Creation
Tasks generated with full project understanding:
- Analysis of existing codebase and patterns
- Understanding of project architecture and conventions  
- Identification of relevant files and integration points
- Recognition of similar existing functionality

### Intelligent Content Generation
- **Smart acceptance criteria**: Based on project patterns and best practices
- **Implementation hints**: Suggestions derived from codebase analysis
- **Effort estimation**: Informed by similar tasks and complexity factors
- **Integration guidance**: Understanding of how new work fits existing architecture

### Knowledge Building
Each task creation improves future planning:
- Stores successful patterns in Memory MCP
- Builds understanding of project architecture
- Learns from implementation approaches
- Accumulates project-specific knowledge
- Tracks performance metrics for optimization

## Example Enhanced Workflow

```
User: /create_task "Add user profile editing functionality"

Claude: Creating intelligent task with parallel MCP analysis...

🚀 **Starting Parallel Analysis** (15 seconds)
🔄 Running parallel analysis for project context analysis...
  🔄 Project structure and patterns
  🔄 Knowledge and best practices search
  🔄 Integration points discovery
  
✅ Project structure and patterns complete
✅ Knowledge and best practices search complete
✅ Integration points discovery complete
✅ Parallel project analysis complete

📊 **Project Analysis Results:**
  • Task Type: feature
  • Complexity: medium
  • Project Area: authentication

**Project Context Found:**
- Existing User model with profile fields
- AuthContext for user state management
- Form validation patterns using react-hook-form
- API endpoints following REST conventions
- UI components in /src/components structure

📋 **Planning Intelligent Task** (30 seconds)
✅ Generating context-aware acceptance criteria
✅ Identifying integration points with existing auth system
✅ Estimating effort based on similar form implementations
✅ Creating implementation approach based on project patterns

**Intelligent Plan Generated:**
- Leverage existing AuthContext and User model
- Follow established form validation patterns
- Integrate with current API endpoint structure  
- Use existing UI component library and styling
- Estimated effort: 4-8 hours based on similar tasks

✅ **Created Enhanced GitHub Issue**
- **Issue #132**: "Add user profile editing functionality"
- **Labels**: enhancement, ai-planned, feature, frontend, authentication  
- **Complexity**: medium (4-8 hours estimated)
- **Project Area**: authentication/frontend
- **Rich Description**: Includes parallel project context analysis

✅ **Task Created in GitHub**
- **GitHub Issue**: #132 with comprehensive analysis
- **Content**: All analysis and insights stored in GitHub issue
- **Integration**: Ready for seamless /do_task workflow
- **Performance**: Optimized with parallel execution

✅ **Knowledge Storage**
- **Memory MCP**: Task patterns and project insights stored
- **Performance Data**: Parallel execution metrics tracked
- **Future Benefit**: Similar tasks will be created faster and smarter

⏱️ create_task_analysis completed in 45s (60% faster with parallel execution)

**GitHub Issue URL**: https://github.com/owner/repo/issues/132

🚀 **Ready for intelligent implementation with:** /do_task 132

*Note: The explore phase is already complete with parallel optimization, so /do_task will move directly to enhanced planning.*
```

## Error Handling

**GitHub MCP unavailable (automatic fallback):**
```
⚠️ GitHub MCP not available, using GitHub CLI fallback
🔄 Creating issue with GitHub CLI...
✅ GitHub issue created successfully with GitHub CLI
```

**GitHub authentication required:**
```
❌ GitHub authentication required
Run: gh auth login
Then try: /create_task "your task description" again
```

**Not in a GitHub repository:**  
```
❌ Not in a GitHub repository
Initialize with: git remote add origin <github-url>
Or clone an existing repository
```

**Both GitHub MCP and CLI unavailable:**
```
❌ Failed to create GitHub issue with both GitHub MCP and CLI
Please check your GitHub authentication and connectivity
```

**Parallel execution fallback:**
```
⚠️ Parallel MCP analysis failed, using fallback approach
Creating basic task without enhanced intelligence
Task will still be created successfully
Performance: Sequential mode active
```

**MCP server unavailable:**
```
⚠️ MCP server temporarily unavailable
Creating task with available analysis capabilities
Task will still be created successfully
```

## Performance Optimization

### Parallel Execution Benefits
- **Speed Improvement**: 2-5x faster task creation
- **Resource Efficiency**: Better utilization of available MCP servers
- **Graceful Degradation**: Automatic fallback to sequential execution
- **Progress Transparency**: Real-time feedback on parallel operations
- **Performance Tracking**: Continuous optimization with metrics collection

### Success Criteria
- ✅ Task created with comprehensive project context (parallel optimized)
- ✅ Intelligent acceptance criteria generated from existing patterns
- ✅ Implementation approach suggested based on codebase analysis
- ✅ Effort estimation provided from similar task analysis
- ✅ Knowledge stored in Memory MCP for future task improvements
- ✅ Performance metrics tracked for continuous optimization
- ✅ Seamless integration with enhanced /do_task workflow

## Integration with Development Workflow

Created tasks integrate perfectly with the enhanced development process:
- **Explore phase complete**: Project context already analyzed during task creation with parallel optimization
- **Plan phase enhanced**: Implementation approach and hints already provided with improved performance
- **Code phase informed**: Understanding of existing patterns and integration points
- **Test phase guided**: Knowledge of project testing patterns and conventions

The goal is intelligent task creation that leverages comprehensive project understanding and parallel execution optimization to generate better, more actionable tasks faster, setting up AI implementation for success with improved performance.
