---
category: automation
---

# /yolo - Autonomous Milestone Runner

You are helping the user autonomously work through all issues in a GitHub milestone. This command implements a "naive persistence" loop that keeps working until the milestone is complete or safeguards trigger.

## Tiered Model Selection for Cost Efficiency

**CRITICAL:** Use tiered models to reduce costs by ~60-80% during autonomous runs:

| Phase | Model | Rationale |
|-------|-------|-----------|
| Planning/Analysis | Sonnet (default) | Complex reasoning, architecture |
| Issue Exploration | Haiku | File analysis, dependency mapping |
| Implementation | Haiku | Bulk of tokens, writing code |
| Testing | Haiku | Running tests, validation |
| PR Creation | Sonnet | Good writing for descriptions |
| Decision Making | Sonnet | Non-trivial choices |

**When spawning Task agents:**
```
# For exploration (Haiku - fast, cheap)
Task(subagent_type="Explore", model="haiku", prompt="Analyze issue #...")

# For implementation (Haiku - bulk work)
Task(subagent_type="general-purpose", model="haiku", prompt="Implement...")

# For PR creation (Sonnet - quality writing)
Task(subagent_type="general-purpose", prompt="Create PR for...")  # default Sonnet
```

Most tokens in a /yolo run are implementation work - using Haiku here dramatically reduces cost.

## Usage

```bash
/yolo 5                      # Work through milestone #5
/yolo 5 --checkpoint 5       # Pause for approval every 5 issues (default: 3)
/yolo 5 --dry-run            # Show what would be done without executing
/yolo resume                 # Resume a paused session
/yolo status                 # Show current progress
/yolo stop                   # Stop and archive current session
/yolo issues                 # Show detailed issue list
/yolo retry 42               # Retry a failed issue
```

## Philosophy: Naive Persistence + Parallel Execution

> "Progress lives in files and git, not in context."
> "Sequential is slow; parallel is fast."

The yolo loop keeps working through issues until:
1. All issues are completed
2. A checkpoint is reached (user approval needed)
3. Too many consecutive failures (ask for help)
4. User explicitly stops

Each issue is worked using the existing `/do_task` → `/commit` → `/create_pr` workflow.

## Multi-Agent Strategy

YOLO uses parallel agents aggressively to maximize throughput:

### Phase 1: Parallel Analysis (Before Loop)

When starting, spawn multiple Explore agents simultaneously:

```
[Task: Explore agent] Analyze issue #41 - dependencies, affected files, complexity
[Task: Explore agent] Analyze issue #42 - dependencies, affected files, complexity
[Task: Explore agent] Analyze issue #43 - dependencies, affected files, complexity
```

This produces:
- Dependency graph (which issues block others)
- Complexity estimates
- Parallel-safe groups (issues that can be worked simultaneously)

### Phase 2: Parallel Implementation

For independent issues (no shared files/dependencies), work in parallel:

```
[Task: Implement] Issue #41 on branch issue-41-feature (background)
[Task: Implement] Issue #42 on branch issue-42-feature (background)
[Task: Implement] Issue #43 on branch issue-43-feature (background)
```

Each agent:
1. Creates its own branch from main
2. Implements the issue
3. Commits and creates PR
4. Reports back when done

### Phase 3: Pipeline Overlap

Even for dependent issues, overlap phases:

```
Issue #41: [====IMPLEMENT====][COMMIT][PR]
Issue #42:        [==EXPLORE==][====IMPLEMENT====][COMMIT][PR]
Issue #43:               [==EXPLORE==][====IMPLEMENT====][COMMIT][PR]
```

While #41 is being committed, #42's exploration is already done.

### Agent Spawning Rules

| Scenario | Action |
|----------|--------|
| 3+ pending independent issues | Spawn parallel implement agents |
| Next issue while current builds | Spawn background explore agent |
| Issue analysis needed | Spawn explore agents for all pending |
| Long-running test suite | Continue with next issue exploration |

### Example Multi-Agent Flow

