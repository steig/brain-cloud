---
category: ops
---

# /stats - DX Analytics Dashboard

You are showing the user analytics about their framework usage, AI feedback acceptance, learned patterns, and costs.

## Purpose

Data-driven insights answering:
- "How am I using the framework?"
- "Is the AI learning from my preferences?"
- "What are my productivity patterns?"
- "How much am I spending on tokens?"

## Prerequisites

Ensure the DX analytics database is initialized:

```bash
source .claude/lib/dx-db.sh
dx_init_db
```

## Execution Steps

### Step 1: Database Health Check

```bash
source .claude/lib/dx-db.sh
source .claude/lib/dx-metrics.sh

# Check database exists
if [[ ! -f "$DX_DB" ]]; then
    echo "Analytics database not initialized. Initializing now..."
    dx_init_db
fi

# Get counts
EVENTS=$(dx_query "SELECT COUNT(*) FROM events;" "line" | grep -oE '[0-9]+')
FEEDBACK=$(dx_query "SELECT COUNT(*) FROM feedback;" "line" | grep -oE '[0-9]+')
PATTERNS=$(dx_query "SELECT COUNT(*) FROM patterns;" "line" | grep -oE '[0-9]+')
CHECKPOINTS=$(dx_query "SELECT COUNT(*) FROM checkpoints;" "line" | grep -oE '[0-9]+')

echo "Database: $DX_DB"
echo "Records: $EVENTS events, $FEEDBACK feedback, $PATTERNS patterns, $CHECKPOINTS checkpoints"
```

### Step 2: Command Usage Statistics

```bash
echo ""
echo "=== COMMAND USAGE (Last 7 Days) ==="

dx_query "
    SELECT command,
           COUNT(*) as runs,
           SUM(CASE WHEN outcome='success' THEN 1 ELSE 0 END) as success,
           ROUND(100.0 * SUM(CASE WHEN outcome='success' THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate,
           ROUND(AVG(duration_ms)/1000.0, 2) as avg_seconds
    FROM events
    WHERE timestamp > datetime('now', '-7 days')
      AND outcome IS NOT NULL
    GROUP BY command
    ORDER BY runs DESC
    LIMIT 15;
"
```

### Step 3: Daily Activity Trends

```bash
echo ""
echo "=== DAILY ACTIVITY ==="

dx_query "
    SELECT DATE(timestamp) as date,
           COUNT(*) as commands,
           COUNT(DISTINCT session_id) as sessions,
           SUM(CASE WHEN outcome='success' THEN 1 ELSE 0 END) as successes,
           ROUND(SUM(duration_ms)/60000.0, 1) as total_minutes
    FROM events
    WHERE timestamp > datetime('now', '-14 days')
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
    LIMIT 14;
"
```

### Step 4: AI Feedback Analysis

```bash
echo ""
echo "=== AI SUGGESTION ACCEPTANCE ==="

# Overall acceptance by type
dx_query "
    SELECT suggestion_type,
           COUNT(*) as total,
           SUM(accepted) as accepted,
           SUM(modified) as modified,
           ROUND(100.0 * SUM(accepted) / COUNT(*), 1) as accept_rate
    FROM feedback
    GROUP BY suggestion_type
    ORDER BY total DESC;
"

echo ""
echo "Recent rejections/modifications:"
dx_query "
    SELECT suggestion_type,
           substr(suggested_value, 1, 40) as suggested,
           substr(actual_value, 1, 40) as actual,
           DATE(timestamp) as date
    FROM feedback
    WHERE accepted = 0
    ORDER BY timestamp DESC
    LIMIT 5;
"
```

### Step 5: Learned Patterns

```bash
echo ""
echo "=== LEARNED PATTERNS ==="

echo "Command sequences (what you do after what):"
dx_query "
    SELECT pattern_key as after_command,
           pattern_value as you_usually_do,
           occurrences as times,
           ROUND(confidence * 100, 0) as confidence_pct
    FROM patterns
    WHERE pattern_type = 'sequence'
      AND confidence > 0.3
    ORDER BY occurrences DESC
    LIMIT 10;
"

echo ""
echo "Preferences:"
dx_query "
    SELECT pattern_key as preference,
           pattern_value as value,
           occurrences as times
    FROM patterns
    WHERE pattern_type = 'preference'
    ORDER BY occurrences DESC
    LIMIT 10;
"
```

### Step 6: Time of Day Analysis

```bash
echo ""
echo "=== ACTIVITY BY HOUR ==="

dx_query "
    SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour,
           COUNT(*) as commands,
           COUNT(DISTINCT DATE(timestamp)) as active_days,
           ROUND(1.0 * COUNT(*) / COUNT(DISTINCT DATE(timestamp)), 1) as avg_per_day
    FROM events
    WHERE timestamp > datetime('now', '-30 days')
    GROUP BY hour
    ORDER BY hour;
"
```

### Step 7: Cost Tracking

