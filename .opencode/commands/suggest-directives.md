---
category: ai
---

# /suggest-directives - AI Self-Improvement

Analyze your decision history and suggest new CLAUDE.md directives based on patterns.

## Purpose

Implements Clawdbot-inspired "self-modifying prompts" capability:
- Detect patterns in past decisions
- Identify repeated rationales across decisions
- Find frequently used tags
- Suggest CLAUDE.md amendments to codify learned preferences

## Usage

```bash
/suggest-directives              # Analyze last 30 days of decisions
/suggest-directives 90           # Analyze last 90 days
/suggest-directives --apply      # Auto-apply accepted suggestions
```

## Execution Steps

### Step 1: Query Decision History

```
Use brain_search to find decisions:

brain_search(
  query="decision rationale",
  limit=50,
  include_details=true
)

Or query the decisions table directly via Brain MCP.
```

### Step 2: Analyze Patterns

Look for:

1. **Repeated Decisions**: Same choice made multiple times
   - "Always chose TypeScript over JavaScript"
   - "Consistently picked REST over GraphQL"
   - "Always used Tailwind for styling"

2. **Common Rationales**: Similar reasoning across decisions
   - "for consistency with existing code" → suggests pattern preference
   - "to avoid complexity" → suggests simplicity preference
   - "for better testing" → suggests TDD preference

3. **Frequent Tags**: Tags that appear often
   - `#tech-debt` frequently → suggest debt tracking directive
   - `#blocker` patterns → suggest escalation directive
   - `#todo` buildup → suggest task hygiene directive

4. **Time Patterns**: When certain decisions are made
   - Morning decisions tend toward X
   - Friday decisions are more conservative

### Step 3: Generate Suggestions

For each detected pattern, generate a specific CLAUDE.md directive:

```markdown
## Suggested Directive #1

**Pattern Detected**: In 8/10 decisions about state management, you chose "local state over global"

**Rationale Summary**: "simpler", "avoid prop drilling", "component isolation"

**Suggested Directive**:
```
<preference>
Prefer local component state over global state management (Redux, Zustand, etc.)
unless data needs to be shared across 3+ unrelated components.
</preference>
```

**Add to CLAUDE.md?** [Accept] [Reject] [Modify]
```

### Step 4: Present Suggestions

```
╔══════════════════════════════════════════════════════════════╗
║                 🧠 SUGGESTED DIRECTIVES                       ║
╠══════════════════════════════════════════════════════════════╣
║ Based on analysis of {N} decisions over {M} days              ║
╚══════════════════════════════════════════════════════════════╝

📊 DECISION PATTERNS ANALYZED
─────────────────────────────
Decisions reviewed: 47
Unique categories: 12
Strongest patterns: 3

═══════════════════════════════════════════════════════════════

🎯 SUGGESTION #1: Technology Preference
──────────────────────────────────────
Pattern: 6/7 times chose "functional components" over "class components"
Confidence: 86%

Rationale clusters:
• "hooks are cleaner" (3 times)
• "easier to test" (2 times)
• "modern standard" (2 times)

Suggested directive:
┌─────────────────────────────────────────────────────────────┐
│ Always use functional components with hooks. Only use       │
│ class components if integrating with legacy code that       │
│ specifically requires them.                                  │
└─────────────────────────────────────────────────────────────┘

[ ] Accept  [ ] Reject  [ ] Modify

═══════════════════════════════════════════════════════════════

🎯 SUGGESTION #2: Code Organization
──────────────────────────────────────
Pattern: Consistently chose "colocate tests" over "separate test folder"
Confidence: 100% (5/5)

Rationale clusters:
• "easier to find" (3 times)
• "better DX" (2 times)

Suggested directive:
┌─────────────────────────────────────────────────────────────┐
│ Colocate test files with source files (file.test.ts next   │
│ to file.ts) rather than using a separate tests/ directory. │
└─────────────────────────────────────────────────────────────┘

[ ] Accept  [ ] Reject  [ ] Modify

═══════════════════════════════════════════════════════════════

🎯 SUGGESTION #3: Tag Hygiene
──────────────────────────────────────
Pattern: 15 thoughts tagged #tech-debt in last 30 days, none resolved
Confidence: N/A (observation)

Suggested directive:
┌─────────────────────────────────────────────────────────────┐
│ Review #tech-debt items weekly. Before adding new          │
│ tech-debt, check if addressing an existing item would      │
│ take less time than the workaround.                         │
└─────────────────────────────────────────────────────────────┘

[ ] Accept  [ ] Reject  [ ] Modify
```

### Step 5: Apply Accepted Suggestions

If user accepts suggestions:

1. Read current CLAUDE.md
2. Find appropriate section (or create `<learned_preferences>` section)
3. Insert accepted directives
4. Show diff before applying
5. Commit with message: "claude: add learned preference directives"

```bash
# After user accepts
cat >> CLAUDE.md << 'EOF'

<learned_preferences>
<!-- Auto-generated from decision pattern analysis -->

- Always use functional components with hooks
- Colocate test files with source files (file.test.ts)
- Review #tech-debt items weekly before adding new debt
</learned_preferences>
EOF
```

## Output Format

Present suggestions conversationally with clear actions:

```
I analyzed 47 decisions from the past 30 days and found 3 strong patterns
that could become new directives.

**Suggestion 1**: You consistently prefer functional components (6/7 times).
Should I add a directive to always use functional components with hooks?

**Suggestion 2**: You always colocate tests (5/5 times).
Should I add a directive to keep test files next to source files?

**Suggestion 3**: You have 15 unresolved #tech-debt items.
Should I add a directive to review tech-debt weekly?

Which suggestions would you like to accept? (1,2,3 / all / none)
```

## Integration with /pickup

When `/pickup` runs, it can note pending suggestions:

```
💡 SUGGESTED DIRECTIVES AVAILABLE
─────────────────────────────────
3 new directive suggestions based on recent decisions.
Run /suggest-directives to review.
```

## Brain MCP Integration

### Query for Patterns

```javascript
// Get decisions grouped by context/topic
brain_search({
  query: "decision technology library framework",
  limit: 100
})

// Analyze decision outcomes
brain_timeline({
  days: 30,
  limit: 100
})
```

### Log Accepted Directives

```javascript
brain_thought({
  content: "DIRECTIVE ACCEPTED: Always use functional components with hooks",
  type: "insight",
  tags: ["directive-accepted", "self-improvement", "preference:functional-components"]
})
```

## Success Criteria

- ✅ Queries Brain MCP for decision history
- ✅ Detects repeating patterns in decisions
- ✅ Groups similar rationales
- ✅ Generates specific, actionable directives
- ✅ Allows accept/reject/modify workflow
- ✅ Updates CLAUDE.md with accepted directives
- ✅ Logs accepted directives back to Brain MCP

## Notes

- Requires at least 10 decisions for meaningful patterns
- Confidence threshold: only suggest patterns with >70% consistency
- Run monthly for best results
- Directives are additive, not destructive

---

*Part of Claude DX Framework v2.19.0 - Self-Improving AI*
