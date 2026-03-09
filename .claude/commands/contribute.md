---
category: knowledge
---

# /contribute - Add to Team Knowledge

You are helping the user contribute knowledge to the team knowledge base.

## Purpose

Make it easy to add patterns, gotchas, and learnings to `.ai/team/` so the whole team benefits from individual discoveries.

## Usage

```
/contribute "Pattern: Retry with exponential backoff"
/contribute "Gotcha: useEffect cleanup timing"
/contribute                                          # Interactive mode
```

## Execution Flow

### Step 1: Determine Contribution Type

If type provided in argument:
```
/contribute "Pattern: X" → Pattern
/contribute "Gotcha: Y" → Gotcha
/contribute "Standard: Z" → Standard
```

If not provided, ask:
```
📝 CONTRIBUTE TO TEAM KNOWLEDGE
═══════════════════════════════════════════════

What would you like to add?

1. 🔧 Pattern — A reusable solution
2. ⚠️ Gotcha — A tricky problem and its fix
3. 📋 Standard — A team convention
4. 📖 Other — Something else

Select type (1-4):
```

### Step 2: Gather Information

Based on type, gather details:

**For Pattern:**
```
📝 NEW PATTERN
────────────────────────────────────────────────

Title: {from argument or ask}

A few questions to document this pattern:

1. What problem does it solve?
2. What's the solution approach?
3. Can you share a code example?
4. When should this be used?
5. When should it NOT be used?
```

**For Gotcha:**
```
⚠️ NEW GOTCHA
────────────────────────────────────────────────

Title: {from argument or ask}

Help me document this gotcha:

1. What was the problem?
2. Why does it happen?
3. What's the fix?
4. How can others avoid it?
```

**For Standard:**
```
📋 NEW STANDARD
────────────────────────────────────────────────

Title: {from argument or ask}

Let's define this standard:

1. What's the purpose?
2. What's the rule?
3. Can you show good/bad examples?
4. Are there exceptions?
```

### Step 3: Generate File Content

Create appropriate markdown file:

**Pattern Template:**
```markdown
# Pattern: {Title}

> {One-line summary}

---

## Problem

{What problem does this solve?}

## Solution

{How to implement it}

## Code Example

```{language}
{Example code}
```

## When to Use

- {Use case 1}
- {Use case 2}

## When NOT to Use

- {Anti-use case}

## Related

- {Links to related patterns/gotchas}

---

*Contributed by: {author}*
*Date: {date}*
```

**Gotcha Template:**
```markdown
# Gotcha: {Title}

> {One-line summary of the trap}

---

## The Problem

{What went wrong?}

## Why It Happens

{Root cause explanation}

## The Fix

{How to solve it}

```{language}
// Bad
{bad code}

// Good
{good code}
```

## Prevention

{How to avoid hitting this in the future}

## Related

- {Links}

---

*Discovered by: {author}*
*Date: {date}*
```

### Step 4: Create the File

```
Determine filename:
- Pattern: .ai/team/patterns/{kebab-case-title}.md
- Gotcha: .ai/team/gotchas/{kebab-case-title}.md
- Standard: .ai/team/standards/{kebab-case-title}.md

Create the file with content.
```

### Step 5: Offer PR or Direct Commit

```
✅ FILE CREATED
═══════════════════════════════════════════════

Created: .ai/team/patterns/retry-exponential-backoff.md

How would you like to save this?

1. 📝 Create a PR for team review (recommended)
2. ✅ Commit directly to current branch
3. 📋 Just create the file, I'll handle git

Select (1-3):
```

**If PR selected:**
```
Creating PR...

✅ PR Created: #123
   Title: "docs(team): add retry with backoff pattern"
   URL: https://github.com/...

Team members can review before merging.
```

**If direct commit:**
```
Committing...

✅ Committed: abc123
   "📚 docs(team): add retry with backoff pattern"

Note: Consider having team review significant additions.
```

### Step 6: Also Add to Personal Brain?

```
💡 ALSO ADD TO YOUR BRAIN?
────────────────────────────────────────────────

Want me to also add this to your personal Obsidian Brain?
This creates a linked copy in Patterns/ or Gotchas/.

[Yes] [No]
```

If yes, create corresponding note in Obsidian Brain with link to team version.

## Quick Mode

For rapid contribution:

```
/contribute quick "Gotcha: Always await async in useEffect cleanup"
```

Skips questions, creates minimal entry:

```markdown
# Gotcha: Always await async in useEffect cleanup

> Quick note - expand with details when time permits.

## The Problem

{Title describes it}

## The Fix

{To be documented}

---

*Quick contribution by: {author}*
*Date: {date}*
*Status: Needs expansion*
```

## Argument Handling

```
/contribute                              # Interactive mode
/contribute "Title"                      # Ask for type
/contribute "Pattern: Title"             # Pattern mode
/contribute "Gotcha: Title"              # Gotcha mode
/contribute quick "Type: Title"          # Quick mode
/contribute from-session                 # Extract from current session
```

## From Session Mode

Analyze current session for contribution opportunities:

```
/contribute from-session

🔍 ANALYZING SESSION
═══════════════════════════════════════════════

I found some things that might be worth sharing:

1. Pattern: API response caching
   → You implemented a caching layer for API calls

2. Gotcha: Race condition in form submit
   → You debugged a tricky race condition

3. Learning: TypeScript generics for forms
   → You figured out a clean generic approach

Would you like to contribute any of these? (1/2/3/all/none)
```

## Error Handling

```
IF .ai/team/ doesn't exist:
  → "Team knowledge folder not found. Creating..."
  → Create the structure

IF file already exists:
  → "A {type} with this name already exists."
  → "Would you like to update it or choose a different name?"

IF git not available:
  → Create file only
  → Skip PR/commit options
```

---

*Part of LDC AI Framework v2.0.0 — Team Knowledge System*
