---
category: meta
---

# /sync - AI Framework Project Sync

**Sync the AI framework to projects and manage registered projects.**

## Usage
- `/sync` - Sync framework to all registered projects
- `/sync --init` - Initialize current folder as a framework project
- `/sync --init --profile shopify` - Initialize with specific profile
- `/sync --init --mode symlink` - Initialize with symlink mode (no git tracking)
- `/sync --init --mode copy` - Initialize with copy mode (default)
- `/sync --status` - Show status of all registered projects
- `/sync --register` - Register current project (if .claude exists)
- `/sync --unregister` - Remove current project from registry
- `/sync --diff` - Show what would change without syncing

## Sync Modes

| Mode | Best For | Git Tracking | Updates |
|------|----------|--------------|---------|
| `copy` | VMs, CI, shared repos | Files committed | Requires re-sync |
| `symlink` | Local development | `.claude/` gitignored | Instant |

## How It Works

The nixos-config repository is the **source of truth** for the AI framework. This command syncs that framework to other projects on your machine.

### Copy Mode (default)
```
nixos-config/.claude/     ← SOURCE (committed to git)
        │
        ├──rsync──→ ~/code/project-a/.claude/  (files copied)
        ├──rsync──→ ~/code/project-b/.claude/  (files copied)
        └──rsync──→ ~/code/project-c/.claude/  (files copied)
```

### Symlink Mode
```
nixos-config/.claude/     ← SOURCE (committed to git)
        │
        ├──symlink──→ ~/code/project-a/.claude/commands → nixos-config
        ├──symlink──→ ~/code/project-b/.claude/lib → nixos-config
        └──symlink──→ ~/code/project-c/.claude/* → nixos-config
```

With symlink mode, each project's `.claude/` contains symlinks pointing back to your framework source. Changes to the source are immediately available in all projects.

## Interactive Workflow

### Initializing a New Project

When you run `/sync --init` in a project folder:

```
📁 **Current directory:** ~/code/my-old-project

🔍 **Checking project...**
   Git repo: ✅ Yes
   Existing .claude: ❌ No

📋 **Select profile for this project:**

1. default     - General purpose, all features
2. shopify     - Shopify theme development
3. react       - React application
4. nextjs      - Next.js full-stack
5. python      - Python development
6. vanilla-js  - Plain JavaScript

Select profile (1-6) [1]:

✅ **Framework initialized!**
   Version: 2.1.0
   Profile: react
   Commands: 33 available

   Try: /help to see available commands
```

### Syncing All Projects

When you run `/sync`:

```
🔄 **Syncing AI Framework v2.1.0**

📊 **Registered Projects:**

┌─────────────────────────────────┬─────────┬──────────┬────────────┐
│ Project                         │ Profile │ Version  │ Status     │
├─────────────────────────────────┼─────────┼──────────┼────────────┤
│ ~/code/shopify-theme            │ shopify │ 2.1.0    │ ✅ Current │
│ ~/code/react-dashboard          │ react   │ 2.0.0    │ ⚠️ Outdated│
│ ~/code/api-service              │ python  │ 2.1.0    │ ✅ Current │
└─────────────────────────────────┴─────────┴──────────┴────────────┘

Sync outdated projects? (Y/n):

🔄 Syncing ~/code/react-dashboard...
   ✅ 33 commands synced
   ✅ 15 libraries synced
   ✅ Version updated: 2.0.0 → 2.1.0

✅ **All projects synced!**
```

### Checking Status

When you run `/sync --status`:

```
📊 **Framework Sync Status**

**Source:** ~/code/nixos-config/.claude
**Version:** 2.1.0

**Registered Projects: 3**

1. ~/code/shopify-theme
   Profile: shopify
   Version: 2.1.0 ✅
   Last sync: 2 hours ago

2. ~/code/react-dashboard
   Profile: react
   Version: 2.0.0 ⚠️ (outdated)
   Last sync: 3 days ago

3. ~/code/api-service
   Profile: python
   Version: 2.1.0 ✅
   Last sync: 1 day ago

Run `/sync` to update outdated projects.
```

## Implementation

### Registry Location

The registry is stored at `~/.config/claude-framework/registry.json`:

