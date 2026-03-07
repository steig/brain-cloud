---
category: meta
---

# /tdd - Test-Driven Development Enforcement

**Enforce strict TDD discipline: Write the test first, watch it fail, write minimal code to pass.**

## Usage
- `/tdd` - Start TDD session for current task
- `/tdd 123` - TDD implementation for GitHub issue #123
- `/tdd "Add user validation"` - TDD for described feature

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

## When to Use

**Always use TDD for:**
- New features
- Bug fixes
- Refactoring
- Behavior changes

**Exceptions (ask user first):**
- Throwaway prototypes
- Generated code
- Configuration files

Thinking "skip TDD just this once"? Stop. That's rationalization.

## The Red-Green-Refactor Cycle

```
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   ┌─────────┐    ┌─────────┐    ┌──────────┐           │
    │   │   RED   │───▶│  GREEN  │───▶│ REFACTOR │───┐       │
    │   │  Write  │    │ Minimal │    │  Clean   │   │       │
    │   │ failing │    │  code   │    │   up     │   │       │
    │   │  test   │    │ to pass │    │          │   │       │
    │   └─────────┘    └─────────┘    └──────────┘   │       │
    │        ▲                                       │       │
    │        └───────────────────────────────────────┘       │
    │                      REPEAT                            │
    └─────────────────────────────────────────────────────────┘
```

## Workflow

### Phase 1: RED - Write Failing Test

Write ONE minimal test showing what should happen.

**Good Test Example:**
```typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };

  const result = await retryOperation(operation);

  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```

**Bad Test Example:**
```typescript
test('retry works', async () => {
  const mock = jest.fn()
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce('success');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(2);
});
// Vague name, tests mock not code
```

**Requirements:**
- One behavior per test
- Clear, descriptive name
- Test real code (minimize mocks)

### Phase 2: Verify RED - Watch It Fail

**MANDATORY. Never skip this step.**

```bash
# Run the specific test
npm test path/to/test.test.ts
# or
pytest tests/path/test.py::test_name -v
# or
go test -run TestName ./...
```

**Confirm:**
- Test FAILS (not errors)
- Failure message matches expectation
- Fails because feature is missing (not typos)

**Test passes immediately?** You're testing existing behavior. Fix the test.

**Test errors?** Fix the error, re-run until it fails correctly.

### Phase 3: GREEN - Write Minimal Code

Write the SIMPLEST code to make the test pass.

**Good Implementation:**
```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  throw new Error('unreachable');
}
```

**Bad Implementation:**
```typescript
async function retryOperation<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    backoff?: 'linear' | 'exponential';
    onRetry?: (attempt: number) => void;
  }
): Promise<T> {
  // YAGNI - You Aren't Gonna Need It
}
```

**Rules:**
- Don't add features beyond what test requires
- Don't refactor other code
- Don't "improve" beyond the test
- Just enough to pass

### Phase 4: Verify GREEN - Watch It Pass

**MANDATORY.**

```bash
# Run specific test
npm test path/to/test.test.ts

# Run full test suite to check for regressions
npm test
```

**Confirm:**
- Your test passes
- All other tests still pass
- No warnings or errors in output

**Test fails?** Fix code, not test.
**Other tests fail?** Fix regression now.

### Phase 5: REFACTOR - Clean Up (Only After Green)

**Only after tests pass:**
- Remove duplication
- Improve names
- Extract helpers
- Simplify logic

**Keep tests green throughout refactoring.** Don't add behavior.

### Phase 6: REPEAT

Next failing test for next piece of functionality.

## The Delete Rule

**Wrote code before the test? Delete it. Start over.**

No exceptions:
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete

Implement fresh from tests. Period.

## Common Rationalizations (And Why They're Wrong)

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Tests after achieve same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt. |
| "Keep as reference, write tests first" | You'll adapt it. That's testing after. Delete means delete. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test is hard = design unclear" | Listen to test. Hard to test = hard to use. |
| "TDD will slow me down" | TDD faster than debugging. Pragmatic = test-first. |
| "Existing code has no tests" | You're improving it. Add tests for what you change. |
| "This is different because..." | No it isn't. TDD applies. |

## Red Flags - STOP and Start Over

When you notice any of these, STOP immediately:

