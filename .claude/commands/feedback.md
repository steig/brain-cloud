---
category: ops
---

# /feedback - Rate AI Suggestions

You are helping the user provide feedback on AI suggestions to improve future recommendations.

## Purpose

Capture user feedback to:
- Improve AI suggestion accuracy over time
- Understand what patterns work for this user
- Build a personalized assistance model

## Usage

```
/feedback good       # Rate last suggestion as helpful
/feedback bad        # Rate last suggestion as unhelpful
/feedback            # Show recent suggestions and acceptance rates
```

## Execution Steps

### Step 1: Load Analytics

```bash
source .claude/lib/dx-db.sh
source .claude/lib/dx-instrumentation.sh
```

### Step 2: Handle Rating (if provided)

If user provided a rating argument:

```bash
RATING="$1"  # good, bad, or empty

case "$RATING" in
    good|+1|thumbsup)
        dx_rate_last 1
        echo "Thanks! Marked last suggestion as helpful."
        ;;
    bad|-1|thumbsdown)
        dx_rate_last -1
        echo "Noted. Marked last suggestion as unhelpful."
        ;;
    neutral|0)
        dx_rate_last 0
        echo "Marked last suggestion as neutral."
        ;;
esac
```

### Step 3: Show Feedback Dashboard

```bash
echo "=== AI SUGGESTION FEEDBACK ==="
echo ""

# Overall acceptance by type
echo "Acceptance Rates:"
dx_query "
    SELECT suggestion_type,
           COUNT(*) as total,
           SUM(accepted) as accepted,
           SUM(modified) as modified,
           SUM(CASE WHEN accepted=0 AND modified=0 THEN 1 ELSE 0 END) as rejected,
           ROUND(100.0 * SUM(accepted) / COUNT(*), 1) as accept_pct
    FROM feedback
    GROUP BY suggestion_type
    ORDER BY total DESC;
"

echo ""
echo "Explicit Ratings:"
dx_query "
    SELECT suggestion_type,
           SUM(CASE WHEN explicit_rating = 1 THEN 1 ELSE 0 END) as good,
           SUM(CASE WHEN explicit_rating = -1 THEN 1 ELSE 0 END) as bad,
           SUM(CASE WHEN explicit_rating = 0 THEN 1 ELSE 0 END) as neutral
    FROM feedback
    WHERE explicit_rating IS NOT NULL
    GROUP BY suggestion_type;
"
```

### Step 4: Show Recent Suggestions

```bash
echo ""
echo "Recent Suggestions:"
dx_query "
    SELECT suggestion_type,
           CASE WHEN accepted = 1 THEN 'accepted'
                WHEN modified = 1 THEN 'modified'
                ELSE 'rejected' END as status,
           substr(suggested_value, 1, 50) as suggestion,
           DATE(timestamp) as date
    FROM feedback
    ORDER BY timestamp DESC
    LIMIT 10;
"
```

### Step 5: Learning Insights

Analyze patterns and provide insights:

```bash
echo ""
echo "=== LEARNING INSIGHTS ==="

# Find common rejection patterns
REJECTIONS=$(dx_query "
    SELECT suggestion_type, COUNT(*) as count
    FROM feedback
    WHERE accepted = 0 AND modified = 0
    GROUP BY suggestion_type
    ORDER BY count DESC
    LIMIT 3;
" "csv" | tail -n +2)

if [[ -n "$REJECTIONS" ]]; then
    echo ""
    echo "Areas for improvement:"
    echo "$REJECTIONS" | while IFS=',' read type count; do
        echo "  - $type: $count rejections"
    done
fi

# Find modification patterns
echo ""
echo "Common modifications:"
dx_query "
    SELECT suggestion_type,
           COUNT(*) as times_modified
    FROM feedback
    WHERE modified = 1
    GROUP BY suggestion_type
    ORDER BY times_modified DESC
    LIMIT 5;
"
```

## Output Format

```
╔══════════════════════════════════════════════════════════════╗
║                    🎯 AI FEEDBACK                             ║
╚══════════════════════════════════════════════════════════════╝

📊 ACCEPTANCE RATES
───────────────────
  commit_msg:     78% accepted, 15% modified, 7% rejected
  pr_description: 85% accepted, 10% modified, 5% rejected
  code_change:    62% accepted, 28% modified, 10% rejected

👍 EXPLICIT RATINGS
───────────────────
  commit_msg:     45 good, 8 bad
  code_change:    23 good, 12 bad

📝 RECENT SUGGESTIONS
─────────────────────
  [commit_msg]    accepted   "feat: add user auth..." (today)
  [commit_msg]    modified   "fix: resolve bug..." (today)
  [pr_desc]       accepted   "Adds OAuth2 support..." (yesterday)

💡 INSIGHTS
───────────
- Your commit message acceptance is improving (78% → 82%)
- You often shorten AI-generated PR descriptions
- Consider running /patterns to see learned preferences
```

## Tips for Users

After using `/feedback`:
- Rate suggestions when they're particularly good or bad
- The system learns from your modifications automatically
- Use `/patterns` to see what the AI has learned about your preferences
- Run `/stats feedback` for detailed analytics

---

*Part of DX Framework v2.5.0 - Learning from Your Feedback*
