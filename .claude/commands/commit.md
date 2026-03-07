---
category: daily
---

You are helping the user create intelligent commits with automatic GitHub issue linking, conventional commit formatting, and smart multi-commit splitting.

## 🛡️ CRITICAL SECURITY UPDATE - Issue #108 Fix

**IMPORTANT**: This command now uses secure git operations to prevent .git files from being accidentally committed. All staging and commit operations use safety-wrapped functions that:

- ✅ **Exclude .git files**: Automatically uses `':!.git/'` pathspec to exclude Git metadata
- ✅ **Validate staging area**: Checks for .git files before every commit and blocks if found
- ✅ **Pre-commit hooks**: Auto-installs repository safety hooks to prevent dangerous commits
- ✅ **Recovery guidance**: Provides clear instructions if .git files are detected

**Security Features Active:**
- `safe_mcp_git_add`: Replaces direct MCP calls with validated staging
- `safe_mcp_git_commit`: Validates staging area before creating commits
- Pre-commit validation: Blocks commits containing Git internal files

## 🎯 Profile Integration

This command integrates with the LDC AI Framework profile system to provide project-type-specific commit conventions.

### Loading Profile Settings

```bash
# Load profile utilities for commit customization
source .claude/lib/profile-utils.sh

# Get profile-specific settings
ACTIVE_PROFILE=$(get_active_profile)           # e.g., "shopify", "react", "python"
EMOJI_ENABLED=$(is_emoji_enabled)               # true/false
COMMIT_SCOPES=$(get_commit_scopes)             # "section, snippet, template, ..."
```

### Profile-Specific Commit Scopes

Each profile defines valid commit scopes for that project type:

| Profile | Valid Scopes |
|---------|--------------|
| `default` | (any scope) |
| `shopify` | section, snippet, template, asset, config, locale, layout |
| `react` | component, hook, page, util, service, style, test, config |
| `nextjs` | app, api, component, lib, hook, middleware, config, style, test |
| `python` | api, model, view, service, util, test, migration, config, cli |
| `vanilla-js` | core, dom, util, style, test, config, build |

### Profile-Specific Emoji Mappings

Profiles can extend the default emoji map with project-specific types:

```bash
# Get emoji for commit type from active profile
get_commit_emoji "feat"      # Returns: ✨
get_commit_emoji "section"   # Returns: 🧩 (Shopify profile)
get_commit_emoji "hook"      # Returns: 🪝 (React profile)
get_commit_emoji "api"       # Returns: 🔌 (all profiles)
```

### Profile-Aware Commit Flow

```
1. Load active profile settings
2. Get valid scopes for profile
3. Detect scope from changed files
4. Validate scope against profile
5. Get appropriate emoji from profile
6. Generate commit message with profile conventions
```

## Your Role
Act as a Git expert who creates clean, meaningful commits with GitHub integration. Analyze changes, detect when to split into multiple commits, and generate appropriate commit messages.

## Workflow

### 1. Change Analysis
Analyze staged changes and detect commit splitting opportunities:
- **Staged files**: Categorize by change type and scope
- **Mixed changes**: Detect when multiple commit types are present
- **Logical grouping**: Group related changes together
- **Issue context**: Extract GitHub issue numbers from branch names
- **Scope detection**: Identify affected components/areas

### 2. Multi-Commit Detection
Automatically detect when changes should be split:
- **Different types**: feat + docs, fix + test, etc.
- **Different scopes**: auth changes + api changes
- **Logical separation**: New features vs. bug fixes
- **User choice**: Always offer single vs. multiple commit options

### 3. Commit Generation
Create appropriate commits with GitHub integration:
- **Conventional format**: `type(scope): description`
- **Emoji enhancement**: Smart emoji selection for commit types (🎨 style, ✨ feat, 🐛 fix)
- **Quick selection**: Interactive menu for common commit types and templates
- **GitHub linking**: Auto-add Refs based on branch (PRs handle closing)
- **Detailed descriptions**: Include change details and context
- **MCP integration**: Use GitHub MCP for issue updates when available

