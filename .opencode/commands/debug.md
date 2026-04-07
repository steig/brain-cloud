---
category: ops
---

# /debug - Systematic Debugging Framework

**Four-phase root cause analysis that ensures understanding before attempting fixes.**

## Usage
- `/debug` - Start debugging session for current issue
- `/debug "Login fails after timeout"` - Debug specific problem
- `/debug --analyze` - Deep analysis mode with instrumentation

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

## When to Use

**Use for ANY technical issue:**
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**Use ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- You don't fully understand the issue

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (rushing guarantees rework)
- Someone wants it fixed NOW (systematic is faster than thrashing)

## The Four Phases

```
┌──────────────────────────────────────────────────────────────────┐
│                    SYSTEMATIC DEBUGGING                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Phase 1          Phase 2          Phase 3          Phase 4    │
│  ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐  │
│  │  ROOT  │──────▶│PATTERN │──────▶│HYPOTHE-│──────▶│IMPLEM- │  │
│  │ CAUSE  │       │ANALYSIS│       │  SIS   │       │ENTATION│  │
│  │INVESTIG│       │        │       │TESTING │       │        │  │
│  └────────┘       └────────┘       └────────┘       └────────┘  │
│                                                                  │
│  - Read errors    - Find working  - Form single   - Create test │
│  - Reproduce      - Compare refs  - Test minimal  - Single fix  │
│  - Check changes  - Identify diff - Verify first  - Verify      │
│  - Gather evidence- Understand    - If wrong,     - If fails,   │
│                     dependencies    new hypothesis  return to 1  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**You MUST complete each phase before proceeding to the next.**

---

## Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

### 1.1 Read Error Messages Carefully

```bash
# Don't skip past errors or warnings
# They often contain the exact solution

# Read COMPLETELY:
- Full error message text
- Stack traces (every line)
- Line numbers and file paths
- Error codes
- Timestamps
```

**Common mistake:** Skimming errors and missing the solution that's right there.

### 1.2 Reproduce Consistently

Ask yourself:
- Can I trigger this reliably?
- What are the exact steps?
- Does it happen every time?
- What environment/conditions?

**If not reproducible:** Gather more data. Don't guess.

```bash
# Document reproduction steps
echo "## Reproduction Steps"
echo "1. [First step]"
echo "2. [Second step]"
echo "3. [Expected: X, Actual: Y]"
```

### 1.3 Check Recent Changes

```bash
# What changed that could cause this?
git log --oneline -20
git diff HEAD~5

# Check recent commits
git show HEAD --stat

# Check for config changes
git diff HEAD~5 -- "*.json" "*.yaml" "*.toml" "*.nix"

# Check environment differences
env | sort > current_env.txt
# Compare with known-good environment
```

### 1.4 Gather Evidence in Multi-Component Systems

**WHEN system has multiple components** (CI → build → signing, API → service → database):

**BEFORE proposing fixes, add diagnostic instrumentation:**

```bash
# For EACH component boundary:
# - Log what data enters component
# - Log what data exits component
# - Verify environment/config propagation
# - Check state at each layer

# Example: Multi-layer debugging
echo "=== Layer 1: Entry Point ==="
echo "Input received: $INPUT"
echo "Environment: $(env | grep RELEVANT_VAR)"

echo "=== Layer 2: Processing ==="
echo "Data after transform: $PROCESSED"
echo "State: $CURRENT_STATE"

echo "=== Layer 3: Output ==="
echo "Final result: $OUTPUT"
echo "Exit code: $?"
```

**This reveals:** Which layer fails (Layer 1 → Layer 2 ✓, Layer 2 → Layer 3 ✗)

### 1.5 Trace Data Flow

**WHEN error is deep in call stack:**

```
Where does the bad value originate?
    ↓
What called this function with the bad value?
    ↓
Keep tracing UP until you find the SOURCE
    ↓
Fix at SOURCE, not at symptom
```

**Example trace:**
```
Error at line 150: "undefined is not a function"
    ↑ Called from line 89 with result of getUserData()
    ↑ getUserData() returns undefined when user not found
    ↑ User lookup fails because session expired
    ↑ ROOT CAUSE: Session timeout not handled
```

---

## Phase 2: Pattern Analysis

**Find the pattern before fixing:**

### 2.1 Find Working Examples

```bash
# Locate similar WORKING code in same codebase
grep -r "similar_pattern" --include="*.ts" .

# What works that's similar to what's broken?
# Compare working vs broken implementations
```

### 2.2 Compare Against References

If implementing a pattern:
- Read reference implementation COMPLETELY
- Don't skim - read every line
- Understand the pattern fully before applying

```bash
# Example: Check official docs
# Don't assume you know - verify
```

### 2.3 Identify Differences

List EVERY difference between working and broken:

```markdown
## Working vs Broken Comparison

| Aspect | Working | Broken |
|--------|---------|--------|
| Input format | JSON | JSON (same) |
| Auth header | Bearer token | Missing! ← |
| Timeout | 30s | 5s |
| Error handling | Try/catch | None ← |
```

**Don't assume "that can't matter"** - list everything.

### 2.4 Understand Dependencies

```bash
# What does this component need?
# - Other services running?
# - Configuration set?
# - Environment variables?
# - Network access?
# - Permissions?

