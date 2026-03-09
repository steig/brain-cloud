---
category: meta
---

# /onboard - New User Onboarding

You are guiding a new user through their first experience with the LDC AI Framework.

## Purpose

Provide a welcoming, guided introduction that:
- Sets up their Brain MCP profile
- Introduces the most important commands
- Gets them productive quickly
- Doesn't overwhelm with information

## When to Use

- First time using the framework
- New team member joining a project
- Want a refresher on the basics
- Setting up on a new machine

## Execution Flow

### Step 1: Welcome

```
👋 WELCOME TO LDC AI FRAMEWORK
═══════════════════════════════════════════════

I'm Claude, and I'll help you get set up in about 2 minutes.

This framework gives you:
✨ Smart commands for commits, PRs, and code review
🧠 Persistent memory that survives between sessions
📚 Documentation that grows as you work
🤝 Team knowledge sharing

Let's get you started!
```

### Step 2: Check/Create Developer Profile

Check if Brain MCP is available and if Developer Profile exists:

```
IF Brain MCP available:
  → Check for existing user profile
  → IF exists: "Found your profile! Loading preferences..."
  → IF not exists: "Let me create your Developer Profile..."

IF Brain MCP not available:
  → "⚠️ Brain MCP not detected. Some features won't be available."
  → "See README.md for Brain MCP setup instructions"
  → Continue with limited onboarding
```

### Step 3: Profile Setup (if new)

If creating a new profile, gather basic info:

```
📝 SETTING UP YOUR PROFILE
────────────────────────────────────────────────

I'll create your Developer Profile in Brain MCP. This helps me:
• Remember your preferences across sessions
• Adapt to how you like to work
• Provide better suggestions

A few quick questions (or skip to use defaults):

1. What name should I use?
   Default: {detected from git config}

2. What's your preferred communication style?
   • Detailed explanations
   • Brief and to the point
   • Somewhere in between

3. Any technologies you work with most?
   (e.g., React, Python, TypeScript, Shopify)
```

Create profile with gathered or default info.

### Step 4: Introduce Key Commands

```
🎯 THE 3 COMMANDS YOU'LL USE MOST
────────────────────────────────────────────────

1️⃣  /pickup — Start Your Day
    Shows what changed overnight, restores context.
    Use it every morning!

2️⃣  /commit — Save Your Work
    Creates smart commits with issue linking and emojis.
    Way better than "git commit -m"!

3️⃣  /help — Get Contextual Help
    Shows commands relevant to your current situation.
    When in doubt, /help!

These three will cover 80% of your daily workflow.
```

### Step 5: Quick Brain Tour

```
🧠 YOUR BRAIN MCP
────────────────────────────────────────────────

Your Brain MCP remembers everything:

📂 What it tracks:
• Thoughts       ← Observations and insights
• Decisions      ← Choices and rationale
• Sessions       ← Work sessions and context
• Sentiments     ← How things are going
• DX Events      ← Developer experience metrics

I automatically:
• Start sessions when you begin working
• Log decisions and learnings
• Track patterns in your workflow

You don't need to do anything — just work naturally!
```

### Step 6: Try It Now

```
🚀 LET'S TRY IT!
────────────────────────────────────────────────

Run this command to see your project status:

  /health

This shows:
• Current branch and git status
• Recent commits
• Any open work

Go ahead, try it now!
```

### Step 7: Wrap Up

```
✅ YOU'RE ALL SET!
═══════════════════════════════════════════════

Quick reference:
• /pickup    — Morning catch-up
• /commit    — Smart commits
• /help      — Contextual help
• /health    — Project overview

📚 More resources in your Brain:
• [[Docs/Getting Started]]
• [[Docs/Command Reference]]
• [[Docs/Workflow Recipes]]

💡 Pro tip: Start tomorrow with /pickup to see how the
   Brain remembers your context across sessions.

Happy coding! 🎉
```

## Profile Creation

If creating new Developer Profile:

```markdown
---
type: profile
created: {date}
tags: [meta, developer-profile]
---

# 👤 Developer Profile: {Name}

> Your preferences and patterns, learned over time.

## Quick Facts

| Aspect | Detail |
|--------|--------|
| **Name** | {name} |
| **Style** | {communication preference} |
| **Tech focus** | {technologies} |

## Communication Preferences

{Based on their answer or defaults}

## Learned Preferences

*Claude will add preferences here as we work together.*

## Session History

*Sessions will be linked here over time.*

---

*This profile grows as we work together.*
```

## Argument Handling

```
/onboard           — Full guided onboarding
/onboard quick     — Abbreviated version (skip questions)
/onboard reset     — Reset profile and start fresh
```

### Quick Mode

Skip the questions, use defaults:

```
👋 Quick Setup
═══════════════════════════════════════════════

✅ Brain connected
✅ Profile loaded (using existing or defaults)

Key commands: /pickup, /commit, /help

Run /help to see what's relevant now.
Done! 🎉
```

## Error Handling

```
IF git not initialized:
  → "This doesn't appear to be a git repository."
  → "Run 'git init' first, then try /onboard again."

IF framework not installed:
  → "Framework files not found."
  → "Make sure .claude/commands/ exists in your project."

IF Brain MCP unavailable:
  → Continue with limited features
  → Note which features won't work
```

---

*Part of LDC AI Framework v2.0.0*