```bash
echo ""
echo "=== TOKEN & COST SUMMARY ==="

# Check if we have cost data
HAS_COSTS=$(dx_query "SELECT COUNT(*) FROM cost_tracking;" "line" | grep -oE '[0-9]+')

if [[ "$HAS_COSTS" -gt 0 ]]; then
    echo "By model (last 30 days):"
    dx_query "
        SELECT model,
               SUM(tokens_in) as input_tokens,
               SUM(tokens_out) as output_tokens,
               ROUND(SUM(estimated_cost_usd), 4) as est_cost_usd,
               SUM(command_count) as commands
        FROM cost_tracking
        WHERE date > DATE('now', '-30 days')
        GROUP BY model
        ORDER BY est_cost_usd DESC;
    "

    echo ""
    echo "Daily costs (last 7 days):"
    dx_query "
        SELECT date,
               SUM(tokens_in + tokens_out) as total_tokens,
               ROUND(SUM(estimated_cost_usd), 4) as cost_usd
        FROM cost_tracking
        WHERE date > DATE('now', '-7 days')
        GROUP BY date
        ORDER BY date DESC;
    "
else
    echo "(No cost data recorded yet. Token tracking will populate this over time.)"
fi
```

### Step 8: Session Summary

```bash
echo ""
echo "=== CURRENT SESSION ==="

dx_query "
    SELECT command,
           outcome,
           ROUND(duration_ms/1000.0, 2) as seconds,
           strftime('%H:%M:%S', timestamp) as time
    FROM events
    WHERE session_id = '$DX_SESSION_ID'
    ORDER BY timestamp;
"
```

### Step 9: Error Analysis

```bash
echo ""
echo "=== ERROR PATTERNS (Last 7 Days) ==="

dx_query "
    SELECT command,
           COUNT(*) as failures,
           substr(GROUP_CONCAT(DISTINCT error_message), 1, 60) as errors
    FROM events
    WHERE outcome = 'failure'
      AND timestamp > datetime('now', '-7 days')
    GROUP BY command
    ORDER BY failures DESC
    LIMIT 5;
"
```

### Step 10: Checkpoints History

```bash
echo ""
echo "=== RECENT CHECKPOINTS ==="

dx_query "
    SELECT checkpoint_name,
           checkpoint_type,
           branch,
           strftime('%Y-%m-%d %H:%M', timestamp) as created
    FROM checkpoints
    ORDER BY timestamp DESC
    LIMIT 10;
"
```

## Output Format

Present as a clean analytics dashboard:

```
╔══════════════════════════════════════════════════════════════╗
║                    📊 DX ANALYTICS                            ║
╚══════════════════════════════════════════════════════════════╝

📈 USAGE SUMMARY (Last 7 Days)
──────────────────────────────
Total commands: 156
Sessions: 12
Success rate: 94.2%
Total time: 4.2 hours

🎯 TOP COMMANDS
────────────────
  commit       45 runs  97.8% success  2.3s avg
  do_task      28 runs  92.9% success  45.2s avg
  create_pr    15 runs  100% success   8.1s avg
  code_review  12 runs  91.7% success  12.4s avg

🤖 AI ACCEPTANCE
─────────────────
  commit_msg:    78% accepted, 15% modified
  pr_desc:       85% accepted, 10% modified
  code_change:   62% accepted, 28% modified

The AI is learning! Acceptance up 12% from last week.

🔗 LEARNED SEQUENCES
────────────────────
After /commit → you usually run /create_pr (87%)
After /do_task → you usually run /commit (92%)
After /create_pr → you usually run /code_review (65%)

⏰ PEAK HOURS
─────────────
Most active: 10am-12pm, 2pm-4pm
Least active: Before 9am, After 6pm

💰 COSTS (Last 30 Days)
───────────────────────
  sonnet:  124,532 tokens  $0.52
  haiku:    45,120 tokens  $0.03
  opus:     12,450 tokens  $0.89
  ─────────────────────────────
  Total:   182,102 tokens  $1.44

📍 CHECKPOINTS
──────────────
  pre_release_auto (2 hours ago)
  morning_pickup (today 9:15am)
  pre_merge_auto (yesterday)
```

## Flags

```
/stats                # Full dashboard
/stats commands       # Just command usage
/stats feedback       # Just AI feedback analysis
/stats patterns       # Just learned patterns
/stats costs          # Just token/cost tracking
/stats session        # Just current session
/stats errors         # Just error analysis
/stats [days]         # Specify time range (e.g., /stats 30)
```

## Insights Engine

After presenting raw data, provide insights:

```
💡 INSIGHTS
────────────

1. Your /commit success rate dropped from 98% to 94% this week.
   → Most failures are "pre-commit hook failed" - consider /tdd

2. You modify 38% of AI commit messages.
   → Common pattern: You prefer shorter messages
   → AI is adjusting...

3. Peak productivity: Tuesday and Thursday mornings
   → Consider scheduling deep work during these times

4. Cost optimization: 60% of tokens go to /do_task
   → Consider using haiku for exploration phases
```

## Data Retention

The database automatically retains:
- Events: 90 days (configurable)
- Feedback: 90 days
- Patterns: Indefinite (aggregated data)
- Checkpoints: Manual ones indefinite, auto ones 30 days

Run cleanup with:
```bash
.claude/lib/dx-metrics.sh cleanup [days]
```

---

*Part of DX Framework v2.5.0 - Data-Driven Development*