## Multi-Commit Logic

### Change Categorization
```bash
# Categorize staged files by type and scope
FEAT_FILES=""      # New functionality
FIX_FILES=""       # Bug fixes  
DOCS_FILES=""      # Documentation
TEST_FILES=""      # Tests
STYLE_FILES=""     # Formatting/style
REFACTOR_FILES=""  # Code restructuring
CHORE_FILES=""     # Maintenance/config

# Categorize by scope
AUTH_FILES=""      # Authentication related
API_FILES=""       # API endpoints
UI_FILES=""        # User interface
CONFIG_FILES=""    # Configuration
```

### Split Detection Examples
- **feat + docs**: Feature implementation + README update → 2 commits
- **fix + test**: Bug fix + test addition → 2 commits  
- **auth + api**: Auth changes + API changes → 2 commits
- **Multiple features**: Different logical features → Multiple commits

## Emoji Support & Quick Selection

### Conventional Commit Emojis
Smart emoji selection based on commit type for enhanced readability:

```bash
# Emoji mapping for conventional commit types
declare -A COMMIT_EMOJIS=(
    ["feat"]="✨"        # New features
    ["fix"]="🐛"         # Bug fixes
    ["docs"]="📚"        # Documentation
    ["style"]="🎨"       # Formatting, white-space, missing semi-colons
    ["refactor"]="♻️"    # Code restructuring without changing functionality
    ["perf"]="🚀"        # Performance improvements
    ["test"]="✅"        # Adding or updating tests
    ["chore"]="🔧"       # Maintenance, dependencies, config
    ["ci"]="👷"          # CI/CD changes
    ["build"]="📦"       # Build system changes
    ["revert"]="⏪"      # Reverting previous commits
    ["security"]="🔒"    # Security improvements
    ["deps"]="⬆️"        # Dependency updates
    ["config"]="⚙️"      # Configuration changes
    ["ui"]="💄"          # UI/UX improvements
    ["api"]="🔌"         # API changes
    ["db"]="🗃️"         # Database changes
    ["auth"]="🔐"        # Authentication changes
)
```

### Quick Selection Menu
Interactive prompt for common commit scenarios:

```bash
# Quick commit type selection
show_quick_selection_menu() {
    echo "🚀 **Quick Commit Selection:**"
    echo ""
    echo "**Common Types:**"
    echo "[1] ✨ feat: new feature"
    echo "[2] 🐛 fix: bug fix"
    echo "[3] 📚 docs: documentation"
    echo "[4] 🎨 style: formatting/style"
    echo "[5] ♻️ refactor: code restructuring"
    echo "[6] 🚀 perf: performance improvement"
    echo "[7] ✅ test: add/update tests"
    echo "[8] 🔧 chore: maintenance/config"
    echo ""
    echo "**Specialized Types:**"
    echo "[9] 🔒 security: security fix"
    echo "[10] ⬆️ deps: dependency update"
    echo "[11] 💄 ui: UI/UX improvement"
    echo "[12] 🔌 api: API changes"
    echo ""
    echo "[c] Custom message"
    echo "[a] Auto-detect from changes"
    echo ""
    read -p "Select type (1-12, c, a) [a]: " choice
}
```

### Commit Message Templates
Pre-filled templates based on commit type and detected changes:

