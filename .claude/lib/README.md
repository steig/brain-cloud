# Claude DX Framework - Library Scripts

These shell scripts provide shared functionality for commands. They're organized by purpose.

## Script Categories

### Core
| Script | Purpose |
|--------|---------|
| `error-handling.sh` | Error logging and recovery functions |
| `config-loader.sh` | Load profile and framework configuration |
| `mcp-detector.sh` | Detect available MCP servers |

### Orchestration
| Script | Purpose |
|--------|---------|
| `parallel-helpers.sh` | Task parallelization via Claude subagents |
| `agent-orchestration.sh` | Multi-agent coordination |
| `genuine-parallel-execution.sh` | Real parallel execution helpers |
| `graceful-degradation.sh` | Fallback when features unavailable |

### Git
| Script | Purpose |
|--------|---------|
| `git-safety-validator.sh` | Prevent dangerous git operations |
| `mcp-git-wrapper.sh` | Safe wrappers for MCP git tools |
| `worktree-manager.sh` | Git worktree management |

### GitHub
| Script | Purpose |
|--------|---------|
| `github-api.sh` | GitHub API helpers (issues, PRs) |
| `github-labels.sh` | Label management automation |

### Security
| Script | Purpose |
|--------|---------|
| `security-utils.sh` | Security validation helpers |
| `security-input-validation-fixed.sh` | Input sanitization |
| `mcp-validation.sh` | Validate MCP tool inputs |

### DX Analytics (v2.5.0)
| Script | Purpose |
|--------|---------|
| `dx-db.sh` | SQLite analytics database operations |
| `dx-metrics.sh` | Command timing and lifecycle tracking |
| `dx-instrumentation.sh` | Auto-instrumentation for sessions |
| `dx-suggestions.sh` | Proactive suggestions engine |
| `dx-test-intel.sh` | Test impact analysis and correlation |
| `dx-model-router.sh` | Multi-model routing and cost tracking |

### Specialized
| Script | Purpose |
|--------|---------|
| `profile-utils.sh` | Project profile configuration |
| `memory-helpers.sh` | MCP memory/knowledge graph |
| `doc-utils.sh` | Documentation generation |
| `test-framework.sh` | Test running and validation |
| `time-tracking.sh` | Session time tracking |
| `work-log-utils.sh` | Work log management |

## Usage

Commands source these scripts as needed:

```bash
source .claude/lib/profile-utils.sh
source .claude/lib/git-safety-validator.sh
```

## Note on Parallel Execution

The "parallel" scripts orchestrate concurrent work through Claude's Task tool subagents, not bash parallelism. This provides better error handling and progress tracking.

## DX Analytics Usage

The DX Analytics libraries provide intelligent assistance through data:

```bash
# Initialize session tracking
source .claude/lib/dx-instrumentation.sh

# View analytics
.claude/lib/dx-db.sh stats

# Get suggestions
.claude/lib/dx-suggestions.sh all commit

# Find affected tests
.claude/lib/dx-test-intel.sh affected HEAD~1

# Check model routing
.claude/lib/dx-model-router.sh recommendations
```

Data is stored in `~/.claude/data/dx.db` (SQLite). See `/stats` command for dashboard.
