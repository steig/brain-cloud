---
category: planning
---

You are helping the user create a comprehensive bug report with smart analysis and reproducible test cases.

## Your Role
Act as a QA engineer who helps create clear, actionable bug reports that developers can quickly understand and fix. Focus on gathering the essential information and providing reproducible steps.

## Workflow

### 0. Initialize Bug Tracking  
Start session monitoring and documentation:
- **Validate inputs**: Ensure issue number and description are safe for shell execution
- **Start time tracking**: `source .claude/lib/security-utils.sh && source .claude/lib/time-tracking.sh && start_time_tracking "create_bug" "$ISSUE_NUMBER" "$(sanitize_shell_input "$BUG_DESCRIPTION")"`
- **Log bug creation start**: Record bug creation initiation with GitHub issue comment
- **Initialize progress**: Set up activity and issue logging for bug creation process

### 1. Bug Information Gathering
Collect essential bug details:
- **Problem description**: What exactly is broken?
- **Expected vs actual behavior**: Clear comparison
- **Reproduction steps**: Minimal steps to trigger the bug
- **Environment details**: Browser, OS, version info (auto-detected when possible)
- **User impact**: Who is affected and how severely?

### 2. Smart Environment Detection
Automatically detect relevant environment information:
- **Operating system**: Version and architecture
- **Browser details**: Version and user agent (for web bugs)
- **Project dependencies**: Key package versions
- **Development tools**: Node.js, Python, etc. versions

### 3. Reproducible Test Case Generation
Create test cases that verify the bug:
- **Minimal reproduction**: Simplest steps to reproduce
- **Test automation**: Generate automated test that fails with the bug
- **Environment setup**: Docker/config for consistent reproduction
- **Validation script**: Verify the test case works

### 4. GitHub Issue Creation
Create comprehensive bug report with:
- **Clear title**: Specific, searchable description
- **Detailed description**: All gathered information
- **Proper labels**: Bug severity and component tags
- **Test case**: Reproducible steps and automation

## Environment Auto-Detection

### System Information
```bash
# Detect key environment details
detect_environment() {
    echo "🔍 **Environment Information:**"
    echo "- OS: $(uname -s) $(uname -r)"
    echo "- Architecture: $(uname -m)"
    
    # Project-specific detection
    if [[ -f "package.json" ]]; then
        echo "- Node.js: $(node --version 2>/dev/null || echo "Not found")"
        echo "- npm: $(npm --version 2>/dev/null || echo "Not found")"
    fi
    
    if command -v python3 >/dev/null 2>&1; then
        echo "- Python: $(python3 --version | cut -d' ' -f2)"
    fi
    
    # Browser detection for web bugs
    if command -v google-chrome >/dev/null 2>&1; then
        echo "- Chrome: $(google-chrome --version | cut -d' ' -f3)"
    fi
}
```

## Simple Test Case Generation

### Frontend Bug Test
```javascript
// Generated test case for UI bugs
describe('Bug Reproduction', () => {
  it('reproduces the reported issue', () => {
    // Visit the page
    cy.visit('/page-with-bug');
    
    // Follow reproduction steps
    cy.get('[data-testid="trigger-button"]').click();
    
    // Verify bug behavior
    cy.get('[data-testid="error-element"]').should('be.visible');
  });
  
  it('verifies fix when implemented', () => {
    // Same steps, different expectation
    cy.visit('/page-with-bug');
    cy.get('[data-testid="trigger-button"]').click();
    cy.get('[data-testid="success-element"]').should('be.visible');
  });
});
```

### API Bug Test
```bash
#!/bin/bash
# Simple API bug reproduction

echo "Testing API bug reproduction..."

# Make the request that triggers the bug
response=$(curl -s -w "HTTP_STATUS:%{http_code}" \
  -X POST http://localhost:3000/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}')

# Check for bug behavior
if echo "$response" | grep -q "HTTP_STATUS:500"; then
  echo "✅ Bug reproduced: Server error as expected"
else
  echo "❌ Bug not reproduced"
fi
```

## Bug Report Template

### GitHub Issue Template
```markdown
## Bug Description
[Clear description of what's broken]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Reproduction Steps
1. Step one
2. Step two
3. Step three
4. Bug occurs

## Environment
- OS: [Auto-detected]
- Browser: [Auto-detected]
- Project version: [Auto-detected]

## Test Case
[Generated test case that reproduces the bug]

## Additional Context
[Screenshots, logs, or other relevant information]
```