```bash
# Template generation based on type and scope
generate_commit_template() {
    local type="$1"
    local scope="$2"
    local files_changed="$3"
    
    case "$type" in
        "feat")
            echo "${COMMIT_EMOJIS[feat]} feat($scope): add new functionality"
            echo ""
            echo "- Implement [describe main feature]"
            echo "- Add [specific component/function]"
            echo "- Include [additional details]"
            ;;
        "fix")
            echo "${COMMIT_EMOJIS[fix]} fix($scope): resolve [issue description]"
            echo ""
            echo "- Fix [specific problem]"
            echo "- Update [affected component]"
            echo "- Ensure [expected behavior]"
            ;;
        "refactor")
            echo "${COMMIT_EMOJIS[refactor]} refactor($scope): improve code structure"
            echo ""
            echo "- Restructure [component/function]"
            echo "- Optimize [specific area]"
            echo "- Maintain existing functionality"
            ;;
        "docs")
            echo "${COMMIT_EMOJIS[docs]} docs($scope): update documentation"
            echo ""
            echo "- Update [specific documentation]"
            echo "- Add [new examples/guides]"
            echo "- Clarify [usage instructions]"
            ;;
        *)
            echo "${COMMIT_EMOJIS[$type]} $type($scope): [description]"
            echo ""
            echo "- [Change description]"
            echo "- [Additional details]"
            ;;
    esac
}
```

### Smart Commit Type Detection
Analyze staged changes to suggest appropriate commit type and emoji:

```bash
# Detect commit type from file changes
detect_commit_type_from_changes() {
    local staged_files="$1"
    local detected_types=()
    
    # Check for different file patterns
    if echo "$staged_files" | grep -q -E "\.(test|spec)\.(js|ts|py|rb|go)$"; then
        detected_types+=("test")
    fi
    
    if echo "$staged_files" | grep -q -E "(README|docs?/|\.md$)"; then
        detected_types+=("docs")
    fi
    
    if echo "$staged_files" | grep -q -E "(package\.json|requirements\.txt|Gemfile|go\.mod)"; then
        detected_types+=("deps")
    fi
    
    if echo "$staged_files" | grep -q -E "(config|\.env|\.yml|\.yaml|\.json)"; then
        detected_types+=("config")
    fi
    
    if echo "$staged_files" | grep -q -E "(auth|login|security)"; then
        detected_types+=("security")
    fi
    
    if echo "$staged_files" | grep -q -E "(api|endpoint|route)"; then
        detected_types+=("api")
    fi
    
    if echo "$staged_files" | grep -q -E "(component|ui|css|style)"; then
        detected_types+=("ui")
    fi
    
    # Default to feat if adding new files, fix if modifying existing
    if [[ ${#detected_types[@]} -eq 0 ]]; then
        local new_files=$(git diff --cached --name-status | grep "^A" | wc -l)
        local modified_files=$(git diff --cached --name-status | grep "^M" | wc -l)
        
        if [[ $new_files -gt $modified_files ]]; then
            detected_types+=("feat")
        else
            detected_types+=("fix")
        fi
    fi
    
    # Return the most likely type
    echo "${detected_types[0]}"
}
```

### Enhanced User Interaction with Quick Selection

```bash
# Interactive commit creation with emoji support
create_interactive_commit() {
    echo "📊 **Analyzing staged changes...**"
    
    # Get staged files and detect type
    local staged_files=$(git diff --cached --name-only)
    local suggested_type=$(detect_commit_type_from_changes "$staged_files")
    local suggested_scope=$(detect_scope_from_files "$staged_files")
    
    echo "✨ **Smart Detection Results:**"
    echo "- Suggested type: ${COMMIT_EMOJIS[$suggested_type]} $suggested_type"
    echo "- Suggested scope: $suggested_scope"
    echo "- Files changed: $(echo "$staged_files" | wc -l)"
    echo ""
    
    # Show quick selection menu
    show_quick_selection_menu
    
    # Process user choice
    case "$choice" in
        "1") create_commit_with_template "feat" "$suggested_scope" ;;
        "2") create_commit_with_template "fix" "$suggested_scope" ;;
        "3") create_commit_with_template "docs" "$suggested_scope" ;;
        "4") create_commit_with_template "style" "$suggested_scope" ;;
        "5") create_commit_with_template "refactor" "$suggested_scope" ;;
        "6") create_commit_with_template "perf" "$suggested_scope" ;;
        "7") create_commit_with_template "test" "$suggested_scope" ;;
        "8") create_commit_with_template "chore" "$suggested_scope" ;;
        "9") create_commit_with_template "security" "$suggested_scope" ;;
        "10") create_commit_with_template "deps" "$suggested_scope" ;;
        "11") create_commit_with_template "ui" "$suggested_scope" ;;
        "12") create_commit_with_template "api" "$suggested_scope" ;;
        "c") prompt_custom_commit_message ;;
        "a"|"") create_commit_with_template "$suggested_type" "$suggested_scope" ;;
        *) echo "Invalid selection. Using auto-detected type: $suggested_type"
           create_commit_with_template "$suggested_type" "$suggested_scope" ;;
    esac
}
```

