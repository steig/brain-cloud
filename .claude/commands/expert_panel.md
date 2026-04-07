You are running an Expert Panel Review — a structured evaluation with iterative improvement for any deliverable.

## Arguments

```
$ARGUMENTS
```

Parse arguments:
- `--evaluate-only` — Score and report without modifying anything
- `--max-iterations N` — Override iteration cap (default: 3)
- `staged` — Evaluate staged changes only
- `src/path/` or `file.ext` — Evaluate specific file or directory
- No args — Evaluate all uncommitted changes

## Phase 1 — Deliverable Analysis & Expert Selection

### 1.1 Determine Target

Identify what to evaluate based on arguments:

**For code/config targets (no args / `staged` / path):**
- Run `git diff --stat` or `git diff --cached --stat` for staged
- Read changed files to understand: languages, patterns, imports, module structure

**For documentation targets (path to .md files):**
- Read the file(s) to understand: topic, audience, format, purpose

### 1.2 Select Expert Panel

Load expert pool from `.ai/config/expert-pool.json`.

Selection algorithm:
1. Score each expert by counting trigger pattern matches against analyzed content
2. Filter to experts whose `deliverable_types` include the detected type
3. Cap at **3 per domain** for diversity
4. **Mandatory**: at least 1 expert tagged `"role": "quality"` AND at least 1 tagged `"role": "perspective"`
5. Fill panel to **8 experts** by highest trigger score (minimum 4 if fewer match)
6. Display the selected panel with names, titles, and domains

## Phase 2 — Expert Evaluation

Role-play each expert sequentially. For each expert, produce this exact structure:

```markdown
### Expert N: [Name] — [Title] (Score: XX/100)

**Strengths:**
- [Specific positive with location reference]
- [Another strength]

**Deductions (Y points):**
1. [-N] [file:line or section] — [Issue]. Fix: [concrete recommendation].
2. [-N] [file:line or section] — [Issue]. Fix: [concrete recommendation].

**To reach 100:**
- [Aspirational improvement beyond the deductions]
```

### Evaluation Rules

- Point deductions MUST sum to exactly `100 - score`
- Every deduction has a **specific location reference** (file:line for code, section/heading for docs)
- Every deduction has a **concrete fix**, not vague "could be better"
- Each expert evaluates from their specialty lens

### Score Calibration

**Calibrate harshly.** A score of 90 means a specialist in this domain would approve with no blocking feedback.

| Score | Meaning |
|-------|---------|
| 95-100 | World-class specialist ships unchanged |
| 90-94 | Senior specialist approves for production |
| 80-89 | Solid, 2-3 things to fix before approving |
| 70-79 | Functional, missing standard patterns |
| < 70 | Fundamental rethink needed |

## Phase 3 — Scoring & Decision

Calculate the **average score** across all experts.

**Decision tree:**
- **Average >= 90**: Proceed to Phase 5 (success report)
- **Average < 90 + `--evaluate-only`**: Proceed to Phase 5 (feedback report, no modifications)
- **Average < 90 + auto-improve**: Proceed to Phase 4
- **Escape valves** (skip Phase 4, go to Phase 5 with explanation):
  - Max iterations reached (default 3, or `--max-iterations` value)
  - Diminishing returns: < 3 point improvement between consecutive rounds
  - Any expert scored < 50: flag "fundamental rethink needed" — don't iterate, exit early

## Phase 4 — Iterative Improvement (auto-improve mode only)

1. **Collect** all deductions from experts who scored < 90
2. **Prioritize** by:
   - Point impact (descending — biggest deductions first)
   - Cross-expert consensus (multiple experts flagging the same area ranks higher)
3. **Apply improvements** to the deliverable using Edit tools
4. **Re-evaluate** with the same expert panel (full fresh analysis)
5. **Loop** back to Phase 3

**Important**: Each re-evaluation is a fresh holistic review. Fixes can introduce new issues.

## Phase 5 — Final Report

Output this report format:

```markdown
# Expert Panel Review

## Panel
| # | Expert | Domain | R1 | R2 | R3 | Final |
|---|--------|--------|----|----|-----|-------|
| 1 | [Name] — [Title] | [Domain] | [score] | [score] | — | [final] |

**Average: XX/100** — [PASSED/FAILED] (threshold: 90)
**Iterations: N** | **Improvements applied: N**

## Score Progression
Round 1: XX avg -> Round 2: XX avg (+N) -> ...

## Key Improvements Applied
- [Change description with file:line reference]

## Remaining Recommendations (aspirational, not blocking)
- [Items from "To reach 100" sections that weren't addressed]
```

If `--evaluate-only`, omit "Improvements Applied" section and note "Evaluate-only mode — no modifications made."

## Edge Cases

- **No changes detected**: Ask user to specify a target file or directory
- **Single file**: Still select 4-8 relevant experts
- **< 4 expert matches**: Reduce panel to matched count (minimum 3), note reduced panel in report
- **Mixed deliverable** (code + docs): Select experts from both pools, note the mixed nature