```
🚀 Starting yolo for milestone #5 (5 issues)

📊 Phase 1: Parallel Analysis
   [Spawning 5 Explore agents in parallel...]
   ✓ #41: Simple, no deps, touches auth/
   ✓ #42: Simple, no deps, touches api/
   ✓ #43: Medium, depends on #41, touches auth/
   ✓ #44: Simple, no deps, touches ui/
   ✓ #45: Complex, depends on #43

📊 Dependency Graph:
   #41 ──→ #43 ──→ #45
   #42 (independent)
   #44 (independent)

🔀 Phase 2: Parallel Group 1
   [Spawning 3 implement agents...]
   → Agent A: #41 (auth feature)
   → Agent B: #42 (api endpoint)
   → Agent C: #44 (ui component)

   ✓ #42 complete (PR #50) - Agent B done
   ✓ #44 complete (PR #51) - Agent C done
   ✓ #41 complete (PR #52) - Agent A done

🔀 Phase 3: Sequential (has deps)
   → #43 (depends on #41, now unblocked)
   ✓ #43 complete (PR #53)

   → #45 (depends on #43, now unblocked)
   ✓ #45 complete (PR #54)

🎉 All 5 issues complete in 2 parallel batches!
```

## Safeguards

| Trigger | Action |
|---------|--------|
| Checkpoint reached (every N issues) | Pause, show summary, wait for `/yolo resume` |
| 3 consecutive failures | Pause, ask for help |
| Issue blocked/not ready | Skip, continue to next |
| Max issues reached (20) | Stop gracefully |
| Build/test failure | Log to "What Didn't Work", count as failure |

## Workflow

### 1. Initialize Session

```bash
# Load yolo library
source .claude/lib/yolo-loop.sh

# Parse arguments
MILESTONE="$1"
CHECKPOINT_EVERY=3
DRY_RUN=false

# Handle subcommands
case "$MILESTONE" in
  resume)
    yolo_resume
    # Continue to main loop
    ;;
  status)
    yolo_show_status
    exit 0
    ;;
  stop)
    yolo_stop
    exit 0
    ;;
  issues)
    yolo_show_issues
    exit 0
    ;;
  retry)
    yolo_retry_issue "$2"
    exit 0
    ;;
  *)
    # Initialize new session
    yolo_init "$MILESTONE" "$CHECKPOINT_EVERY"
    ;;
esac
```

### 2. Main Loop

For each issue in the milestone:

```
┌─────────────────────────────────────────────────────────┐
│  1. PICK NEXT ISSUE                                     │
│     - yolo_next_issue                                   │
│     - Check work log for "What Didn't Work"             │
│     - Skip if blocked                                   │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  2. IMPLEMENT                                           │
│     - git checkout main && git pull                     │
│     - /do_task {issue_number}                           │
│     - Work log tracks progress and failures             │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  3. SHIP                                                │
│     - /commit (conventional commit)                     │
│     - /create_pr (linked to issue)                      │
│     - yolo_mark_done {issue} {pr}                       │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  4. EVALUATE                                            │
│     - yolo_check_safeguards                             │
│     - "continue" → loop back to step 1                  │
│     - "checkpoint" → pause, show summary                │
│     - "pause" → too many failures, ask for help         │
│     - "done" → celebrate, archive session               │
└─────────────────────────────────────────────────────────┘
```

## Implementation

When the user runs `/yolo {milestone}`, execute this autonomous loop with parallel agents:

### Step 0: Parallel Issue Analysis + Brain Context

Before the main loop, analyze all issues AND query brain for relevant history and cost baselines:

```
# 🧠 BRAIN CONTEXT - Get milestone-level context first
brain_recall(query="{milestone_title}", limit=15, include_details=true)
brain_summarize(period="this month", project="{current_project}")
brain_cost_per_outcome(period="last 30 days")
brain_decision_accuracy(period="last 30 days")

# Display brain context for the milestone:
echo "🧠 BRAIN CONTEXT FOR MILESTONE"
echo "════════════════════════════════"
# - Past decisions relevant to this milestone's theme
# - Recent work in related areas
# - Known blockers or issues

# Spawn Explore agents for ALL pending issues simultaneously
for each issue in milestone:
    spawn Task(Explore, background=true):
        "Analyze issue #{issue.number}: {issue.title}

         FIRST: Query brain for this specific issue:
         brain_recall(query='{issue.title}', limit=5)

         Then determine:
         1. Files likely to be modified
         2. Dependencies on other issues (shared files, feature deps)
         3. Complexity estimate (simple/medium/complex)
         4. Required context (what to read first)
         5. 🧠 Brain context: Past decisions/work in this area

         Return JSON: {
           files: [],
           depends_on: [],
           complexity: '',
           context: [],
           brain_context: {decisions: [], related_work: []}
         }"

# Wait for all analysis agents
analysis_results = await all agents

# Build dependency graph
independent_issues = issues with no dependencies
dependent_chains = topological sort of dependent issues
```

