---
category: collaboration
---

# /handoff - Cross-Project Context Handoff

Pass context, decisions, or work to another agent in a different project.

## Usage

```bash
/handoff "project-name" "context message"     # Send context to another project
/handoff --list                               # Show pending handoffs for this project
/handoff --claim ID                           # Mark a handoff as received
```

## Examples

```bash
# From nixos-config, hand off to brain project
/handoff brain "Added brain_recall to /do_task - you'll need to add the recall endpoint"

# From api project, hand off to frontend
/handoff frontend "API endpoint /users/profile is ready - returns {name, email, avatar}"

# Check what's been handed off to this project
/handoff --list

# After receiving, mark it claimed
/handoff --claim abc123
```

## How It Works

### Sending a Handoff

When you run `/handoff {project} "{message}"`:

```
brain_thought(
  content="HANDOFF to {project}: {message}",
  type="todo",
  tags=["handoff", "handoff-to:{project}", "handoff-from:{current_project}", "pending"]
)
```

**Display:**
```
📤 HANDOFF SENT
══════════════

To: {project}
From: {current_project}
ID: {short_id}

Message:
{message}

Context included:
• Current branch: {branch}
• Recent commits: {last 3 commits}
• Key files changed: {files}

The receiving project can retrieve this with:
  /handoff --list
  brain_recall(query="handoff-to:{project}")
```

### Receiving Handoffs

When you run `/handoff --list` in a project:

```
brain_search(query="handoff-to:{current_project} pending", limit=10)
```

**Display:**
```
📥 PENDING HANDOFFS
═══════════════════

1. [abc123] From: nixos-config (2 hours ago)
   "Added brain_recall to /do_task - you'll need to add the recall endpoint"

2. [def456] From: api (yesterday)
   "New auth middleware ready - frontend needs to send Bearer token"

Run `/handoff --claim {id}` after addressing each handoff.
```

### Claiming a Handoff

When you run `/handoff --claim {id}`:

```
# Update the original thought to mark it claimed
brain_thought(
  content="HANDOFF CLAIMED: {original_message}",
  type="note",
  tags=["handoff", "handoff-to:{project}", "claimed", "claimed-by:{current_project}"]
)
```

**Display:**
```
✅ HANDOFF CLAIMED
══════════════════

ID: {id}
From: {source_project}
Message: {message}

Marked as claimed. The sending project will see this was received.
```

## Implementation

### Sending

```bash
# Get current project context
CURRENT_PROJECT=$(basename $(git rev-parse --show-toplevel))
CURRENT_BRANCH=$(git branch --show-current)
RECENT_COMMITS=$(git log --oneline -3)
CHANGED_FILES=$(git diff --name-only HEAD~3 2>/dev/null | head -10)

# Generate short ID
HANDOFF_ID=$(date +%s | sha256sum | head -c 8)

# Store in brain
brain_thought(
  content="HANDOFF [$HANDOFF_ID] to $TARGET_PROJECT: $MESSAGE

Context from $CURRENT_PROJECT:
- Branch: $CURRENT_BRANCH
- Recent commits:
$RECENT_COMMITS
- Changed files:
$CHANGED_FILES",
  type="todo",
  tags=["handoff", "handoff-to:$TARGET_PROJECT", "handoff-from:$CURRENT_PROJECT", "handoff-id:$HANDOFF_ID", "pending"]
)
```

### Receiving

```bash
CURRENT_PROJECT=$(basename $(git rev-parse --show-toplevel))

# Search for handoffs to this project
brain_search(query="handoff-to:$CURRENT_PROJECT pending", limit=10)

# Display results formatted as pending handoffs
```

### Claiming

```bash
# Find the original handoff by ID
brain_search(query="handoff-id:$HANDOFF_ID")

# Create a claim record
brain_thought(
  content="CLAIMED handoff $HANDOFF_ID from $SOURCE_PROJECT",
  type="note",
  tags=["handoff-claimed", "handoff-id:$HANDOFF_ID", "claimed-by:$CURRENT_PROJECT"]
)
```

## Rich Handoff Types

### Code Handoff
```bash
/handoff frontend "API ready" --include-diff
```
Includes the actual git diff in the handoff.

### Decision Handoff
```bash
/handoff brain "Need to decide: REST vs GraphQL for new endpoints" --type decision
```
Creates a brain_decide placeholder for the receiving project.

### Blocker Handoff
```bash
/handoff api "Blocked: need auth token format before I can continue" --type blocker
```
Marked as urgent, shows in receiving project's blockers.

## Integration with /pickup

The `/pickup` command (morning context restoration) automatically checks for handoffs:

```
/pickup

📋 MORNING CONTEXT
══════════════════

Recent Brain Activity:
• ...

📥 PENDING HANDOFFS (2):
• From nixos-config: "Added brain_recall..."
• From api: "New endpoint ready..."

Run `/handoff --list` for details.
```

## Cross-Machine Support

Handoffs work across machines because they're stored in brain-api:
- Work on laptop, handoff to yourself for desktop
- Handoff between dev VM and local machine
- Team handoffs (if sharing brain instance)

## Success Criteria

- ✅ Send context from one project to another
- ✅ Include git context (branch, commits, files)
- ✅ Searchable by receiving project
- ✅ Claimable to track what's been addressed
- ✅ Integrates with /pickup for morning context
- ✅ Works across machines via brain-api
