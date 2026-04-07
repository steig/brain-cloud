---
category: ops
---

# /deploy-risk - Pre-Deploy Risk Assessment

You are helping the user assess deployment risk before releasing changes.

## Purpose

Safe deployments:
- Calculate risk score based on multiple factors
- Identify potential issues before they hit production
- Recommend mitigation strategies
- Suggest optimal deployment timing

## Usage

```
/deploy-risk              # Analyze current branch vs main
/deploy-risk <branch>     # Analyze specific branch
/deploy-risk --verbose    # Detailed breakdown
```

## Execution Steps

### Step 1: Initialize Assessment

```bash
source .claude/lib/dx-db.sh

TARGET_BRANCH="${1:-$(git branch --show-current)}"
BASE_BRANCH="${2:-main}"

echo "=== DEPLOY RISK ASSESSMENT ==="
echo "Analyzing: $TARGET_BRANCH → $BASE_BRANCH"
echo ""

# Initialize score (0-100, higher = riskier)
RISK_SCORE=0
RISK_FACTORS=()
```

### Step 2: Analyze Change Size

```bash
echo "📏 Change Size Analysis..."

# Lines changed
STATS=$(git diff --stat "$BASE_BRANCH"..."$TARGET_BRANCH" 2>/dev/null | tail -1)
INSERTIONS=$(echo "$STATS" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DELETIONS=$(echo "$STATS" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
TOTAL_LINES=$((INSERTIONS + DELETIONS))

# Files changed
FILES_CHANGED=$(git diff --name-only "$BASE_BRANCH"..."$TARGET_BRANCH" 2>/dev/null | wc -l | tr -d ' ')

echo "  Lines: +$INSERTIONS -$DELETIONS ($TOTAL_LINES total)"
echo "  Files: $FILES_CHANGED"

if [[ $TOTAL_LINES -gt 1000 ]]; then
    RISK_SCORE=$((RISK_SCORE + 30))
    RISK_FACTORS+=("Large changeset: $TOTAL_LINES lines")
elif [[ $TOTAL_LINES -gt 500 ]]; then
    RISK_SCORE=$((RISK_SCORE + 20))
    RISK_FACTORS+=("Medium changeset: $TOTAL_LINES lines")
elif [[ $TOTAL_LINES -gt 200 ]]; then
    RISK_SCORE=$((RISK_SCORE + 10))
    RISK_FACTORS+=("Moderate changeset: $TOTAL_LINES lines")
fi
```

### Step 3: Analyze File Types

```bash
echo ""
echo "📁 Critical File Analysis..."

CHANGED_FILES=$(git diff --name-only "$BASE_BRANCH"..."$TARGET_BRANCH" 2>/dev/null)

# Check for migrations
if echo "$CHANGED_FILES" | grep -qiE 'migration|migrate'; then
    RISK_SCORE=$((RISK_SCORE + 25))
    RISK_FACTORS+=("Database migration detected")
    echo "  ⚠️ Database migration detected"
fi

# Check for config changes
if echo "$CHANGED_FILES" | grep -qiE 'config|\.env|settings'; then
    RISK_SCORE=$((RISK_SCORE + 15))
    RISK_FACTORS+=("Configuration changes")
    echo "  ⚠️ Configuration changes"
fi

# Check for infrastructure
if echo "$CHANGED_FILES" | grep -qiE 'terraform|kubernetes|docker|nginx|\.tf$'; then
    RISK_SCORE=$((RISK_SCORE + 20))
    RISK_FACTORS+=("Infrastructure changes")
    echo "  ⚠️ Infrastructure changes"
fi

# Check for auth/security
if echo "$CHANGED_FILES" | grep -qiE 'auth|security|permission|token|password|secret'; then
    RISK_SCORE=$((RISK_SCORE + 20))
    RISK_FACTORS+=("Authentication/security changes")
    echo "  ⚠️ Auth/security changes"
fi

# Check for payment/billing
if echo "$CHANGED_FILES" | grep -qiE 'payment|billing|stripe|checkout|order'; then
    RISK_SCORE=$((RISK_SCORE + 25))
    RISK_FACTORS+=("Payment/billing changes")
    echo "  ⚠️ Payment/billing changes"
fi
```

### Step 4: Timing Analysis

```bash
echo ""
echo "⏰ Timing Analysis..."

HOUR=$(date +%H)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_NAME=$(date +%A)

echo "  Current time: $(date '+%H:%M %Z') ($DAY_NAME)"

# Late deploy
if [[ $HOUR -ge 16 ]]; then
    RISK_SCORE=$((RISK_SCORE + 10))
    RISK_FACTORS+=("Late deploy (after 4pm)")
    echo "  ⚠️ Deploying late in the day"
fi

# Friday deploy
if [[ $DAY_OF_WEEK -eq 5 ]]; then
    RISK_SCORE=$((RISK_SCORE + 15))
    RISK_FACTORS+=("Friday deploy")
    echo "  ⚠️ Friday deploy - limited weekend support"
fi

# Weekend deploy
if [[ $DAY_OF_WEEK -ge 6 ]]; then
    RISK_SCORE=$((RISK_SCORE + 20))
    RISK_FACTORS+=("Weekend deploy")
    echo "  ⚠️ Weekend deploy"
fi
```

### Step 5: Historical Analysis