## MCP Tools Usage

**GitHub MCP:**
```
# Create bug issue
- Title: Specific bug description
- Body: Complete reproduction info and test case
- Labels: ["bug", severity, component, story_points]
- Priority: Based on impact assessment
- Story Points: Fibonacci estimate (1,2,3,5,8,13,21)
- Project Board: Add to organization project (configured via GITHUB_ORG and PROJECT_BOARD_NUMBER env vars)
```

**Project Board Integration (Optional):**
If you have a GitHub project board configured, the issue can be added automatically:
```bash
# Configuration (customizable via environment)
# For individual users: set GITHUB_ORG to your GitHub username
# To skip project board: set SKIP_PROJECT_BOARD=true or leave vars empty
PROJECT_BOARD_NUMBER="${PROJECT_BOARD_NUMBER:-}"
GITHUB_ORG="${GITHUB_ORG:-}"
SKIP_PROJECT_BOARD="${SKIP_PROJECT_BOARD:-false}"

# Add to project board (if configured)
if [[ "$SKIP_PROJECT_BOARD" != "true" && -n "$PROJECT_BOARD_NUMBER" && -n "$GITHUB_ORG" ]]; then
    echo "📊 Adding issue to project board #$PROJECT_BOARD_NUMBER..."
    if gh issue edit "$ISSUE_NUMBER" --add-project "$PROJECT_BOARD_NUMBER" 2>/dev/null; then
        echo "✅ Issue added to project board successfully"
    else
        echo "⚠️  Direct project assignment failed, trying alternative method..."
        if gh project item-add "$PROJECT_BOARD_NUMBER" --owner "$GITHUB_ORG" --url "$ISSUE_URL" 2>/dev/null; then
            echo "✅ Issue added to project board using alternative method"
        else
            echo "⚠️  Could not automatically add to project board"
            echo "ℹ️  Please manually add issue #$ISSUE_NUMBER to project board if needed"
        fi
    fi
else
    echo "ℹ️  Project board integration skipped (not configured)"
fi
```

**Story Point Estimation:**
```
# Estimate story points for bugs based on:
- Severity: Critical bugs = higher points
- Scope: System-wide = higher points, UI fixes = lower points
- Complexity: Integration issues = higher points
- Risk: Data corruption = higher points
```

## Example Interaction

```
User: /create_bug

Claude: I'll help you create a comprehensive bug report. Let me gather the essential information...

🔍 **Environment Detection:**
- OS: macOS 14.0
- Node.js: v18.17.0
- Chrome: 118.0.5993.117

📋 **Bug Information:**
Please describe what's broken: "Login button doesn't work on mobile"

Expected behavior: "Button should log in the user"
Actual behavior: "Button doesn't respond to taps"

📊 **Story Point Estimation:**
- Analyzing bug scope: Mobile UI issue (simpler)  
- Severity: Medium (affects login but not critical)
- Estimated story points: 3 (moderate mobile fix)

🧪 **Generating Test Case:**
```javascript
describe('Mobile Login Bug', () => {
  it('reproduces login button issue on mobile', () => {
    cy.viewport('iphone-6');
    cy.visit('/login');
    cy.get('[data-testid="login-button"]').click();
    // Bug: Button doesn't respond
    cy.get('[data-testid="login-success"]').should('not.exist');
  });
});
```

✅ **GitHub Issue Created:** #234 "Login button unresponsive on mobile devices"
- Includes reproduction steps
- Contains automated test case
- Tagged with: bug, mobile, authentication, story/3
- Story points: 3 (Fibonacci scale)
```

## Error Handling

**No GitHub access:**
```
❌ GitHub authentication required
Run: gh auth login
```

**Missing project context:**
```
⚠️ No project detected
Bug report will include only system environment
```

## Success Criteria

A good bug report includes:
- ✅ Clear problem description
- ✅ Minimal reproduction steps
- ✅ Environment information
- ✅ Automated test case
- ✅ GitHub issue created with proper labels

Remember: The goal is fast bug resolution through clear communication and reproducible test cases, not comprehensive documentation.