## Implementation

### Single vs. Multiple Commit Flow
```
User: /commit

Claude: Analyzing staged changes...

📊 **Change Analysis:**
- src/auth/Login.js (feat) - New authentication logic
- src/api/users.js (feat) - User API endpoints  
- README.md (docs) - Updated installation guide
- tests/auth.test.js (test) - Auth component tests

🤔 **Multi-commit recommendation:**
I detected changes that could be split into logical commits:

**Option 1: Single commit**
✨ feat: implement user authentication system with API and docs

**Option 2: Multiple commits (recommended)**
1. ✨ feat(auth): implement user login component
2. ✨ feat(api): add user management endpoints  
3. 📚 docs: update installation guide for auth setup
4. ✅ test(auth): add authentication component tests

Choose: [1] Single commit [2] Multiple commits [3] Quick selection menu [Enter for recommended]
```

### User Interaction Examples

**Enhanced single-type changes with emoji support:**
```
User: /commit

Claude: 📊 **Analyzing staged changes...**

✨ **Smart Detection Results:**
- Suggested type: ✨ feat
- Suggested scope: auth
- Files changed: 2

🚀 **Quick Commit Selection:**

**Common Types:**
[1] ✨ feat: new feature
[2] 🐛 fix: bug fix
[3] 📚 docs: documentation
[4] 🎨 style: formatting/style
[a] Auto-detect from changes

Select type (1-12, c, a) [a]: 1

💬 **Enhanced commit message:**
✨ feat(auth): enhance login component with validation

- Add email format validation  
- Improve error handling and user feedback
- Update AuthContext with new validation state

Refs #123

✅ **Commit created:** a1b2c3d
```

**Mixed changes requiring split:**
```
User: /commit

Claude: 📊 **Staged changes:**
- src/components/Button.js (feat)
- src/components/Modal.js (fix)  
- docs/components.md (docs)

🎯 **Smart splitting detected:**

**Commit 1:** 🐛 fix(ui): resolve modal z-index issue
- Fix modal appearing behind other elements
- Update z-index values for proper layering

**Commit 2:** ✨ feat(ui): add new button variants
- Add primary, secondary, and danger button styles
- Include hover and disabled states

**Commit 3:** 📚 docs(ui): document new button and modal changes
- Update component documentation
- Add usage examples for new button variants

Create 3 separate commits? [Y/n/single/quick]
```

**Custom message with auto-enhancement:**
```
User: /commit "add user profile page"

Claude: 📊 **Analyzing custom message...**

**Enhanced commit with emoji:**
✨ feat(profile): add user profile page

- Create ProfilePage component with user info display
- Add profile editing form with validation
- Integrate with user API for data fetching
- Include responsive design for mobile devices

Refs #145

✅ **Commit created:** b2c3d4e
```

**Shell-unsafe characters detected:**
```
User: /commit "fix: update API `endpoint` & database $schema"

Claude: ⚠️ **Shell parsing issues detected:**

**Original message:** fix: update API `endpoint` & database $schema
**Issues found:**
- Backticks (`) can trigger command substitution in GitHub Actions
- Dollar sign ($) can trigger variable expansion
- Ampersand (&) can background processes

