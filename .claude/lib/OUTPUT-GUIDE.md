# Output Formatting Guide

All slash commands should use consistent, informative output patterns.

## Required Elements

Every command MUST include:

### 1. Header (Start)
```
╭─────────────────────────────────────────────────────────────╮
│  /command_name
│  Brief description of what's happening
╰─────────────────────────────────────────────────────────────╯
```

### 2. Phase Progress
```
┌─ Phase Name (1/4)
│  → Current action...
│  ✓ Completed step
│  ○ Skipped step
│  ⚠ Warning message
└─ ✓ Phase complete (2.3s)
```

### 3. Statistics
Show counts for multi-item operations:
```
│  Files:    5 modified, 2 added
│  Tests:    12 passing, 0 failing
│  Issues:   3 linked
```

### 4. Completion Summary
```
───────────────────────────────────────────────────────────────
  ✓ /command completed in 45s

  Summary:
  • Created PR #42
  • Linked issues #10, #11
  • 5 files changed (+120, -45)
───────────────────────────────────────────────────────────────
```

## Usage

```bash
source .claude/lib/output-format.sh

# Start command
cmd_header "commit" "Creating intelligent commit"

# Start phase
phase_start "Analysis" "Analyzing staged changes..."
step "Reading 5 modified files"
step_done "Found 3 logical groups"
phase_done "Analysis" "Completed in 1.2s"

# Show stats
kv_table "Files" "5" "Commits" "2" "Lines" "+120 -45"

# Show result
result_box "Commit Created" \
  "feat(auth): add login validation" \
  "Refs: #42"

# End command
cmd_summary "success"
```

## Output Patterns by Command Type

### Creation Commands (/create_*, /commit)
- Show what will be created
- Show creation progress
- Show created resource with link

### Analysis Commands (/code_review, /debug, /health)
- Show what's being analyzed
- Show findings with severity
- Show recommendations

### Action Commands (/do_task, /pr_merge)
- Show multi-phase progress
- Show time per phase
- Show final state

### Query Commands (/stats, /who)
- Show query parameters
- Show results in table format
- Show totals

## Example: /commit Output

```
╭─────────────────────────────────────────────────────────────╮
│  /commit
│  Creating intelligent commit with GitHub integration
╰─────────────────────────────────────────────────────────────╯

┌─ Analysis (1/3)
│  → Checking staged changes...
│  ✓ 5 files staged
│  ✓ Detected scope: auth
│  ✓ Issue #42 linked from branch
└─ ✓ Analysis complete (0.8s)

┌─ Commit Type Detection (2/3)
│  → Analyzing change patterns...
│  ✓ Primary type: feat (new functionality)
│  ✓ Secondary: test (added tests)
│
│  Suggested: Split into 2 commits?
│    1. feat(auth): add login validation
│    2. test(auth): add login tests
│
│  → Proceeding with single commit
└─ ✓ Type detected (0.3s)

┌─ Commit Creation (3/3)
│  → Creating commit...
│  ✓ Pre-commit hooks passed
│  ✓ Commit created: abc1234
└─ ✓ Committed (1.1s)

╔═══════════════════════════════════════════════════════════════╗
║  ✓ Commit Created
║    feat(auth): add login validation
║
║    Files:  5 changed (+120, -45)
║    Refs:   #42
║    Hash:   abc1234
╚═══════════════════════════════════════════════════════════════╝

───────────────────────────────────────────────────────────────
  ✓ /commit completed in 2.2s
───────────────────────────────────────────────────────────────
```

## Checklist for Command Authors

- [ ] Uses `cmd_header` at start
- [ ] Shows phase progress with step counters
- [ ] Includes timing for each phase
- [ ] Shows operation counts (files, tests, etc.)
- [ ] Uses `result_box` for final output
- [ ] Uses `cmd_summary` at end with timing
- [ ] Handles errors with `error_box`