# Check each dependency
echo "Checking dependencies..."
curl -s http://localhost:8080/health || echo "Service down!"
echo $REQUIRED_ENV_VAR || echo "Env var missing!"
```

---

## Phase 3: Hypothesis and Testing

**Scientific method for debugging:**

### 3.1 Form Single Hypothesis

State clearly and write it down:

```markdown
## Hypothesis

**I think:** [X] is the root cause
**Because:** [Y] evidence supports this
**If true:** [Z] behavior would change when fixed
```

Be specific, not vague:
- ❌ "Something is wrong with auth"
- ✅ "The JWT token expires before the request completes because timeout is 5s but token TTL is 3s"

### 3.2 Test Minimally

Make the SMALLEST possible change to test hypothesis:

```bash
# ONE variable at a time
# Don't fix multiple things at once

# Example: Testing timeout hypothesis
# Change ONLY the timeout, nothing else
export TIMEOUT=30  # was 5
# Run test
# Did it fix it? Yes → hypothesis confirmed
#               No → form NEW hypothesis
```

### 3.3 Verify Before Continuing

- Did it work? Yes → Phase 4
- Didn't work? Form NEW hypothesis
- DON'T add more fixes on top

### 3.4 When You Don't Know

Be honest:
- Say "I don't understand X"
- Don't pretend to know
- Ask for help
- Research more

```bash
# It's okay to not know
echo "I need to research: [specific thing]"
echo "I should ask about: [specific question]"
```

---

## Phase 4: Implementation

**Fix the root cause, not the symptom:**

### 4.1 Create Failing Test Case

```bash
# BEFORE fixing, create test that reproduces the bug
# Use /tdd principles

# Simplest possible reproduction
# Automated test if possible
# One-off test script if no framework
# MUST have before fixing
```

**Integrate with TDD:** Use `/tdd` command for writing the failing test.

### 4.2 Implement Single Fix

```bash
# Address the ROOT CAUSE identified
# ONE change at a time
# No "while I'm here" improvements
# No bundled refactoring
```

### 4.3 Verify Fix

```bash
# Run the test you created
npm test path/to/bug-fix.test.ts

# Confirm:
# - Test passes now?
# - Other tests still pass?
# - Issue actually resolved in real scenario?
```

### 4.4 If Fix Doesn't Work

**STOP and count:** How many fixes have you tried?

```
Fixes tried < 3:
    → Return to Phase 1
    → Re-analyze with new information
    → Form new hypothesis

Fixes tried >= 3:
    → STOP
    → Question the architecture (see 4.5)
    → DON'T attempt Fix #4 without discussion
```

### 4.5 If 3+ Fixes Failed: Question Architecture

**Patterns indicating architectural problem:**
- Each fix reveals new shared state/coupling
- Fixes require "massive refactoring"
- Each fix creates new symptoms elsewhere

**STOP and discuss:**

```markdown
## Architecture Review Needed

**Symptoms:**
- Fix 1: [what happened]
- Fix 2: [what happened]
- Fix 3: [what happened]

**Pattern:** Each fix reveals deeper coupling

**Proposal:** Before Fix 4, review architecture with team
```

---

## Debugging Checklist

```bash
# Phase 1: Root Cause Investigation
echo "📋 Phase 1: ROOT CAUSE"
echo "  [ ] Read error messages completely"
echo "  [ ] Reproduce consistently"
echo "  [ ] Check recent changes (git log/diff)"
echo "  [ ] Add diagnostic logging if multi-component"
echo "  [ ] Trace data flow to source"
echo ""

# Phase 2: Pattern Analysis
echo "📋 Phase 2: PATTERN ANALYSIS"
echo "  [ ] Find working examples in codebase"
echo "  [ ] Compare against references/docs"
echo "  [ ] List ALL differences (working vs broken)"
echo "  [ ] Verify all dependencies"
echo ""

# Phase 3: Hypothesis Testing
echo "📋 Phase 3: HYPOTHESIS"
echo "  [ ] Write clear hypothesis statement"
echo "  [ ] Make minimal test change"
echo "  [ ] Verify result before continuing"
echo ""

# Phase 4: Implementation
echo "📋 Phase 4: IMPLEMENTATION"
echo "  [ ] Create failing test for bug"
echo "  [ ] Implement single fix"
echo "  [ ] Verify fix works"
echo "  [ ] Check for regressions"
echo "  [ ] If 3+ failures, review architecture"
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails | Do This Instead |
|--------------|--------------|-----------------|
| "Try random things" | Creates new bugs, wastes time | Follow 4 phases systematically |
| "Quick fix now, understand later" | Later never comes, tech debt grows | Understand FIRST |
| "It worked before, just revert" | Doesn't explain cause, will recur | Find root cause |
| "Add more logging everywhere" | Noise obscures signal | Strategic logging at boundaries |
| "Google the error message" | Often leads to wrong solutions | Understand YOUR system first |
| "It's probably X" | Confirmation bias | Test hypothesis scientifically |
| "Works on my machine" | Environment differences | Document and compare environments |

