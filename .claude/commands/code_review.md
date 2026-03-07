---
category: daily
---

You are helping the user perform comprehensive code review with intelligent analysis and actionable feedback.

## Usage

```
/code_review              # Full two-stage review
/code_review --spec-only  # Stage 1 only (spec compliance)
/code_review --quality    # Stage 2 only (code quality)
/code_review --team       # Multi-specialist parallel review via Agent Teams
```

## Team Mode (`--team`)

When `--team` is passed, activate multi-specialist parallel review:

1. **Assemble team silently** from active profile (see `/team assemble`)
2. **Load specialist personas** from `.ai/specialists/{name}.md`
3. **Run specialists from `review_order`** in parallel (via Agent Teams or Task subagents)
4. **Each specialist reviews** through their lens using their Review Checklist and Anti-Patterns
5. **Lead merges findings** into unified report (grouped by severity, duplicates removed)

Output uses the Team Review Report format from `/team review`. Falls back to sequential if Agent Teams not enabled.

Without `--team`, the existing two-stage sequential review runs unchanged.

---

## Two-Stage Review Process

| Stage | Question | Focus |
|-------|----------|-------|
| **Stage 1** | "Did you build what was asked?" | Spec compliance, acceptance criteria |
| **Stage 2** | "Is it well-built?" | Quality, security, performance |

**Stage 2 is blocked until Stage 1 passes.**

## Workflow

### Stage 1: Spec Compliance

1. **Find linked issue** from branch name or ask user
2. **Extract acceptance criteria** from GitHub issue
3. **Check each criterion** against the code changes
4. **Report compliance status**:

```
## Spec Compliance Review

Issue: #123 - Add user authentication

| Criterion | Status | Notes |
|-----------|--------|-------|
| User can register | PASS | RegisterForm.tsx implements this |
| User can login | PASS | LoginForm.tsx with validation |
| Session persists | FAIL | No token persistence on refresh |

**Result: BLOCKED** - Fix criterion 3 before proceeding to Stage 2
```

If any FAIL, stop and help fix before continuing.

### Stage 2: Code Quality (4 Parallel Streams)

**Stream 1 - Architecture:**
- Pattern consistency with codebase
- SOLID principles
- Appropriate abstractions

**Stream 2 - Security:**
- OWASP Top 10 checks
- Input validation
- Auth/authz patterns
- Secrets exposure

**Stream 3 - Performance:**
- Algorithm efficiency
- Database query patterns
- Memory/resource usage
- Caching opportunities

**Stream 4 - AI Simplification:**
- Over-abstraction (unnecessary helpers, premature DRY)
- Excessive error handling for impossible cases
- Feature flags or compatibility shims when direct change works
- Comments explaining obvious code
- Type annotations TypeScript would infer
- Wrapper functions that add no value
- Configuration where hardcoded values suffice

### Output Format

```
## Code Review: [files/scope]

### Stage 1: Spec Compliance
[Acceptance criteria checklist]

### Stage 2: Quality Analysis

#### Critical Issues (must fix)
- [Security/correctness issues]

#### Important (should fix)
- [Quality improvements]

#### Suggestions
- [Optional improvements]

### Summary
- Issues: X critical, Y important, Z suggestions
- Recommendation: [APPROVE | FIX REQUIRED]
```

## Profile Integration

Review adapts to project profile:

| Profile | Focus Areas |
|---------|-------------|
| `react` | hooks rules, component composition, state management |
| `nextjs` | server/client components, data fetching, caching |
| `python` | type hints, async patterns, ORM usage |
| `shopify` | accessibility, liquid best practices, performance |

## Quick Reference

**Security Checks:**
- XSS (innerHTML, dangerouslySetInnerHTML)
- Injection (SQL, command, path)
- Auth bypass, secrets exposure

**Quality Checks:**
- Single responsibility, DRY/KISS
- Error handling, edge cases
- Naming, documentation

**Performance Checks:**
- N+1 queries, unnecessary re-renders
- Missing memoization, inefficient loops

**AI Simplification Checks (ask for each change):**
1. Can this be deleted? (unused code, dead branches, unnecessary fallbacks)
2. Can this be inlined? (single-use helpers, wrappers, abstractions)
3. Can this be simplified? (over-engineered patterns, excessive validation)
4. Is this defensive code necessary? (error handling for impossible cases)
5. Are these comments needed? (self-documenting code doesn't need narration)

| Common AI Pattern | Fix |
|-------------------|-----|
| Try/catch around infallible code | Remove |
| Helper function used once | Inline |
| Config for single value | Hardcode |
| Interface for single impl | Remove |
| Null checks on required fields | Trust types |
| Backwards-compat for new code | Delete shim |
