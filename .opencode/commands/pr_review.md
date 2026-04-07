---
category: git
---

You are helping the user review a pull request with comprehensive analysis and intelligent feedback.

## Usage

```
/pr_review 42              # Review PR #42 and post to GitHub
/pr_review                  # Review PR for current branch
/pr_review 42 --approve     # Review and approve
/pr_review 42 --request-changes
/pr_review 42 --no-post     # Review without posting to GitHub
/pr_review 42 --team        # Multi-specialist parallel review via Agent Teams
```

## Team Mode (`--team`)

When `--team` is passed, activate multi-specialist parallel review:

1. **Assemble team silently** from active profile (see `/team assemble`)
2. **Fetch PR diff and metadata** as normal
3. **Run specialists from `review_order`** in parallel (via Agent Teams or Task subagents)
4. **Each specialist reviews** through their lens using their Review Checklist and Anti-Patterns
5. **Lead merges findings** into unified report (grouped by severity, duplicates removed)

Output uses the Team Review Report format from `/team review`. Falls back to sequential if Agent Teams not enabled. Posts to GitHub as normal unless `--no-post`.

Without `--team`, the existing 3-stream sequential review runs unchanged.

---

## Workflow

### 1. Gather PR Information
- Fetch PR metadata, diff, and linked issues using GitHub MCP or `gh` CLI
- Check CI/CD status and existing reviews
- Identify acceptance criteria from linked issues

### 2. Parallel Analysis (3 concurrent streams)

**Stream 1 - Security:**
- OWASP Top 5 (injection, auth, XSS, insecure design, misconfig)
- Input validation, secrets detection, auth/authz

**Stream 2 - Code Quality:**
- Architecture alignment with project patterns
- SOLID principles, DRY/KISS, code smells
- Style, naming, documentation

**Stream 3 - Testing:**
- Test coverage for new/modified code
- Test quality and appropriateness
- Integration impact and breaking changes

### 3. Process Review Comments
If existing review comments exist:
- Categorize as blocking/suggestion/question
- Offer resolution assistance

### 4. Generate Review

Output structured feedback:
```
# PR Review: [Title] (#N)

## Requirements Validation
[Check each acceptance criterion from linked issue]

## Strengths
[What's done well]

## Issues
### Critical (must fix)
[Security/correctness issues with fix examples]

### Important (should fix)
[Quality improvements]

### Suggestions (nice to have)
[Optional improvements]

## Testing Assessment
[Coverage gaps, recommended tests]

## Recommendation
[APPROVE | REQUEST CHANGES | COMMENT]
[Clear next steps]
```

### 5. Post to GitHub
```bash
# Default: post as comment
gh pr comment $PR_NUMBER --body "$REVIEW_CONTENT"

# With --approve:
gh pr review $PR_NUMBER --approve --body "$REVIEW_CONTENT"

# With --request-changes:
gh pr review $PR_NUMBER --request-changes --body "$REVIEW_CONTENT"
```

## Key Review Areas

| Area | Check |
|------|-------|
| Requirements | All acceptance criteria met |
| Security | OWASP vulnerabilities, input validation |
| Code Quality | Patterns, SOLID, readability |
| Testing | Coverage, test quality |
| Performance | No regressions, efficient code |
| UX | Error messages, accessibility basics |

## Error Handling

- **PR not found**: Show review content for manual posting
- **Post fails**: Fall back to comment, then show manual instructions
- **Missing issues**: Review based on PR description and code

## Success Criteria

- Requirements validated against linked issue
- Security and quality assessed
- Clear, actionable feedback with examples
- Review posted to GitHub (unless --no-post)