- Code written before test
- Test written after implementation
- Test passes immediately without code changes
- Can't explain why test failed
- Tests added "later"
- Rationalizing "just this once"
- "I already manually tested it"
- "Keep as reference"
- "Already spent X hours, deleting is wasteful"
- "TDD is dogmatic, I'm being pragmatic"

**All of these mean: Delete code. Start over with TDD.**

## Implementation Checklist

```bash
# TDD Session Checklist
echo "🔴 RED Phase"
echo "  [ ] Write ONE failing test"
echo "  [ ] Test has clear, descriptive name"
echo "  [ ] Test checks ONE behavior"
echo "  [ ] Run test - verify it FAILS correctly"
echo ""
echo "🟢 GREEN Phase"
echo "  [ ] Write MINIMAL code to pass"
echo "  [ ] No extra features"
echo "  [ ] Run test - verify it PASSES"
echo "  [ ] Run full suite - no regressions"
echo ""
echo "🔵 REFACTOR Phase"
echo "  [ ] Clean up code (optional)"
echo "  [ ] Keep tests passing"
echo "  [ ] No new behavior"
echo ""
echo "🔄 REPEAT"
echo "  [ ] Next failing test"
```

## Integration with Framework

### Starting TDD Session

```bash
# Load TDD utilities
source .claude/lib/tdd-utils.sh

# Initialize TDD tracking
init_tdd_session() {
    export TDD_SESSION_START=$(date +%s)
    export TDD_CYCLE_COUNT=0
    export TDD_CURRENT_PHASE="red"

    echo "🧪 **TDD Session Started**"
    echo "Remember: RED → GREEN → REFACTOR → REPEAT"
    echo ""
}

# Track TDD cycle
record_tdd_cycle() {
    local phase="$1"
    local test_name="$2"
    local status="$3"

    case "$phase" in
        "red")
            echo "🔴 RED: Writing failing test for: $test_name"
            ;;
        "red_verified")
            echo "🔴 RED VERIFIED: Test fails correctly"
            ;;
        "green")
            echo "🟢 GREEN: Implementing minimal code"
            ;;
        "green_verified")
            echo "🟢 GREEN VERIFIED: Test passes"
            ((TDD_CYCLE_COUNT++))
            ;;
        "refactor")
            echo "🔵 REFACTOR: Cleaning up (tests still green)"
            ;;
    esac
}
```

### Combining with /do_task

```bash
# When using /do_task with TDD
/do_task 123 --tdd

# This enforces:
# 1. Each implementation step starts with failing test
# 2. Verification that test fails before coding
# 3. Verification that test passes after coding
# 4. No code without corresponding test
```

## Example TDD Session

```
User: /tdd "Add email validation function"

Claude: 🧪 **Starting TDD Session**

## 🔴 RED Phase - Writing Failing Test

I'll write a test for email validation:

```typescript
// tests/utils/validation.test.ts
describe('validateEmail', () => {
  test('returns true for valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('name.surname@domain.org')).toBe(true);
  });

  test('returns false for invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@nodomain.com')).toBe(false);
    expect(validateEmail('no@tld')).toBe(false);
  });
});
```

Running test to verify it fails...

```bash
npm test tests/utils/validation.test.ts
```

🔴 **Test fails as expected**: `validateEmail is not defined`

## 🟢 GREEN Phase - Minimal Implementation

```typescript
// src/utils/validation.ts
export function validateEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}
```

Running test to verify it passes...

🟢 **All tests pass!**

## 🔵 REFACTOR Phase

Code is already minimal. No refactoring needed.

## 🔄 Ready for Next Cycle

TDD cycle complete. Ready for next test or feature.
```

## Success Criteria

- ✅ Every piece of code has a corresponding failing test written FIRST
- ✅ Tests actually verify behavior (seen failing then passing)
- ✅ No production code without test coverage
- ✅ Regressions caught immediately
- ✅ Code is testable by design

## Philosophy

**Why TDD works:**
- Forces you to think about requirements before coding
- Creates executable documentation
- Catches bugs before they reach production
- Makes refactoring safe
- Produces testable, modular code

**TDD is pragmatic, not dogmatic.** The fastest path to working software is through tests first.

---

**Based on:** [Superpowers TDD Skill](https://github.com/obra/superpowers) by Jesse Vincent
**Framework Version:** 2.0.0