```json
{
  "source": "~/code/nixos-config/.claude",
  "projects": [
    {
      "path": "~/code/shopify-theme",
      "profiles": ["shopify"],
      "sync_mode": "copy",
      "last_sync": "2024-01-15T10:30:00Z",
      "version": "2.1.0"
    },
    {
      "path": "~/code/react-app",
      "profiles": ["react", "python"],
      "sync_mode": "symlink",
      "last_sync": "2024-01-16T09:00:00Z",
      "version": "2.5.0"
    }
  ]
}
```

The `sync_mode` can be `"copy"` (files copied via rsync) or `"symlink"` (directories symlinked to source).

### What Gets Synced

| Directory/File | Synced? | Notes |
|---------------|---------|-------|
| `commands/` | ✅ Yes | All framework commands |
| `lib/` | ✅ Yes | Shared libraries |
| `templates/` | ✅ Yes | Document templates |
| `scripts/` | ✅ Yes | Utility scripts |
| `hooks/` | ✅ Yes | Git hooks |
| `mcp/` | ✅ Yes | MCP configurations |
| `VERSION` | ✅ Yes | Framework version |
| `CLAUDE.md` | ✅ Yes | Framework instructions |
| `settings.suggested.json` | ✅ Yes | Suggested settings |
| `config/profile.json` | ✅ Yes | **Profile-specific** - from selected profile |
| `settings.local.json` | ⚡ Partial | **StatusLine injected** - other settings preserved |
| `sync/` | ❌ No | Sync infrastructure (source only) |
| `profiles/` | ❌ No | Source profiles (source only) |
| `.framework-version` | Created | Version tracking file |

## Profile System

Each profile contains a `profile.json` that configures project-specific settings:

```json
{
  "name": "react",
  "description": "React application development",
  "settings": {
    "test_command": "npm test",
    "build_command": "npm run build",
    "lint_command": "npm run lint",
    "dev_command": "npm run dev"
  },
  "conventions": {
    "branch_prefix": "issue-",
    "pr_merge_strategy": "squash"
  },
  "quality": {
    "require_tests": true,
    "require_types": true
  }
}
```

### Available Profiles

**Projects can use multiple profiles** - they get merged together (later profiles override earlier ones).

| Profile | Test Command | Build Command | Key Features |
|---------|--------------|---------------|--------------|
| `default` | `npm test` | `npm run build` | General purpose |
| `react` | `npm test` | `npm run build` | Components, hooks, accessibility |
| `nextjs` | `npm test` | `npm run build` | App router, server components |
| `shopify` | `shopify theme check` | `shopify theme package` | Liquid, theme check |
| `python` | `pytest` | `python -m build` | Ruff, mypy, docstrings |
| `vanilla-js` | `npm test` | `npm run build` | ESM, ESLint |
| `nixos` | `nix flake check` | `nix build` | Statix, alejandra, nix-darwin |
| `shell` | `shellcheck **/*.sh` | - | Shellcheck, shfmt |
| `meta` | `npm test` | `npm run build` | Framework development, docs |

### Using Profile Settings

Commands can read profile settings at runtime:

```bash
source .claude/lib/profile-utils.sh

get_test_command    # → "pytest" or "npm test"
get_build_command   # → "npm run build"
get_branch_prefix   # → "issue-"
require_tests       # → true/false
```

### Sync Modes

**Copy Mode (default):**
- Uses rsync to copy all framework files
- Files committed to project repo
- Requires re-sync to get updates
- Best for: VMs, CI/CD, shared repos

**Symlink Mode:**
- Creates symlinks to framework source
- `.claude/` gitignored in projects
- Changes to source immediately available
- Best for: Local development, per-developer customizations

```bash
# Initialize with symlink mode
claude-sync --init --mode symlink --profile react

# Add to .gitignore
echo ".claude/" >> .gitignore
```

**What's symlinked vs. real files:**

| Symlinked (framework) | Real Files (project-specific) |
|-----------------------|-------------------------------|
| `commands/`, `lib/` | `config/profile.json` |
| `templates/`, `scripts/` | `settings.local.json` |
| `hooks/`, `mcp/` | `.framework-version` |
| `CLAUDE.md`, `VERSION` | |

