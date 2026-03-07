---
category: dev
---

# /affected-tests - Smart Test Selection

You are helping the user identify which tests to run based on their code changes.

## Purpose

Run only the tests that matter:
- Save time by skipping unrelated tests
- Identify tests by convention, imports, and historical correlation
- Track test stability over time

## Usage

```
/affected-tests              # Tests for uncommitted changes
/affected-tests HEAD~1       # Tests for last commit
/affected-tests main         # Tests for changes since main
/affected-tests --flaky      # Show flaky test report
```

## Execution Steps

### Step 1: Load Test Intelligence

```bash
source .claude/lib/dx-test-intel.sh
```

### Step 2: Get Changed Files

```bash
BASE_REF="${1:-HEAD}"

echo "=== CHANGED FILES ==="
git diff --name-only "$BASE_REF" 2>/dev/null | head -20

CHANGED_COUNT=$(git diff --name-only "$BASE_REF" 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "Total: $CHANGED_COUNT files changed"
```

### Step 3: Find Affected Tests

```bash
echo ""
dx_get_affected_tests "$BASE_REF"
```

### Step 4: Generate Test Command

```bash
echo ""
echo "=== SUGGESTED COMMAND ==="
dx_generate_test_command "$BASE_REF"
```

### Step 5: Show Flaky Tests (if requested)

```bash
if [[ "$1" == "--flaky" ]] || [[ "$2" == "--flaky" ]]; then
    echo ""
    dx_get_flaky_tests
fi
```

## Output Format

```
╔══════════════════════════════════════════════════════════════╗
║                    🧪 AFFECTED TESTS                          ║
╚══════════════════════════════════════════════════════════════╝

📁 CHANGED FILES (5)
────────────────────
  src/auth/login.ts
  src/auth/utils.ts
  src/components/LoginForm.tsx
  src/api/auth.ts
  src/types/user.ts

🎯 AFFECTED TESTS
─────────────────
By convention:
  ✓ src/auth/login.test.ts
  ✓ src/auth/utils.test.ts
  ✓ src/components/__tests__/LoginForm.test.tsx

By imports:
  ✓ src/api/__tests__/auth.test.ts (imports auth/utils)

By historical correlation:
  ✓ tests/integration/auth.test.ts (92% correlation)

💻 SUGGESTED COMMAND
────────────────────
npx jest src/auth/login.test.ts src/auth/utils.test.ts \
         src/components/__tests__/LoginForm.test.tsx \
         src/api/__tests__/auth.test.ts

⏱️ Estimated time: ~30 seconds (vs 5 minutes for full suite)
```

## Learning from Test Runs

After running tests, the system learns:
- Which source files cause which tests to fail (correlation)
- Which tests are flaky (fail without code changes)

```bash
# Record a test failure correlation
dx_record_test_correlation "src/auth/login.ts" "tests/integration/auth.test.ts"

# Record a flaky test
dx_record_flaky_test "tests/e2e/slow.test.ts" "" 1
```

---

*Part of DX Framework v2.5.0 - Smart Testing*
