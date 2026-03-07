---
category: planning
---

# /create_milestone

You are helping the user create intelligent GitHub milestones with optional task decomposition for complex epic-level planning.

## Usage
- `/create_milestone "Sprint 3: User Authentication"` - Create milestone with AI-enhanced description
- `/create_milestone "Complete user auth system with OAuth, password reset, admin dashboard"` - Create milestone with intelligent task breakdown
- `/create_milestone "Q4 Performance Improvements" --due "2024-12-31"` - Create milestone with due date
- `/create_milestone "Security Hardening Epic" --auto-create-tasks` - Auto-create suggested tasks as GitHub issues

## Workflow: "Analyze, Decompose, Create, Organize"

### 1. Analyze Milestone Scope (1-3 minutes)
First, understand the milestone and project context:
- Parse milestone title and extract key themes
- Use MCP analysis to understand project context and complexity
- Determine if this is a simple milestone or complex epic requiring task breakdown
- Research similar milestones and patterns from project history

### 2. Decompose Complex Epics (2-5 minutes)
For complex descriptions, break down into constituent tasks:
- Identify distinct functional components and features
- Analyze dependencies and logical groupings
- Generate 3-7 actionable task titles
- Estimate complexity and timeline for each component
- Present breakdown to user for approval before proceeding

### 3. Create GitHub Milestone (1-2 minutes)
Create the milestone with enhanced content:
- Generate rich milestone description with context and goals
- Create GitHub milestone using repository API
- Apply appropriate labels and metadata
- Set intelligent due date based on scope analysis
- Link to related issues or PRs if relevant

### 4. Organize and Track (2-3 minutes)
Set up milestone tracking and task management:
- Create local milestone tracking file in `.ai/milestones/`
- Optionally create suggested tasks as GitHub issues
- Link existing relevant issues to the milestone
- Set up progress tracking framework
- Provide next steps and workflow guidance

## Implementation

### Parse Input and Analyze Context
```bash
# Input validation function
validate_milestone_input() {
    local title="$1"
    
    # Check if title is empty
    if [[ -z "$title" ]]; then
        echo "❌ Error: Milestone title cannot be empty"
        echo "Usage: /create_milestone \"Your milestone title\""
        return 1
    fi
    
    # Length validation
    if [[ ${#title} -gt 200 ]]; then
        echo "❌ Error: Milestone title too long (max 200 characters)"
        return 1
    fi
    
    # Character validation - block shell metacharacters
    if [[ "$title" =~ [\$\`\;\|\&\<\>\!\~] ]]; then
        echo "❌ Error: Invalid characters in milestone title"
        echo "Milestone titles cannot contain: \$ \` ; | & < > ! ~"
        return 1
    fi
    
    return 0
}

# Sanitization function for GitHub API
sanitize_for_github() {
    local input="$1"
    # Remove potentially dangerous characters and limit length
    echo "$input" | tr -d '$`|&;<>!~' | head -c 200
}

# Extract milestone information
MILESTONE_TITLE="$1"
DUE_DATE=""
AUTO_CREATE_TASKS=false

# Validate input immediately
if ! validate_milestone_input "$MILESTONE_TITLE"; then
    exit 1
fi

# Parse optional parameters
while [[ $# -gt 1 ]]; do
    case $1 in
        --due)
            DUE_DATE="$2"
            shift 2
            ;;
        --auto-create-tasks)
            AUTO_CREATE_TASKS=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

echo "🎯 Creating milestone: \"$MILESTONE_TITLE\""

# Validate GitHub repository context - prioritize GitHub MCP with CLI fallback
echo "🔍 Validating GitHub repository context..."

if command -v claude &> /dev/null && claude mcp list 2>/dev/null | grep -q "github.*✓ Connected"; then
    echo "✅ Using GitHub MCP for repository validation"
    
    if claude << EOF
Please validate that we're in a GitHub repository and get repository information:
- Repository name
- Repository owner
- Access permissions

Store the results in environment variables:
- REPO_NAME: repository name
- REPO_OWNER: repository owner

Use the GitHub MCP to get this information.
EOF
    then
        echo "✅ Repository validation successful with GitHub MCP"
        echo "📍 Repository: $REPO_OWNER/$REPO_NAME"
        VALIDATE_WITH_CLI=false
    else
        echo "⚠️ GitHub MCP validation failed, falling back to GitHub CLI"
        VALIDATE_WITH_CLI=true
    fi
else
    echo "⚠️ GitHub MCP not available, using GitHub CLI fallback"
    VALIDATE_WITH_CLI=true
fi