### Step 0.5: Parallel Implementation (when possible)

```
# If 2+ independent issues exist, work in parallel
if len(independent_issues) >= 2:
    for issue in independent_issues[:3]:  # Max 3 parallel
        spawn Task(general-purpose, background=true):
            "Implement issue #{issue.number}: {issue.title}

             1. git checkout -b issue-{issue.number}-{slug} main
             2. Implement the feature/fix
             3. Run tests
             4. git add && git commit (conventional)
             5. gh pr create --title '...' --body '...'
             6. Return: {success: bool, pr_number: int, error: string}"

    # Continue to next batch when agents complete
```

### Step 1: Initialize or Resume

```bash
source .claude/lib/yolo-loop.sh
source .claude/lib/work-log-utils.sh

# Check for active session
if yolo_is_active; then
    echo "📋 Resuming active yolo session..."
    yolo_show_status
else
    # Initialize new session
    echo "🚀 Starting yolo for milestone #$MILESTONE..."
    yolo_init "$MILESTONE" "$CHECKPOINT_EVERY"
fi
```

### Step 2: The Loop

```python
# Pseudocode for the main loop
while True:
    # Check safeguards first
    action = yolo_check_safeguards()

    if action == "done":
        yolo_complete()
        print("🎉 All issues complete!")
        break

    if action == "checkpoint":
        yolo_pause("Checkpoint reached")
        show_checkpoint_summary()
        print("⏸️ Checkpoint! Review progress and run `/yolo resume` to continue")
        break

    if action == "pause":
        yolo_pause("Too many consecutive failures")
        print("⚠️ Paused due to failures. Review and run `/yolo resume`")
        break

    # Get next issue
    issue = yolo_next_issue()
    if not issue:
        yolo_complete()
        break

    # Switch to main branch
    run("git checkout main && git pull")

    # Check work log for prior failed approaches
    if work_log_exists(issue):
        print(f"📋 Found existing work log for #{issue}")
        show_what_didnt_work(issue)

    # Implement the issue
    try:
        run(f"/do_task {issue}")
        run("/commit")
        pr_number = run("/create_pr")
        yolo_mark_done(issue, pr_number)
    except Exception as e:
        yolo_mark_failed(issue, str(e))
        add_failed_approach(issue, str(e))
```

### Step 3: Issue Implementation

For each issue, follow the standard workflow:

1. **Create feature branch**: `git checkout -b issue-{N}-{slug}`
2. **Load work log**: Check for existing context and "What Didn't Work"
3. **🧠 Brain recall**: Query for issue-specific context (done automatically by /do_task)
4. **Run /do_task**: Explore → Plan → Code → Test → Write-up
5. **Run /commit**: Create conventional commit
6. **Run /create_pr**: Create PR linked to issue
7. **🧠 Brain log**: Log completion thought with key decisions made
8. **Update yolo state**: Mark issue as complete with PR number

**Brain logging on completion:**
```
brain_thought(
  content="Completed #{issue}: {title}. Key changes: {summary}",
  type="note",
  tags=["task-complete", "{project}", "yolo"]
)

# If significant decisions were made during implementation:
brain_decide(
  title="Implementation approach for #{issue}",
  context="During yolo implementation of {title}",
  options=[...],
  chosen="...",
  rationale="..."
)

# Score the session after each issue
brain_score_session()

# Track cost per issue for milestone-level ROI
brain_cost_per_outcome(period="today")
```

### Step 4: Handle Failures

When an issue fails:

```bash
# Mark the failure in yolo state
yolo_mark_failed "$ISSUE_NUMBER" "Build failed: missing dependency X"

# Add to work log's "What Didn't Work" section
source .claude/lib/work-log-utils.sh
add_failed_approach "$ISSUE_NUMBER" "Attempted approach X, failed due to Y"

# Check if we should pause
action=$(yolo_check_safeguards)
if [[ "$action" == "pause" ]]; then
    echo "⚠️ Too many consecutive failures. Pausing for review."
    yolo_pause "3 consecutive failures"
fi
```

