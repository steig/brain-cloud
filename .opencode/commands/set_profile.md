---
category: meta
---

You are helping the user manage project-type profiles for the Claude AI Framework. Profiles customize command behavior, test/build commands, quality rules, and workflows for different project types.

## Your Role
Act as a configuration assistant who helps users select and manage the appropriate project profile for their codebase. Each profile is optimized for a specific technology stack and stored in `.claude/config/profile.json`.

## Usage Examples
- `/set_profile` - Show current profile and available options
- `/set_profile generate` - **Analyze project and create custom profile**
- `/set_profile shopify` - Switch to Shopify theme development profile
- `/set_profile react` - Switch to React application profile
- `/set_profile nextjs` - Switch to Next.js full-stack profile
- `/set_profile python` - Switch to Python development profile
- `/set_profile auto` - Auto-detect profile from project files
- `/set_profile info shopify` - Show detailed info about a profile

## Available Profiles

| Profile | Test Command | Build Command | Key Features |
|---------|--------------|---------------|--------------|
| `default` | `npm test` | `npm run build` | General purpose |
| `react` | `npm test` | `npm run build` | Components, hooks, accessibility |
| `nextjs` | `npm test` | `npm run build` | App router, server components, lighthouse |
| `shopify` | `shopify theme check` | `shopify theme package` | Liquid, theme check, accessibility |
| `python` | `pytest` | `python -m build` | Ruff, mypy, docstrings |
| `vanilla-js` | `npm test` | `npm run build` | ESM modules, ESLint |
| `dbt` | `dbt test` | `dbt build` | SQL, Jinja, schema tests, lineage |
| `etl` | `pytest` | `airflow dags test` | Airflow/Prefect, DAGs, idempotency |
| `data-analytics` | `pytest --nbmake` | `jupyter nbconvert` | Jupyter, pandas, visualization |
| `bi` | `spectacles sql` | `spectacles assert` | LookML, semantic layer, dashboards |

## Workflow

### 1. Show Current Status (No Arguments)

When user runs `/set_profile` with no arguments:

```bash
source .claude/lib/profile-utils.sh
print_profile_status
```

Display format:
```
🎯 Profile Manager

Current Profile: Default Profile (default)
Activated: 2024-12-05T10:30:00Z

Available Profiles:
  • default - Base configuration
  • shopify - Shopify Theme Development
  • react - React Application Development
  • nextjs - Next.js Full-Stack Development
  • python - Python Development
  • vanilla-js - Vanilla JavaScript
  • dbt - dbt SQL Transformations
  • etl - ETL/ELT Pipelines
  • data-analytics - Data Analytics & Exploration
  • bi - Business Intelligence

To switch: /set_profile <name>
To auto-detect: /set_profile auto
To see details: /set_profile info <name>
```

### 2. Generate Custom Profile (Recommended)

When user runs `/set_profile generate`:

```bash
source .claude/lib/profile-generator.sh
generate_profile "." ".claude/profiles/project/profile.json"
```

This **analyzes the actual project** and creates a tailored profile:

1. **Parses package.json/pyproject.toml** - Extracts real scripts (test, build, lint, dev)
2. **Detects config files** - TypeScript, ESLint, Prettier, Vitest, Playwright, etc.
3. **Identifies dependencies** - React, Next.js, Vue, Drizzle, Prisma, etc.
4. **Generates custom profile** - Saved to `.claude/profiles/project/profile.json`

Example output:
```
Analyzing project: my-app

Detecting configuration files...
  Found 8 config files
    ✓ typescript
    ✓ eslint
    ✓ prettier
    ✓ vitest
    ✓ playwright
    ✓ tailwind
    ✓ nextjs
    ✓ drizzle

Base profile: nextjs

Detected commands:
  test:   npm test
  build:  npm run build
  lint:   npm run lint
  dev:    npm run dev
  e2e:    npx playwright test
  format: npx prettier --write .

Profile generated: .claude/profiles/project/profile.json
```

The generated profile extends the base profile and overrides with actual project commands.