### Project-Specific Files

These files are preserved during sync (with exceptions noted):

```
.claude/
├── settings.local.json     # Preserved, but statusLine is auto-injected
├── .framework-version      # Version tracking (updated on sync)
└── project/                # Project-specific customizations (never touched)
    ├── commands/           # Project-only commands (auto-linked to commands/)
    └── config.json         # Project configuration
```

### Project-Specific Commands

Put your project's custom commands in `.claude/project/commands/`:

```bash
# Create a project-specific command
mkdir -p .claude/project/commands
cat > .claude/project/commands/deploy.md << 'EOF'
# /deploy - Deploy this project

Deploy the application to production.

## Steps
1. Run tests
2. Build the project
3. Deploy to server
EOF
```

During sync, these are automatically symlinked into `.claude/commands/` so Claude Code can find them. Project commands:
- Are **never deleted** by sync (they live in `project/commands/`)
- Can **override** framework commands (same filename = project wins)
- Work in both copy and symlink modes

### Global StatusLine

The sync automatically injects the Claude Code statusLine configuration into every project's `settings.local.json`. This ensures the status bar appears globally across all synced projects without manual configuration.

## Shell Script Usage

You can also use the sync script directly from the shell:

```bash
# Sync all projects
claude-sync

# Initialize current directory (copy mode, default)
claude-sync --init

# Initialize with profile
claude-sync --init --profile react

# Initialize with symlink mode (no git tracking)
claude-sync --init --mode symlink

# Initialize with both profile and mode
claude-sync --init --profile react --mode symlink

# Check status
claude-sync --status

# Sync specific project
claude-sync ~/code/my-project
```

## AskUserQuestion Integration

### Profile Selection
```
AskUserQuestion:
  question: "Which profile should this project use?"
  header: "Profile"
  options:
    - label: "default"
      description: "General purpose with all features"
    - label: "shopify"
      description: "Shopify theme development (Liquid, sections)"
    - label: "react"
      description: "React application (hooks, components)"
    - label: "nextjs"
      description: "Next.js full-stack (app router, API routes)"
```

### Sync Confirmation
```
AskUserQuestion:
  question: "Sync 2 outdated projects?"
  header: "Sync"
  options:
    - label: "Yes, sync all"
      description: "Update all outdated projects to v2.1.0"
    - label: "Select projects"
      description: "Choose which projects to sync"
    - label: "Skip"
      description: "Don't sync now"
```

## Error Handling

### Not in a Git Repository
```
⚠️ **Warning:** Current directory is not a git repository.

The AI framework works best with git-tracked projects.

Options:
1. Initialize git: `git init`
2. Continue anyway (not recommended)
3. Cancel

Select (1-3):
```

### Project Already Initialized
```
ℹ️ **Project already has .claude directory**

Current version: 2.0.0
Source version: 2.1.0

Options:
1. Update to latest (sync)
2. Re-initialize (overwrites customizations)
3. Cancel

Select (1-3):
```

### Source Not Found
```
❌ **Framework source not found**

Expected: ~/code/nixos-config/.claude
Status: Directory does not exist

Please ensure nixos-config is cloned and .claude directory exists.
```

## Nix Integration

Add to `modules/shared/home-manager.nix` for auto-sync on rebuild:

```nix
# Shell alias for easy access
programs.zsh.shellAliases = {
  claude-sync = "~/.config/claude-framework/sync.sh";
};

# Auto-sync on rebuild (optional)
home.activation.syncClaudeFramework = lib.hm.dag.entryAfter ["writeBoundary"] ''
  if [ -f ~/.config/claude-framework/sync.sh ]; then
    $DRY_RUN_CMD ~/.config/claude-framework/sync.sh --quiet
  fi
'';
```

## Success Criteria

- ✅ Initialize any folder as a framework project
- ✅ Sync framework updates to all registered projects
- ✅ Track versions and show outdated projects
- ✅ Preserve project-specific configurations
- ✅ Support copy and symlink modes
- ✅ Symlink mode for per-developer customizations
- ✅ Interactive profile selection
- ✅ Shell script for non-Claude usage

---

**Framework Version:** See `.claude/VERSION`