### Step 5: Checkpoints

When a checkpoint is reached:

```bash
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ⏸️  CHECKPOINT REACHED"
echo "═══════════════════════════════════════════════════════"
echo ""
yolo_show_status
echo ""
echo "  Completed PRs:"
# List completed issues with their PR links
echo ""
echo "  Run '/yolo resume' to continue"
echo "  Run '/yolo stop' to end session"
echo "═══════════════════════════════════════════════════════"
```

## State Management

All state is persisted in `.ai/work/yolo/active.json`:

```json
{
  "milestone": 5,
  "started": "2025-01-22T10:00:00Z",
  "status": "running",
  "checkpointEvery": 3,
  "currentIssue": 42,
  "issues": [
    {"number": 41, "title": "Add login", "status": "completed", "pr": 50},
    {"number": 42, "title": "Add logout", "status": "in_progress", "pr": null},
    {"number": 43, "title": "Add profile", "status": "pending", "pr": null}
  ],
  "safeguards": {
    "maxIssues": 20,
    "consecutiveFailures": 0,
    "maxConsecutiveFailures": 3,
    "issuesSinceCheckpoint": 1,
    "totalCompleted": 1,
    "totalFailed": 0
  }
}
```

## Integration with Existing Commands

Yolo orchestrates these existing commands:

| Command | Purpose in Yolo |
|---------|-----------------|
| `/do_task {N}` | Implement the issue (Explore → Plan → Code → Test) |
| `/commit` | Create conventional commit for the changes |
| `/create_pr` | Create PR linked to the issue |
| Work Log | Track progress, decisions, and "What Didn't Work" |

## Error Handling

**Issue implementation fails:**
```
❌ Issue #42 failed: Tests not passing
   → Logged to work log's "What Didn't Work"
   → Consecutive failures: 1/3
   → Moving to next issue...
```

**Build fails:**
```
❌ Issue #43 failed: Build error in src/auth.ts
   → Attempting auto-fix...
   → If fix fails: mark failed, continue
```

**PR creation fails:**
```
❌ PR creation failed for issue #44
   → Code is committed on branch issue-44-feature
   → Manual PR creation needed
   → Marking as failed, continuing...
```

## Dry Run Mode

With `--dry-run`, show the plan without executing:

```
🔍 DRY RUN: Milestone #5

Would process 5 issues:
  1. #41 - Add user authentication
  2. #42 - Add password reset
  3. #43 - Add OAuth support
  4. #44 - Add admin dashboard
  5. #45 - Add audit logging

Checkpoints at: issues 3, 6, 9...
Max issues: 20

Run without --dry-run to execute.
```

## Success Criteria

- ✅ All milestone issues implemented and PRs created
- ✅ Safeguards prevent runaway execution
- ✅ State persists across sessions (can resume)
- ✅ "What Didn't Work" prevents retry loops
- ✅ Clear progress visibility via `/yolo status`

## Example Session

```
$ /yolo 5

🚀 Starting yolo for milestone #5...
✅ Initialized with 5 issues
   Checkpoint every: 3 issues

═══════════════════════════════════════════
  🚀 YOLO STATUS: Milestone #5
═══════════════════════════════════════════
  ✅ Completed:   0
  🔄 In Progress: 0
  ⏳ Pending:     5
═══════════════════════════════════════════

🔄 Starting issue #41: Add user authentication
   → Running /do_task 41...
   → Running /commit...
   → Running /create_pr...
✅ Issue #41 complete (PR #50)

🔄 Starting issue #42: Add password reset
   → Running /do_task 42...
   → Running /commit...
   → Running /create_pr...
✅ Issue #42 complete (PR #51)

🔄 Starting issue #43: Add OAuth support
   → Running /do_task 43...
   → Running /commit...
   → Running /create_pr...
✅ Issue #43 complete (PR #52)

═══════════════════════════════════════════
  ⏸️  CHECKPOINT REACHED
═══════════════════════════════════════════
  Completed: 3 issues
  PRs: #50, #51, #52

  Run '/yolo resume' to continue
═══════════════════════════════════════════
```