### 3. Auto-Detect Profile (Simple)

When user runs `/set_profile auto`:

```bash
source .claude/lib/profile-utils.sh
DETECTED=$(auto_detect_profile)
echo "🔍 Detected project type: $DETECTED"
```

Detection logic (picks ONE generic profile):
- `shopify.config.json` or `sections/` + `snippets/` → **shopify**
- `next.config.js` or `next.config.mjs` → **nextjs**
- `package.json` with `"react"` (no next) → **react**
- `requirements.txt` or `pyproject.toml` → **python**
- Otherwise → **default**

**Note:** Use `/set_profile generate` for more accurate, project-specific profiles.

### 4. Switch Profile

When user specifies a profile name:

```bash
source .claude/lib/profile-utils.sh
set_active_profile "$PROFILE_NAME"
```

Display activation summary:
```
✅ Profile Activated: Shopify Theme Development

📋 Configuration Applied:
  • Primary Language: liquid
  • Build Tools: shopify-cli, theme-check
  • Testing: theme-check, lighthouse, axe-core

🔍 Code Review Focus:
  • accessibility
  • performance
  • liquid-best-practices
  • mobile-responsiveness
  • seo

🔒 Security Patterns:
  • xss-in-liquid
  • unsafe-output-tags
  • customer-data-exposure

📝 Commit Scopes:
  section, snippet, template, asset, config, locale, layout

🔧 Available Workflows:
  • dev: shopify theme dev --store ${SHOPIFY_STORE}
  • deploy: shopify theme push --store ${SHOPIFY_STORE}
  • lint: theme-check .

Profile settings stored in .ai/config/active-profile.json
```

### 5. Show Profile Details

When user runs `/set_profile info <name>`:

```bash
source .claude/lib/profile-utils.sh
PROFILE_DATA=$(load_profile "$PROFILE_NAME")
echo "$PROFILE_DATA" | jq '.'
```

Display comprehensive profile information including all configuration sections.

## Profile Configuration Details

### Profile Structure

Each profile is stored as `profile.json` with these sections:

```json
{
  "name": "react",
  "description": "React application development",
  "extends": "default",
  "settings": {
    "test_command": "npm test",
    "build_command": "npm run build",
    "lint_command": "npm run lint",
    "dev_command": "npm run dev",
    "component_dir": "src/components",
    "hooks_dir": "src/hooks"
  },
  "conventions": {
    "branch_prefix": "issue-",
    "commit_style": "conventional",
    "pr_merge_strategy": "squash"
  },
  "quality": {
    "require_tests": true,
    "require_types": true,
    "accessibility_check": true
  }
}
```

### What Profiles Control

1. **Settings** (runtime commands)
   - `test_command` - How to run tests
   - `build_command` - How to build the project
   - `lint_command` - How to lint code
   - `dev_command` - How to start development server
   - Project-specific directories (component_dir, etc.)

2. **Conventions**
   - `branch_prefix` - Git branch naming (e.g., "issue-")
   - `commit_style` - Commit message format
   - `pr_merge_strategy` - How PRs are merged (squash, merge, rebase)

3. **Quality Rules**
   - `require_tests` - Enforce test coverage
   - `require_types` - Enforce TypeScript/type hints
   - `accessibility_check` - Run accessibility audits
   - `lighthouse_check` - Run Lighthouse (Next.js)

### Integration with Sync

Profiles are managed in two places:

1. **Source** (nixos-config): `.claude/profiles/{name}/profile.json`
2. **Target** (synced projects): `.claude/config/profile.json`

When you run `claude-sync`, the profile.json from the selected profile is copied to the target project's config directory.

### How Commands Use Profiles

| Command | Profile Usage |
|---------|---------------|
| `/code_review` | Uses `code_review.focus_areas` and security patterns |
| `/commit` | Uses `commit_conventions.scopes` and emoji map |
| `/do_task` | Uses `workflows` and `file_patterns` |
| `/create_task` | Uses `mcp_preferences` for context |
| `/pr_review` | Uses security and accessibility patterns |

