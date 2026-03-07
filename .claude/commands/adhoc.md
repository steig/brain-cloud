---
category: adhoc
---

You are helping the user track ad-hoc requests that interrupt planned sprint work.

## Usage

```
/adhoc "Fix urgent customer issue"           # Track in current repo
/adhoc "CEO wants demo" --central            # Track in centralized repo (ADHOC_REPO)
```

## Configuration

```bash
# Optional: Set centralized adhoc repository
export ADHOC_REPO="your-org/adhoc-requests"
export ADHOC_ORG="your-org"
export ADHOC_PROJECT_NUMBER="10"
```

## Workflow: Capture, Assess, Track

### 1. Analyze Request
- Assess urgency (high/medium/low) from keywords
- Estimate story points (1-8) from complexity
- Detect source project from current repo

### 2. Create GitHub Issue

```bash
# Determine target repository
if [[ "$1" == "--central" && -n "$ADHOC_REPO" ]]; then
    REPO_FLAG="--repo $ADHOC_REPO"
fi

# Create issue with adhoc label
gh issue create $REPO_FLAG \
    --title "🚨 [ADHOC] $DESCRIPTION" \
    --body "$ISSUE_BODY" \
    --label "adhoc,points/$STORY_POINTS" \
    --assignee "@me"
```

### 3. Output

```
🚨 Ad-hoc Request Tracked
📋 Issue: #123 - [ADHOC] Fix urgent customer issue
🏷️ Labels: adhoc, points/3
🚨 Urgency: high
📊 Story Points: 3

📈 Sprint Impact:
  • Interrupts planned sprint work
  • Time tracked separately from velocity
  • Included in retrospective

🔄 Next Steps:
  1. Assess priority against sprint commitments
  2. Use '/do_task 123' to implement
```

## Urgency Detection

| Keywords | Urgency |
|----------|---------|
| critical, urgent, production, down, customer, revenue | high |
| quick, simple, minor, cosmetic | low |
| (default) | medium |

## Story Points Estimation

| Pattern | Points Added |
|---------|--------------|
| fix, update, change | +1 |
| new, create, build | +2 |
| integration, system, database | +2 |
| urgent, asap | +1 |

Total mapped to Fibonacci: 1, 2, 3, 5, 8 (capped)

## Sprint Integration

Ad-hoc requests tracked this way provide:
- **Velocity separation**: Planned vs unplanned work
- **Pattern recognition**: Common interruption sources
- **Capacity planning**: Reserve time for expected adhoc
- **Stakeholder education**: Show true cost of interruptions

## Retrospective Report

```bash
# List all adhoc issues
gh issue list --label "adhoc" --state all --json number,title,createdAt,closedAt
```
