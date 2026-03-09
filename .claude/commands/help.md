---
category: meta
---

# /help - Contextual Command Help

You are providing contextual help based on the user's current situation.

## Purpose

Show commands relevant to the user's CURRENT context, not just a flat list. Analyze the git state, time of day, and project status to suggest the most useful commands.

## Execution Steps

### Step 1: Gather Context

Run these checks in parallel:
```
1. git status → Current branch, staged/unstaged changes
2. git log -1 → Time since last commit
3. Check current time → Morning? End of day?
4. Check for .ai/work/issue-*.md → Active work logs
```

### Step 2: Analyze Situation

Determine the user's likely situation:

| Context | Situation |
|---------|-----------|
| Morning (6am-10am) + >8hr since last session | Starting the day |
| Uncommitted changes exist | In the middle of work |
| On feature/issue branch + changes done | Ready for PR |
| On main branch | Between tasks |
| Many uncommitted files (>5) | Needs to commit |
| No changes, no active work | Looking for what to do |

### Step 3: Generate Contextual Help

Output format:

```
📍 CURRENT CONTEXT
═══════════════════════════════════════════════

Branch: {branch-name}
Status: {clean/uncommitted changes/staged changes}
{If uncommitted: "Changed: X files (+Y/-Z lines)"}
{If active work log: "Active task: Issue #N"}

🎯 SUGGESTED NOW
────────────────────────────────────────────────

{Show 2-3 commands most relevant to current situation}

• /command — Why this is relevant now
• /command — Why this is relevant now

📋 ALL COMMANDS
────────────────────────────────────────────────

Daily Workflow:
  /pickup        Morning context restoration
  /health        Project health dashboard
  /commit        Intelligent commits with linking
  /code_review   Parallel code analysis

Pull Requests:
  /create_pr     Create PR with smart description
  /pr_review     Review a PR thoroughly
  /pr_merge      Merge with cleanup

Tasks:
  /create_task       Create GitHub issue
  /create_milestone  Create milestone with task breakdown
  /do_task N         Work on issue #N

Automation:
  /yolo N        Autonomous milestone runner
  /yolo status   Check yolo progress
  /yolo resume   Resume after checkpoint

Brain:
  /brain_init    Force Brain initialization
  /refresh       Reload Brain context mid-session

Documentation:
  /adr           Create Architectural Decision Record
  /release       Create release with changelog

💡 TIP: {Contextual tip based on situation}
```

## Contextual Suggestions Logic

### Morning Start (6am-10am, >8hr gap)
```
🎯 SUGGESTED NOW

• /pickup — See what changed overnight and restore context
• /health — Quick overview of project status

💡 TIP: Start your day with /pickup to catch up on changes.
```

### Uncommitted Changes Exist
```
🎯 SUGGESTED NOW

• /commit — Save your {N} changed files
• /code_review — Review changes before committing

💡 TIP: Commit often! Small commits are easier to review and revert.
```

### Many Uncommitted Files (>5)
```
🎯 SUGGESTED NOW

• /commit — You have {N} uncommitted files, consider committing
• /code_review — Review this large changeset first

💡 TIP: Consider splitting into multiple logical commits.
```

### On Feature Branch, Changes Complete
```
🎯 SUGGESTED NOW

• /create_pr — Create a pull request for this branch
• /code_review — Final review before PR

💡 TIP: Run /code_review before /create_pr to catch issues early.
```

### Clean State, No Active Work
```
🎯 SUGGESTED NOW

• /health — See project status and find something to work on
• /do_task N — Pick up an existing issue
• /yolo N — Autonomously work through a milestone

💡 TIP: Check GitHub issues for something to work on.
```

### Milestone with Many Issues
```
🎯 SUGGESTED NOW

• /yolo N — Let Claude autonomously implement all issues in milestone #N
• /yolo status — Check progress on active yolo session

💡 TIP: /yolo pauses every 3 issues for review. Use /yolo resume to continue.
```

### End of Day (5pm-8pm)
```
🎯 SUGGESTED NOW

• /commit — Save any work in progress
• /health — Check if anything needs attention

💡 TIP: Commit WIP changes before ending your day.
```

## Brain Integration

After showing help, remind about Brain resources:

```
📚 DOCUMENTATION (in your Obsidian Brain)
────────────────────────────────────────────────

• [[Docs/Getting Started]] — New to the framework?
• [[Docs/Command Reference]] — Full command details
• [[Docs/Workflow Recipes]] — Common workflows
• [[Docs/Troubleshooting]] — When things go wrong
```

## Argument Handling

```
/help              — Full contextual help (default)
/help {command}    — Detailed help for specific command
/help commands     — Just list all commands
/help workflows    — Show workflow recipes
```

### Specific Command Help

If user asks `/help commit`:
```
📖 /commit — Intelligent Commits
═══════════════════════════════════════════════

Creates smart commits with:
• Automatic type detection (feat, fix, docs, etc.)
• Emoji enhancement
• GitHub issue linking from branch name
• Multi-commit splitting for large changes

Usage:
  /commit              Interactive commit
  /commit "message"    Quick commit with message

Examples:
  /commit                        # Let Claude analyze and suggest
  /commit "add user login"       # Quick commit

See also: [[Docs/Command Reference#commit]]
```

### /help yolo
```
📖 /yolo — Autonomous Milestone Runner
═══════════════════════════════════════════════

Autonomously works through all issues in a GitHub milestone:
• Implements each issue using /do_task
• Creates commits and PRs automatically
• Pauses at checkpoints for review
• Tracks "What Didn't Work" to avoid retry loops

Usage:
  /yolo N              Work through milestone #N
  /yolo N --checkpoint 5   Pause every 5 issues (default: 3)
  /yolo status         Show progress
  /yolo resume         Continue after checkpoint
  /yolo stop           End session

Safeguards:
• Checkpoints every 3 issues (configurable)
• Pauses after 3 consecutive failures
• Max 20 issues per session

State saved to: .ai/work/yolo/active.json

See also: /do_task, /create_milestone
```

## Error Handling

If context gathering fails:
```
📍 CONTEXT (partial)

⚠️ Could not determine full context. Showing all commands.

{Show full command list}
```

---

*Part of LDC AI Framework v2.0.0*