# Fallback to GitHub CLI if MCP failed or unavailable
if [[ "$VALIDATE_WITH_CLI" == "true" ]]; then
    echo "🔄 Validating repository with GitHub CLI..."
    
    if ! gh repo view > /dev/null 2>&1; then
        echo "❌ Error: Not in a GitHub repository or no GitHub access"
        echo "Run 'gh auth login' and ensure you're in a repository directory"
        exit 1
    fi

    REPO_INFO=$(gh repo view --json name,owner)
    REPO_NAME=$(echo "$REPO_INFO" | jq -r '.name')
    REPO_OWNER=$(echo "$REPO_INFO" | jq -r '.owner.login')
    echo "📍 Repository: $REPO_OWNER/$REPO_NAME"
    
    if [[ $? -eq 0 ]]; then
        echo "✅ Repository validation successful with GitHub CLI"
    else
        echo "❌ Failed to validate repository with both GitHub MCP and CLI"
        exit 1
    fi
fi
```

### Intelligent Scope Analysis and Task Decomposition
```bash
# Use MCP servers for milestone analysis
echo "🔍 Analyzing milestone scope and complexity..."

# Analyze milestone complexity and scope with error handling
# Use safe escaping for MCP calls to prevent command injection
SAFE_MILESTONE_TITLE=$(printf '%q' "$MILESTONE_TITLE")

echo "🤖 Requesting AI analysis for milestone complexity..."
MILESTONE_ANALYSIS=$(cat <<EOF
Analyze this milestone title for scope and complexity: $SAFE_MILESTONE_TITLE

Please provide your response in this structured format:
Complexity Level: [simple/medium/complex]
Task Breakdown Needed: [yes/no]
Estimated Timeline: [2-12 weeks]
Main Components: [list key areas]

Additional Analysis:
1. Is this a simple feature milestone or complex epic requiring task breakdown?
2. What are the main functional components or areas involved?
3. What would be logical task groupings for implementation?
4. Suggested timeline based on scope

Provide structured analysis for milestone planning.
EOF
)

