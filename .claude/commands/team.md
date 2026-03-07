<!-- DIRECTIVE: Read .claude/directives/general.md before proceeding -->

# /team - Specialist Team Orchestration

**Assemble and coordinate specialist teams via Agent Teams (Opus 4.6) for parallel implementation and multi-angle review.**

> Requires: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

## Usage

```
/team assemble [composition]     # Start Agent Teams with specialist personas
/team review [--specialists X,Y] # Multi-specialist review pipeline
/team plan <task/issue>          # Collaborative planning with domain experts
/team build <task/issue>         # Parallel implementation by specialist domain
/team audit                      # Full-spectrum audit (security + a11y + perf + arch)
/team status                     # Show active team, tasks, and progress
```

## Argument

$ARGUMENTS

---

## Implementation

Parse `$ARGUMENTS` to determine the subcommand and act accordingly.

### Step 1: Determine Subcommand

Extract the first word from `$ARGUMENTS`:
- `assemble` → Run **Assemble Flow**
- `review` → Run **Review Flow**
- `plan` → Run **Plan Flow**
- `build` → Run **Build Flow**
- `audit` → Run **Audit Flow**
- `status` → Run **Status Flow**
- Empty or `--help` → Show help text below

---

### Assemble Flow

**Goal:** Load the active profile's team composition and prepare specialist context.

1. **Read active profile**: Check `.ai/config/active-profile.json` or detect from project
2. **Load team mapping**: Read the `team.composition` field from the profile
3. **Load team config**: Read `.ai/teams/{composition}.json`
4. **Load specialist personas**: For each specialist in the team config, read `.ai/specialists/{name}.md`
5. **Load profile patterns**: Extract `code_review.security_patterns`, `code_review.performance_patterns`, `code_review.accessibility_patterns` from the active profile and associate with the relevant specialist
6. **Report assembled team**:

Output format:
```
**Team Assembled: {team.name}**

| Specialist | Role | Lead |
|-----------|------|------|
| {name} | {first line of Identity section} | {yes/no} |

Composition: {composition} (from {profile.name})
Specialists: {count}
Lead: {lead specialist}

Ready for: /team review, /team plan, /team build, /team audit
```

If `$ARGUMENTS` includes a specific composition name (e.g., `/team assemble fullstack`), use that instead of the profile default.

---

### Review Flow

**Goal:** Multi-specialist code review where each specialist reviews from their unique angle.

1. **Assemble team** (same as Assemble Flow, silent)
2. **Determine review scope**: Parse remaining args for file paths, PR number, or `--staged`
   - If `--specialists sec,a11y` is specified, limit to those specialists
   - Default: use team config's `review_order`
3. **Gather code to review**: Read the relevant files/diff
4. **For each specialist** (in review_order or specified list):
   a. Load the specialist persona from `.ai/specialists/{name}.md`
   b. Load profile-specific patterns for that specialist domain
   c. Review the code through that specialist's lens using their Review Checklist and Anti-Patterns
   d. Record findings tagged with the specialist role
5. **Merge findings**: The lead specialist consolidates all findings:
   - Group by severity (critical, warning, suggestion)
   - Remove duplicates across specialists
   - Note where specialists agree (reinforced findings)
   - Flag any conflicts between specialist recommendations
6. **Output unified review report**:

```markdown
## Team Review Report

**Scope:** {files/PR reviewed}
**Team:** {composition} ({N} specialists)
**Mode:** {parallel|sequential}

### Critical Issues
- [{specialist}] {finding} ({file}:{line})

### Warnings
- [{specialist}] {finding} ({file}:{line})

### Suggestions
- [{specialist}] {finding} ({file}:{line})

### Cross-Specialist Consensus
- {N} specialists flagged: {shared finding}

### Summary
{lead specialist's synthesis}
```

---

### Plan Flow

**Goal:** Collaborative planning where each specialist contributes domain requirements.