## Profile Utility Functions

The following functions are available via `source .claude/lib/profile-utils.sh`:

```bash
# Get current profile info
get_active_profile          # Returns: "shopify"
get_profile_name            # Returns: "Shopify Theme Development"
get_profile_description     # Returns: "Shopify theme development"

# Quick access functions (most common)
get_test_command            # Returns: "pytest" or "npm test"
get_build_command           # Returns: "npm run build"
get_lint_command            # Returns: "ruff check ."
get_dev_command             # Returns: "npm run dev"
get_branch_prefix           # Returns: "issue-"
get_merge_strategy          # Returns: "squash"

# Quality checks
require_tests               # Returns: true/false
require_types               # Returns: true/false

# Generic profile settings
get_profile_setting '.settings.component_dir'
get_profile_setting '.quality.accessibility_check'

# Auto-detection
auto_detect_profile         # Returns detected profile type

# Profile management
set_active_profile "react"  # Activates profile
print_profile_status        # Shows current status
list_profiles               # Shows all available profiles
```

## Example Scenarios

### Scenario 1: New Shopify Project
```
User: /set_profile auto

Claude: 🔍 Analyzing project structure...

Detected indicators:
  ✓ Found sections/ directory
  ✓ Found snippets/ directory
  ✓ Found config/settings_schema.json

Recommended profile: shopify

Would you like to activate the Shopify profile?
[Yes, activate] [Show details first] [No, keep current]
```

### Scenario 2: Switching for Different Work
```
User: /set_profile react

Claude: ✅ Profile Activated: React Application Development

📋 Configuration Applied:
  • Primary Language: javascript (typescript variant supported)
  • Build Tools: vite, webpack, esbuild
  • Testing: jest, vitest, react-testing-library, cypress

🔍 Code Review Focus:
  • hooks-rules
  • component-composition
  • state-management
  • prop-types
  • accessibility
  • performance

Your /code_review and /commit commands are now optimized for React development.
```

### Scenario 3: Viewing Current Status
```
User: /set_profile

Claude: 🎯 Profile Manager

Current Profile: Next.js Full-Stack Development (nextjs)
Activated: 2024-12-05T14:30:00Z

This profile is optimized for:
  • App Router and Server Components
  • API Routes and Server Actions
  • SEO with Metadata API
  • TypeScript with strict mode

Available Profiles:
  • default - Base configuration
  • shopify - Shopify Theme Development  
  • react - React Application Development
  • nextjs - Next.js Full-Stack Development ← active
  • python - Python Development
  • vanilla-js - Vanilla JavaScript

To switch: /set_profile <name>
```

## Environment Variables

Some profiles require environment variables:

### Shopify Profile
```bash
SHOPIFY_STORE=your-store.myshopify.com  # Required
SHOPIFY_CLI_THEME_TOKEN=xxx              # Required for CI
PREVIEW_URL=https://...                  # Optional
THEME_ID=123456789                       # Optional
```

### Python Profile
```bash
DATABASE_URL=postgresql://...            # Optional
SECRET_KEY=xxx                           # Optional
DEBUG=true                               # Optional
```

When activating a profile with required variables, remind the user to set them if not present.

## Memory Integration

Store profile switches for context:
```javascript
mcp__memory__add_observations([{
  entityName: "project-config",
  contents: [
    "Active profile: shopify",
    "Activated: 2024-12-05",
    "Primary focus: accessibility, performance"
  ]
}])
```

## Troubleshooting

### Profile Not Found
```
❌ Profile not found: angular

Available profiles:
  • default, shopify, react, nextjs, python, vanilla-js
  • dbt, etl, data-analytics, bi

Tip: You can request a new profile by creating an issue.
```

### Auto-Detection Ambiguous
```
⚠️ Multiple project types detected:
  • Found package.json with React
  • Found requirements.txt (Python)

This appears to be a monorepo. Please specify which profile to use:
  /set_profile react   - For frontend development
  /set_profile python  - For backend development
```