# Check if MCP analysis failed
if [[ -z "$MILESTONE_ANALYSIS" || $? -ne 0 ]]; then
    echo "⚠️ Warning: AI analysis unavailable - using default complexity assessment"
    # Fallback: simple heuristic based on title length and keywords
    if [[ ${#MILESTONE_TITLE} -gt 50 ]] || echo "$MILESTONE_TITLE" | grep -qi "complete\|full\|comprehensive\|system\|platform\|architecture"; then
        MILESTONE_ANALYSIS="Complexity Level: complex
Task Breakdown Needed: yes
Estimated Timeline: 8 weeks
Fallback analysis based on title keywords and length."
    else
        MILESTONE_ANALYSIS="Complexity Level: simple
Task Breakdown Needed: no
Estimated Timeline: 3 weeks
Basic milestone detected."
    fi
fi

# Extract complexity level from analysis output with fallback handling
extract_complexity() {
    local analysis="$1"
    local complexity_line complexity_level
    
    # Try to find a structured complexity line first
    complexity_line=$(echo "$analysis" | grep -i "^complexity level:" | head -1)
    if [[ -n "$complexity_line" ]]; then
        complexity_level=$(echo "$complexity_line" | awk -F: '{print tolower($2)}' | xargs)
    else
        # Fallback: look for complexity keywords in the text
        if echo "$analysis" | grep -qi "complex\|epic\|multiple\|large\|extensive"; then
            complexity_level="complex"
        elif echo "$analysis" | grep -qi "medium\|moderate"; then
            complexity_level="medium"
        elif echo "$analysis" | grep -qi "simple\|basic\|small"; then
            complexity_level="simple"
        else
            complexity_level="medium"  # default fallback
        fi
    fi
    
    echo "$complexity_level"
}

# Determine if task breakdown is needed
COMPLEXITY=$(extract_complexity "$MILESTONE_ANALYSIS")
if [[ "$COMPLEXITY" == "complex" || "$COMPLEXITY" == "epic" || "$COMPLEXITY" == "multiple" ]]; then
    NEEDS_BREAKDOWN="true"
else
    NEEDS_BREAKDOWN="false"
fi

if [[ "$NEEDS_BREAKDOWN" == "true" ]]; then
    echo "🧠 Complex milestone detected - generating task breakdown..."
    
    # Generate task decomposition with error handling
    echo "🤖 Requesting AI task breakdown..."
    TASK_BREAKDOWN=$(cat <<EOF
Break down this milestone into 3-7 specific, actionable tasks: $SAFE_MILESTONE_TITLE

Requirements:
1. Each task should be a distinct, implementable feature or component
2. Tasks should be logically ordered by dependencies
3. Use clear, specific task titles (not vague descriptions)
4. Focus on user-facing features and technical implementation tasks
5. Ensure tasks are appropriately scoped (not too large or small)

Provide numbered list of task titles only.
EOF
    )
    
    # Check if task breakdown failed
    if [[ -z "$TASK_BREAKDOWN" || $? -ne 0 ]]; then
        echo "⚠️ Warning: AI task breakdown unavailable - using generic task structure"
        TASK_BREAKDOWN="1. Setup and infrastructure preparation
2. Core feature implementation  
3. User interface development
4. Testing and validation
5. Documentation and deployment"
    fi
    
    echo "📋 Suggested task breakdown:"
    echo "$TASK_BREAKDOWN"
    echo ""
    
    # Get user approval for task breakdown
    read -p "✅ Create milestone with this task breakdown? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Milestone creation cancelled"
        exit 1
    fi
else
    echo "✅ Simple milestone - proceeding with direct creation"
    TASK_BREAKDOWN=""
fi
```

### Enhanced Milestone Description Generation
```bash
# Generate enhanced milestone description
echo "📝 Generating enhanced milestone description..."
MILESTONE_DESCRIPTION=$(cat <<EOF | claude mcp call context7 generate_milestone_description 2>/dev/null
Create a comprehensive GitHub milestone description for: $SAFE_MILESTONE_TITLE

Context:
- Repository: $REPO_OWNER/$REPO_NAME
- Complexity: $COMPLEXITY
- Task breakdown: $TASK_BREAKDOWN

Include:
1. Clear milestone objective and goals
2. Success criteria and acceptance requirements
3. Key deliverables and outcomes expected
4. Estimated timeline and effort
5. Any dependencies or prerequisites
6. Integration notes for existing project features

Format as GitHub markdown suitable for milestone description.
EOF
)

# Check if description generation failed
if [[ -z "$MILESTONE_DESCRIPTION" || $? -ne 0 ]]; then
    echo "⚠️ Warning: AI description generation unavailable - using standard template"
    MILESTONE_DESCRIPTION="## Milestone: $MILESTONE_TITLE

### Objective
Complete the implementation and delivery of: $MILESTONE_TITLE

### Success Criteria
- All associated tasks and features are implemented
- Code passes all tests and quality checks
- Documentation is updated and complete
- Features are deployed and operational

### Timeline
Target completion based on $COMPLEXITY complexity level.

### Repository
$REPO_OWNER/$REPO_NAME"
fi

# Cross-platform date function
get_due_date() {
    local interval="$1"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS/BSD date
        case "$interval" in
            "+2 weeks") date -v+2w +%Y-%m-%d ;;
            "+6 weeks") date -v+6w +%Y-%m-%d ;;
            "+12 weeks") date -v+12w +%Y-%m-%d ;;
            "+4 weeks") date -v+4w +%Y-%m-%d ;;
            *) date -v+4w +%Y-%m-%d ;;
        esac
    else
        # GNU date (Linux)
        date -d "$interval" +%Y-%m-%d
    fi
}

# Set intelligent due date if not provided
if [[ -z "$DUE_DATE" ]]; then
    # Estimate due date based on complexity
    case "$COMPLEXITY" in
        *simple*)
            DUE_DATE=$(get_due_date "+2 weeks")
            ;;
        *medium*)
            DUE_DATE=$(get_due_date "+6 weeks")
            ;;
        *complex*)
            DUE_DATE=$(get_due_date "+12 weeks")
            ;;
        *)
            DUE_DATE=$(get_due_date "+4 weeks")
            ;;
    esac
    echo "📅 Auto-suggested due date: $DUE_DATE (based on complexity analysis)"
fi
```

### Create GitHub Milestone
```bash
# Create milestone via GitHub API
echo "🚀 Creating GitHub milestone..."

# Sanitize variables for GitHub API
CLEAN_TITLE=$(sanitize_for_github "$MILESTONE_TITLE")
CLEAN_DESCRIPTION=$(sanitize_for_github "$MILESTONE_DESCRIPTION")

# Create milestone - prioritize GitHub MCP with CLI fallback
echo "🔄 Creating GitHub milestone..."

if command -v claude &> /dev/null && claude mcp list 2>/dev/null | grep -q "github.*✓ Connected"; then
    echo "✅ Using GitHub MCP for milestone creation"
    
    if claude << EOF