1. **Assemble team** (silent)
2. **Parse task**: Read GitHub issue number, task description, or file reference from args
3. **Lead creates plan structure**: Break the task into areas relevant to each specialist
4. **Each specialist contributes**:
   - Frontend: component design, state management needs, UX considerations
   - Backend: API design, data model changes, service layer impacts
   - Security: threat model, auth requirements, input validation needs
   - Accessibility: WCAG requirements, keyboard nav, screen reader considerations
   - Performance: performance budget, caching strategy, optimization opportunities
   - DX: API ergonomics, error handling, documentation needs
   - QA: test strategy, edge cases, regression risks
   - Architect: system impact, dependency analysis, migration concerns
5. **Lead synthesizes** into a unified implementation plan:

```markdown
## Team Plan: {task title}

### Overview
{lead's synthesis of the task}

### Domain Requirements

#### Frontend
{frontend specialist's requirements}

#### Backend
{backend specialist's requirements}

#### Security
{security specialist's requirements}

...

### Implementation Order
1. {first step} (assigned: {specialist})
2. {second step} (assigned: {specialist})
...

### Risk Assessment
- {risk from specialist analysis}

### Definition of Done
- [ ] {criteria from each specialist}
```

---

### Build Flow

**Goal:** Parallel implementation with specialists working on their domain.

1. **Assemble team** (silent)
2. **Parse task**: Read GitHub issue or task description from args
3. **Lead decomposes task**: Based on team config's `parallel_build` mapping, create subtasks:
   - Each subtask is tagged with a specialist
   - Dependencies between subtasks are identified
   - Cross-cutting concerns are noted
4. **Create shared task list**: Use TaskCreate for each subtask
5. **Coordinate execution**:
   - Independent tasks run in parallel (via Task tool with multiple agents)
   - Dependent tasks are marked with blockedBy
   - Cross-cutting concerns get joint specialist review
6. **Lead monitors**: Track progress, resolve blockers, ensure integration
7. **Integration phase**: After all subtasks complete, lead verifies everything works together

Output: Progress updates as tasks complete, final integration report.

---

### Audit Flow

**Goal:** Full-spectrum audit across all specialist domains.

1. **Assemble team with audit specialists**: security, accessibility, performance, architect
2. **Determine audit scope**: Entire project or specific directories
3. **Run each specialist audit in parallel**:
   - **Security**: OWASP top 10 scan, secrets detection, auth audit
   - **Accessibility**: WCAG 2.1 AA compliance check, ARIA audit
   - **Performance**: Bundle analysis, query optimization review, caching audit
   - **Architecture**: Dependency audit, pattern compliance, tech debt assessment
4. **Merge into audit report**:

```markdown
## Full-Spectrum Audit Report

**Project:** {project name}
**Profile:** {active profile}
**Date:** {timestamp}

### Security Audit
**Score:** {pass/warn/fail}
{security findings}

### Accessibility Audit
**Score:** {pass/warn/fail}
{accessibility findings}

### Performance Audit
**Score:** {pass/warn/fail}
{performance findings}

### Architecture Audit
**Score:** {pass/warn/fail}
{architecture findings}

### Priority Actions
1. [CRITICAL] {highest priority finding}
2. [HIGH] {next priority}
...

### Overall Health: {healthy/needs-attention/at-risk}
```

---

### Status Flow

**Goal:** Show the current team state and task progress.

1. Read the current task list (TaskList)
2. Show active team composition
3. Display task progress by specialist
4. Show any blockers

```markdown
## Team Status

**Composition:** {team name}
**Active Since:** {timestamp}

| Specialist | Tasks | Done | In Progress | Blocked |
|-----------|-------|------|-------------|---------|
| {name} | {n} | {n} | {n} | {n} |

### Current Work
{in-progress task details}

### Blockers
{blocked tasks with reasons}
```

---

## Error Recovery

### Missing Specialist Persona

If `.ai/specialists/{name}.md` does not exist for a referenced specialist:
- **Assemble/Status**: Report the missing file and list available specialists. Do not assemble a partial team.
- **Review/Plan/Build/Audit**: Abort with a clear message naming the missing file and suggesting `ls .ai/specialists/` to see what's available.