```bash
echo ""
echo "📊 Historical Analysis..."

# Check recent deploy failures
RECENT_FAILURES=$(dx_query "
    SELECT COUNT(*) FROM deploy_history
    WHERE outcome = 'failure'
      AND timestamp > datetime('now', '-7 days');
" "line" 2>/dev/null | grep -oE '[0-9]+' || echo "0")

if [[ "$RECENT_FAILURES" -gt 0 ]]; then
    RISK_SCORE=$((RISK_SCORE + 15))
    RISK_FACTORS+=("$RECENT_FAILURES recent deploy failures")
    echo "  ⚠️ $RECENT_FAILURES deploy failures in last 7 days"
else
    echo "  ✅ No recent deploy failures"
fi

# Check CI status
echo ""
CI_STATUS=$(gh run list --branch="$TARGET_BRANCH" --limit=1 --json conclusion -q '.[0].conclusion' 2>/dev/null)
if [[ "$CI_STATUS" == "failure" ]]; then
    RISK_SCORE=$((RISK_SCORE + 30))
    RISK_FACTORS+=("CI is failing")
    echo "  ❌ CI is failing on this branch"
elif [[ "$CI_STATUS" == "success" ]]; then
    echo "  ✅ CI passing"
else
    RISK_SCORE=$((RISK_SCORE + 10))
    RISK_FACTORS+=("CI status unknown")
    echo "  ⚠️ CI status: $CI_STATUS"
fi
```

### Step 6: Test Coverage Check

```bash
echo ""
echo "🧪 Test Analysis..."

# Check for test file changes
TEST_FILES=$(echo "$CHANGED_FILES" | grep -iE 'test|spec' | wc -l | tr -d ' ')
SRC_FILES=$(echo "$CHANGED_FILES" | grep -ivE 'test|spec' | wc -l | tr -d ' ')

if [[ $SRC_FILES -gt 0 ]] && [[ $TEST_FILES -eq 0 ]]; then
    RISK_SCORE=$((RISK_SCORE + 15))
    RISK_FACTORS+=("No test changes for $SRC_FILES source files")
    echo "  ⚠️ $SRC_FILES source files changed, 0 test files"
else
    TEST_RATIO=$((TEST_FILES * 100 / (SRC_FILES + 1)))
    echo "  Test ratio: $TEST_FILES test files / $SRC_FILES source files"
fi
```

### Step 7: Generate Report

```bash
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Cap at 100
[[ $RISK_SCORE -gt 100 ]] && RISK_SCORE=100

# Determine risk level
if [[ $RISK_SCORE -lt 20 ]]; then
    LEVEL="LOW"
    EMOJI="🟢"
    MESSAGE="Safe to deploy"
elif [[ $RISK_SCORE -lt 40 ]]; then
    LEVEL="MODERATE"
    EMOJI="🟡"
    MESSAGE="Proceed with caution"
elif [[ $RISK_SCORE -lt 60 ]]; then
    LEVEL="ELEVATED"
    EMOJI="🟠"
    MESSAGE="Consider additional review"
elif [[ $RISK_SCORE -lt 80 ]]; then
    LEVEL="HIGH"
    EMOJI="🔴"
    MESSAGE="Extra caution advised"
else
    LEVEL="CRITICAL"
    EMOJI="⛔"
    MESSAGE="Consider postponing"
fi

echo "$EMOJI RISK SCORE: $RISK_SCORE/100 ($LEVEL)"
echo ""
echo "$MESSAGE"
echo ""

if [[ ${#RISK_FACTORS[@]} -gt 0 ]]; then
    echo "Risk Factors:"
    for factor in "${RISK_FACTORS[@]}"; do
        echo "  • $factor"
    done
fi
```

### Step 8: Recommendations

```bash
echo ""
echo "📋 Recommendations:"

if [[ $RISK_SCORE -ge 60 ]]; then
    echo "  • Consider splitting into smaller releases"
    echo "  • Ensure rollback plan is ready"
    echo "  • Have on-call support available"
fi

if echo "${RISK_FACTORS[*]}" | grep -q "migration"; then
    echo "  • Test migration on staging first"
    echo "  • Prepare rollback migration"
    echo "  • Schedule during low-traffic period"
fi

if echo "${RISK_FACTORS[*]}" | grep -q "Friday\|Weekend"; then
    echo "  • Consider waiting until Monday"
    echo "  • Ensure team availability"
fi

if [[ $RISK_SCORE -lt 20 ]]; then
    echo "  • Looking good! Standard deploy process applies"
fi

echo ""
echo "Create checkpoint before deploy: /checkpoint save pre-deploy"
```

## Output Format

```
╔══════════════════════════════════════════════════════════════╗
║                    🚀 DEPLOY RISK ASSESSMENT                  ║
╚══════════════════════════════════════════════════════════════╝

Analyzing: feature/auth → main

📏 CHANGE SIZE
──────────────
  Lines: +342 -128 (470 total)
  Files: 12

📁 CRITICAL FILES
─────────────────
  ⚠️ Database migration detected
  ⚠️ Authentication changes

⏰ TIMING
─────────
  Current: 17:30 PST (Friday)
  ⚠️ Friday deploy
  ⚠️ Late in day

📊 HISTORY
──────────
  ✅ No recent failures
  ✅ CI passing

════════════════════════════════════════════════════════════════

🟠 RISK SCORE: 55/100 (ELEVATED)

Consider additional review

Risk Factors:
  • Database migration detected
  • Authentication changes
  • Friday deploy
  • Late deploy (after 4pm)

📋 Recommendations:
  • Test migration on staging first
  • Consider waiting until Monday
  • Ensure rollback plan is ready
  • Create checkpoint: /checkpoint save pre-deploy
```

---

*Part of DX Framework v2.5.0 - Safe Deployments*