Please create a GitHub milestone with these details:
- Title: "$CLEAN_TITLE"
- Description: "$CLEAN_DESCRIPTION"
- Due date: "${DUE_DATE}T23:59:59Z"

Store the results in environment variables:
- MILESTONE_ID: milestone number
- MILESTONE_URL: milestone HTML URL

Use the GitHub MCP to create this milestone.
EOF
    then
        echo "✅ Created GitHub milestone #$MILESTONE_ID via GitHub MCP"
        echo "🔗 URL: $MILESTONE_URL"
        CREATE_WITH_CLI=false
    else
        echo "⚠️ GitHub MCP milestone creation failed, falling back to GitHub CLI"
        CREATE_WITH_CLI=true
    fi
else
    echo "⚠️ GitHub MCP not available, using GitHub CLI fallback"
    CREATE_WITH_CLI=true
fi

# Fallback to GitHub CLI if MCP failed or unavailable
if [[ "$CREATE_WITH_CLI" == "true" ]]; then
    echo "🔄 Creating milestone with GitHub CLI..."
    
    MILESTONE_RESPONSE=$(gh api repos/:owner/:repo/milestones \
        --method POST \
        --field title="$CLEAN_TITLE" \
        --field description="$CLEAN_DESCRIPTION" \
        --field due_on="${DUE_DATE}T23:59:59Z" \
        2>/dev/null)

    if [[ $? -eq 0 ]]; then
        MILESTONE_ID=$(echo "$MILESTONE_RESPONSE" | jq -r '.number')
        MILESTONE_URL=$(echo "$MILESTONE_RESPONSE" | jq -r '.html_url')
        
        echo "✅ Created GitHub milestone #$MILESTONE_ID via GitHub CLI"
        echo "🔗 URL: $MILESTONE_URL"
    else
        echo "❌ Error creating GitHub milestone with both GitHub MCP and CLI"
        echo "Check repository permissions and try again"
        exit 1
    fi
fi
    exit 1
fi
```

### Milestone Tracking via GitHub
```bash
# Milestone tracking now relies solely on GitHub milestones - no local files created
echo "✅ Milestone tracking: GitHub milestone #$MILESTONE_ID"
echo "🔗 Milestone URL: $MILESTONE_URL"
echo "📋 All milestone information stored in GitHub - no local files created"
echo "📊 Track progress via GitHub milestone page"
```

### Optional Task Creation
```bash
# Optionally create tasks as GitHub issues
if [[ "$AUTO_CREATE_TASKS" == "true" && -n "$TASK_BREAKDOWN" ]]; then
    echo "🔨 Auto-creating tasks as GitHub issues..."
    
    # Parse task breakdown and create issues
    TASK_COUNT=0
    while IFS= read -r task; do
        if [[ -n "$task" && "$task" != *"breakdown"* ]]; then
            # Clean up task title
            CLEAN_TASK=$(echo "$task" | sed 's/^[0-9]*\.\s*//' | sed 's/^-\s*//')
            
            if [[ -n "$CLEAN_TASK" ]]; then
                echo "  Creating task: $CLEAN_TASK"
                
                # Create task issue - prioritize GitHub MCP with CLI fallback
                if command -v claude &> /dev/null && claude mcp list 2>/dev/null | grep -q "github.*✓ Connected"; then
                    echo "    ✅ Using GitHub MCP for task creation"
                    
                    TASK_BODY="Task created as part of milestone: **$MILESTONE_TITLE**

This task was automatically generated through milestone decomposition.