### Invalid Composition Reference

If the profile's `team.composition` references a non-existent `.ai/teams/{name}.json`:
- Report the invalid composition name and list available compositions from `.ai/teams/`.
- Suggest running `/team assemble {valid-name}` with an explicit override.

### Invalid Specialist Names in `--specialists`

If `/team review --specialists foo,bar` includes names that don't match any `.ai/specialists/*.md`:
- Report each invalid name.
- List valid specialist names.
- Do not proceed with a partial set — require the user to correct the input.

### No Active Profile

If no profile is set and no composition is specified:
- Prompt the user to either set a profile (`/set_profile {name}`) or specify a composition explicitly (`/team assemble {type}`).

### GitHub Issue Not Found

If `/team plan #123` or `/team build #123` references a GitHub issue that doesn't exist or can't be fetched:
- Report the failed lookup with the `gh` error message.
- Suggest verifying the issue number or providing a task description directly instead (e.g., `/team plan "Add user auth"`).

### Agent Teams Not Enabled

If `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is not set:
- All subcommands still work in single-agent mode (specialists run sequentially, not in parallel).
- Report that parallel execution is unavailable and suggest enabling the flag for full team coordination.

---

## Help Text

If no subcommand or `--help`:

```
/team - Specialist Team Orchestration

Assemble project-appropriate specialist teams and coordinate them
via Agent Teams for parallel implementation and multi-angle review.

Subcommands:
  assemble [type]              Assemble team (auto-detects from profile)
  review [--specialists X,Y]   Multi-specialist code review
  plan <task>                  Collaborative planning by domain
  build <task>                 Parallel implementation by specialist
  audit                        Full security + a11y + perf + arch audit
  status                       Show team and task progress

Team compositions: web-app, api-service, fullstack, cli-tool, infrastructure, data-pipeline
Specialists: frontend, backend, security, accessibility, dx, performance, qa, architect

Examples:
  /team assemble                    # Auto-detect from active profile
  /team assemble fullstack          # Override with specific composition
  /team review --staged             # Review staged changes
  /team review --specialists sec    # Security-only review
  /team plan "Add user auth"        # Plan implementation with team
  /team build #123                  # Build GitHub issue in parallel
  /team audit                       # Full project audit
```

---

## Team Report Delivery

When using Agent Teams for parallel execution, teammates must write reports to files to prevent message delivery loss:

1. Each teammate writes their full report to `.ai/analysis/.tmp/{specialist-name}.md`
2. Each teammate sends a brief confirmation to the lead via SendMessage (do NOT rely on SendMessage alone for report content)
3. Lead waits for all tasks to complete (TaskList)
4. Lead reads report files from `.ai/analysis/.tmp/`
5. Lead synthesizes into the unified report
6. Lead deletes `.ai/analysis/.tmp/` directory after synthesis

This pattern applies to: review, plan, build, and audit flows when running with Agent Teams.

---

## Profile-to-Team Reference

| Profile | Composition | Lead |
|---------|------------|------|
| react, vue, html, bootstrap, tabler, vanilla-js | web-app | frontend |
| shopify | web-app | frontend (+performance) |
| nextjs, remix | fullstack | frontend |
| shopify-app, magento-1.9 | fullstack | backend |
| django, python, mysql, postgres | api-service | backend |
| aws, terraform | infrastructure | architect |
| windmill | data-pipeline | backend |
| framework | cli-tool | dx |

---

## Key Files

| Resource | Location |
|----------|----------|
| Specialist personas | `.ai/specialists/{name}.md` |
| Team compositions | `.ai/teams/{type}.json` |
| Profile team mapping | `{profile}/profile.json` → `team` field |
| Project settings | `.ai/config/project-settings-schema.json` → `teams` |

---

**Version**: 1.0.0 | **Framework**: Claude DX Framework v2.23.0