---

## Integration with Framework

### Starting Debug Session

```bash
# Initialize debug session
init_debug_session() {
    export DEBUG_SESSION_START=$(date +%s)
    export DEBUG_PHASE=1
    export DEBUG_HYPOTHESES=0
    export DEBUG_FIXES_ATTEMPTED=0

    echo "🔍 **Debug Session Started**"
    echo "Following 4-phase systematic debugging"
    echo ""
    echo "Phase 1: Root Cause Investigation"
    echo "─────────────────────────────────"
}

# Track debug progress
record_debug_phase() {
    local phase="$1"
    local finding="$2"

    case "$phase" in
        1) echo "🔍 Phase 1 (Root Cause): $finding" ;;
        2) echo "📊 Phase 2 (Pattern Analysis): $finding" ;;
        3) echo "🧪 Phase 3 (Hypothesis): $finding" ;;
        4) echo "🔧 Phase 4 (Implementation): $finding" ;;
    esac
}

# Track fix attempts
record_fix_attempt() {
    ((DEBUG_FIXES_ATTEMPTED++))

    if [[ $DEBUG_FIXES_ATTEMPTED -ge 3 ]]; then
        echo "⚠️ **WARNING: 3+ fix attempts**"
        echo "Consider reviewing architecture before continuing"
    fi
}
```

### Combining with /do_task

When a bug is found during `/do_task`:

```bash
# Return to debug mode
/debug "Test failure in user authentication"

# After root cause found, resume task
/do_task 123 --continue
```

---

## Example Debug Session

```
User: /debug "API returns 500 error on user creation"

Claude: 🔍 **Starting Systematic Debug Session**

## Phase 1: Root Cause Investigation

### Reading Error Messages
Checking server logs...

```
ERROR 2024-01-15 10:23:45 - DatabaseError: duplicate key value violates unique constraint "users_email_key"
  at UserRepository.create (src/repositories/user.ts:45)
  at UserService.createUser (src/services/user.ts:23)
  at UserController.post (src/controllers/user.ts:15)
```

**Finding:** Error is clear - duplicate email constraint violation.

### Reproducing
```bash
curl -X POST /api/users -d '{"email": "test@example.com", "name": "Test"}'
# Returns 500
curl -X POST /api/users -d '{"email": "test@example.com", "name": "Test"}'
# Also returns 500 - reproducible
```

### Checking Recent Changes
```bash
git log --oneline -5
# abc123 - Remove email validation from frontend
# def456 - Add user creation endpoint
```

**Finding:** Frontend validation was removed, but backend doesn't return proper error.

## Phase 2: Pattern Analysis

### Finding Working Examples
Looking at other endpoints...
```typescript
// src/controllers/product.ts - handles duplicates properly
try {
  await productService.create(data);
} catch (error) {
  if (error.code === '23505') { // PostgreSQL duplicate key
    return res.status(409).json({ error: 'Product already exists' });
  }
  throw error;
}
```

### Difference Identified
| Aspect | Product Controller | User Controller |
|--------|-------------------|-----------------|
| Duplicate handling | Returns 409 | Throws 500 |
| Error message | User-friendly | Stack trace |

## Phase 3: Hypothesis

**Hypothesis:** User controller doesn't handle PostgreSQL duplicate key error (code 23505), causing unhandled exception that becomes 500.

**Test:** Add error handling for code 23505, should return 409.

## Phase 4: Implementation

### Creating Failing Test
```typescript
test('returns 409 when email already exists', async () => {
  await createUser({ email: 'existing@test.com' });

  const response = await request(app)
    .post('/api/users')
    .send({ email: 'existing@test.com', name: 'Test' });

  expect(response.status).toBe(409);
  expect(response.body.error).toContain('already exists');
});
```

Running test... ❌ Fails with 500 (as expected)

### Implementing Fix
```typescript
// src/controllers/user.ts
try {
  const user = await userService.createUser(data);
  return res.status(201).json(user);
} catch (error) {
  if (error.code === '23505') {
    return res.status(409).json({ error: 'User with this email already exists' });
  }
  throw error;
}
```

Running test... ✅ Passes!
Running full suite... ✅ All tests pass!

## Resolution

**Root Cause:** Missing error handling for duplicate key constraint in user controller.

**Fix:** Added proper 409 response for duplicate email attempts.

**Prevention:** Consider adding error handling middleware for common database errors.
```

---

## Success Criteria

- ✅ Root cause identified before any fix attempted
- ✅ Hypothesis clearly stated and tested
- ✅ Fix addresses root cause, not symptom
- ✅ Failing test created before fix
- ✅ No regressions introduced
- ✅ Understanding documented for future reference

## Philosophy

**Debugging is detective work, not guessing.**

The fastest path to a fix is through understanding. Every minute spent on root cause analysis saves ten minutes of random fixes.

---

**Based on:** [Superpowers Systematic Debugging](https://github.com/obra/superpowers) by Jesse Vincent
**Framework Version:** 2.0.0