**Parent Milestone**: [#$MILESTONE_ID]($MILESTONE_URL)
**Implementation Notes**: This task should be implemented as part of the larger milestone scope.

Use \`/do_task\` to implement this task when ready."

                    if claude << EOF
Please create a GitHub issue with these details:
- Title: "$CLEAN_TASK"
- Body: "$TASK_BODY"
- Milestone: #$MILESTONE_ID
- Labels: enhancement

Store the issue number in ISSUE_NUMBER environment variable.

Use the GitHub MCP to create this issue.
EOF
                    then
                        echo "    ✅ Task issue #$ISSUE_NUMBER created via GitHub MCP"
                        ISSUE_RESPONSE="created"
                    else
                        echo "    ⚠️ GitHub MCP task creation failed, falling back to GitHub CLI"
                        ISSUE_RESPONSE=$(gh issue create \
                            --title "$CLEAN_TASK" \
                            --body "Task created as part of milestone: **$MILESTONE_TITLE**

This task was automatically generated through milestone decomposition.

**Parent Milestone**: [#$MILESTONE_ID]($MILESTONE_URL)
**Implementation Notes**: This task should be implemented as part of the larger milestone scope.

Use \`/do_task\` to implement this task when ready." \
                            --milestone "$MILESTONE_ID" \
                            --label "enhancement" \
                            2>/dev/null)
                    fi
                else
                    echo "    ⚠️ GitHub MCP not available, using GitHub CLI for task creation"
                    ISSUE_RESPONSE=$(gh issue create \
                        --title "$CLEAN_TASK" \
                        --body "Task created as part of milestone: **$MILESTONE_TITLE**

This task was automatically generated through milestone decomposition.

**Parent Milestone**: [#$MILESTONE_ID]($MILESTONE_URL)
**Implementation Notes**: This task should be implemented as part of the larger milestone scope.

Use \`/do_task\` to implement this task when ready." \
                        --milestone "$MILESTONE_ID" \
                        --label "enhancement" \
                        2>/dev/null)
                fi
                
                if [[ $? -eq 0 ]]; then
                    ISSUE_NUMBER=$(echo "$ISSUE_RESPONSE" | jq -r '.number')
                    echo "    ✅ Created issue #$ISSUE_NUMBER: $CLEAN_TASK"
                    ((TASK_COUNT++))
                else
                    echo "    ❌ Failed to create issue for: $CLEAN_TASK"
                fi
            fi
        fi
    done <<< "$TASK_BREAKDOWN"
    
    echo "📊 Created $TASK_COUNT tasks for milestone #$MILESTONE_ID"
fi
```

### Success Summary
```bash
# Final summary and next steps
echo ""
echo "🎉 Milestone Creation Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Milestone: $MILESTONE_TITLE"
echo "🆔 GitHub ID: #$MILESTONE_ID"
echo "🔗 URL: $MILESTONE_URL"
echo "📅 Due Date: $DUE_DATE"
echo "📁 Tracking: $MILESTONE_FILE"
$(if [[ "$AUTO_CREATE_TASKS" == "true" && $TASK_COUNT -gt 0 ]]; then
    echo "✅ Created $TASK_COUNT constituent tasks"
fi)
echo ""
echo "📋 Next Steps:"
echo "• Use /create_task to add more specific tasks to this milestone"
echo "• Use /do_task {issue-number} to implement milestone tasks"
echo "• Track progress in the local milestone file"
echo "• Link PRs to this milestone for automatic progress tracking"
echo ""
echo "💡 Pro Tips:"
echo "• Existing issues can be linked to this milestone via GitHub interface"
echo "• Use GitHub milestone view to track overall progress"
echo "• Milestone will auto-close when all linked issues are completed"
```

## Error Handling

**No GitHub access:**
```
❌ Error: Not in a GitHub repository or no GitHub access
Run 'gh auth login' and ensure you're in a repository directory
```

**Invalid milestone title:**
```
❌ Error: Milestone title cannot be empty
Usage: /create_milestone "Your milestone title"
```

**Invalid characters in title:**
```
❌ Error: Invalid characters in milestone title
Milestone titles cannot contain: $ ` ; | & < > ! ~
```

**Title too long:**
```
❌ Error: Milestone title too long (max 200 characters)
```

**Milestone creation failed:**
```
❌ Error creating GitHub milestone
• Check repository permissions (need write access)
• Verify milestone title doesn't already exist
• Ensure GitHub CLI is properly authenticated
```

**MCP analysis failed:**
```
⚠️ Warning: AI analysis unavailable - proceeding with basic milestone
Creating milestone with user-provided title and standard description
```

## Success Criteria

- ✅ **Milestone Creation**: Creates real GitHub milestones with enhanced descriptions
- ✅ **Task Decomposition**: Intelligently breaks down complex epics into actionable tasks
- ✅ **GitHub Integration**: Properly integrates with GitHub milestones and issues
- ✅ **Local Tracking**: Creates comprehensive milestone tracking files
- ✅ **Workflow Integration**: Works with existing /create_task and /do_task commands
- ✅ **User Experience**: Provides clear feedback and next steps

## Integration with Existing Commands

**With /create_task:**
- Use `/create_task "task title" --milestone {milestone-id}` to add tasks to existing milestones
- Tasks created through decomposition can be implemented with `/do_task`

**With /create_pr:**
- PRs automatically link to milestones when implementing milestone tasks
- Milestone progress updates when issues are closed via PR merge

**With /pr_merge:**
- Milestone completion tracking when constituent tasks are completed
- Automatic milestone closure when all linked issues are resolved

The `/create_milestone` command provides intelligent epic-level planning while maintaining simplicity and integration with the existing workflow.