**Suggested safe alternatives:**
1. fix: update API endpoint and database schema
2. fix: update API 'endpoint' and database schema variables
3. fix: update API endpoint & database schema (escaped: \$schema)

**Recommended:** fix: update API endpoint and database schema

Create commit with safe message? [Y/n/edit]
```

## MCP Integration

### GitHub MCP (Priority)
- **Issue detection**: Extract from branch names (issue-123-feature)
- **Issue validation**: Verify GitHub issue exists and get context
- **Auto-linking**: Add Refs keywords (commits reference, PRs close)
- **Status updates**: Update GitHub issue with commit references
- **Context enhancement**: Use issue details to improve commit messages

### Memory MCP (When Available)
- **Pattern storage**: Save successful commit patterns
- **Context retrieval**: Get project-specific commit conventions
- **Architecture context**: Include architectural decisions made

## Advanced Features

### Branch Context Detection
```bash
# Extract issue from branch name
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" =~ issue-([0-9]+)-(.+) ]]; then
    ISSUE_NUM=${BASH_REMATCH[1]}
    FEATURE_DESC=${BASH_REMATCH[2]//-/ }
fi
```

### Scope Auto-Detection
```bash
# Detect scope from file paths
if [[ "$FILES" =~ src/auth/ ]]; then SCOPE="auth"
elif [[ "$FILES" =~ src/api/ ]]; then SCOPE="api"  
elif [[ "$FILES" =~ src/components/ ]]; then SCOPE="ui"
elif [[ "$FILES" =~ docs/ ]]; then SCOPE="docs"
elif [[ "$FILES" =~ test/ ]]; then SCOPE="test"
fi
```

### Breaking Change Detection
- Detect API changes that might break compatibility
- Add BREAKING CHANGE footer when appropriate
- Include migration notes in commit body

### Shell-Safe Commit Message Validation
```bash
# Problematic characters that break GitHub Actions shell parsing
PROBLEMATIC_CHARS='`$;|&<>!~'"'"
DOUBLE_QUOTES='"'

# Check commit message for shell-unsafe characters
validate_shell_safety() {
    local message="$1"
    local issues=()
    
    # Check for backticks (command substitution)
    if [[ "$message" == *'`'* ]]; then
        issues+=("Backticks (`) can trigger command substitution")
    fi
    
    # Check for unescaped dollar signs (variable expansion)
    # Handle dollar at start of string and after non-backslash
    if [[ "$message" =~ [^\\]\$ ]] || [[ "$message" =~ ^\$ ]]; then
        issues+=("Dollar signs ($) can trigger variable expansion")
    fi
    
    # Check for semicolons (command separation)
    if [[ "$message" == *';'* ]]; then
        issues+=("Semicolons (;) can break command parsing")
    fi
    
    # Check for pipes (command chaining)
    if [[ "$message" == *'|'* ]]; then
        issues+=("Pipes (|) can create unintended command chains")
    fi
    
    # Check for ampersands (background processes)
    if [[ "$message" == *'&'* ]]; then
        issues+=("Ampersands (&) can background processes")
    fi
    
    # Check for redirection operators
    if [[ "$message" == *'<'* ]] || [[ "$message" == *'>'* ]]; then
        issues+=("Angle brackets (<, >) can trigger file redirection")
    fi
    
    # Check for history expansion (in interactive shells)
    if [[ "$message" == *'!'* ]]; then
        issues+=("Exclamation marks (!) can trigger history expansion in interactive shells")
    fi
    
    # Check for tilde expansion
    if [[ "$message" =~ ^~ ]] || [[ "$message" =~ [[:space:]]~ ]]; then
        issues+=("Tildes (~) can trigger home directory expansion")
    fi
    
    # Check for unmatched quotes
    local single_quote_count=$(echo "$message" | tr -cd "'" | wc -c)
    local double_quote_count=$(echo "$message" | tr -cd '"' | wc -c)
    
    if (( single_quote_count % 2 != 0 )); then
        issues+=("Unmatched single quotes (') can break string parsing")
    fi
    
    if (( double_quote_count % 2 != 0 )); then
        issues+=("Unmatched double quotes (\") can break string parsing")
    fi
    
    return "${#issues[@]}"
}
```

### Safe Message Suggestions
When problematic characters are detected, offer alternatives:
- **Backticks**: Replace with regular quotes or rephrase
- **Dollar signs**: Use "dollar" or escape with backslash
- **Semicolons**: Use commas or "and" instead
- **Pipes**: Use "or" or rephrase the sentence
- **Ampersands**: Use "and" or spell out the context
- **Angle brackets**: Use "less than/greater than" or rephrase
- **Exclamation marks**: Consider rephrasing or use in quotes
- **Tildes**: Use full path or "home directory" instead
- **Unmatched quotes**: Ensure quotes are properly paired

## Error Handling

### No Staged Changes
```
❌ No staged changes found.

Current status:
- Modified: 3 files
- Staged: 0 files

Options:
- Stage all changes: git add .
- Stage specific files: git add <filename>
- Review changes: git diff

Then run /commit again.
```

### Repository Issues
```
❌ Git repository error: [specific error]

Common solutions:
- Initialize repo: git init
- Check git status: git status
- Resolve conflicts: git add . after fixing conflicts
```

### Commit Failures
```
❌ Commit failed: [git error message]

Possible causes:
- Empty commit message
- Pre-commit hooks failing
- Repository permissions

Check git status and resolve issues.
```

### Shell-Unsafe Commit Messages
```
⚠️ Commit message contains characters that may break GitHub Actions:

**Detected issues:**
- Backticks (`) can trigger command substitution
- Unmatched quotes can break shell parsing
- Special characters may cause workflow failures

**Safe alternatives:**
- Replace backticks with single quotes
- Ensure quotes are properly matched
- Use "and" instead of "&" symbol
- Spell out "dollar" instead of "$"

Would you like me to suggest a safer version?
```

## Success Criteria

A successful commit session includes:
- ✅ Smart detection of single vs. multiple commit needs
- ✅ Proper conventional commit formatting with emoji enhancement
- ✅ Interactive quick selection menu for commit types
- ✅ Smart commit type detection from staged file changes
- ✅ Pre-filled templates based on commit type and scope
- ✅ GitHub issue linking with Refs keywords (not Closes)
- ✅ Logical grouping of related changes
- ✅ Clear, descriptive commit messages with context
- ✅ MCP integration for enhanced functionality
- ✅ User control over commit splitting decisions
- ✅ Shell-safe validation to prevent CI/CD failures

## Benefits of Multi-Commit Approach

### Better Git History
- **Logical separation**: Each commit represents one logical change
- **Easier reverting**: Can revert specific changes without affecting others
- **Clearer reviews**: Reviewers can understand changes in logical chunks
- **Better bisecting**: Git bisect works more effectively with focused commits

### Improved Collaboration
- **Atomic changes**: Each commit is complete and functional
- **Selective merging**: Can cherry-pick specific changes
- **Conflict resolution**: Smaller, focused commits reduce merge conflicts
- **Change tracking**: Easier to track when specific changes were introduced

## Important: GitHub Linking Strategy

**Commits use `Refs #123`** - Individual commits reference issues but don't close them
**PRs use `Closes #123`** - Pull requests close issues when merged

This approach provides better issue tracking:
- Multiple commits can reference the same issue
- Issues remain open until the complete feature/fix is merged via PR
- Better visibility into work progress before completion

Remember: The goal is to create meaningful, logical commits that tell the story of your changes clearly while leveraging MCP integrations for enhanced GitHub workflow management.