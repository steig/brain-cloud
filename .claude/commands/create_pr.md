---
category: daily
---

You are helping the user create a pull request with intelligent automation and comprehensive GitHub integration.

## Your Role
Act as a PR creation specialist who pushes branches, creates well-structured pull requests, and ensures proper GitHub integration. You'll handle the entire PR creation lifecycle from branch validation to GitHub PR creation with full context.

## Workflow

### 0. Initialize PR Creation Tracking
Start session monitoring and documentation:
- **Start time tracking**: `source .claude/lib/time-tracking.sh && start_time_tracking "create_pr" "$ISSUE_NUMBER" "Creating pull request"`
- **Log PR creation start**: Record PR creation initiation with GitHub issue comment
- **Initialize progress**: Set up activity and issue logging for PR creation process

### 1. Enhanced Branch Validation
Verify the current branch is ready for PR creation:
- **Log validation start**: `log_activity "Starting branch validation for PR creation"`
- **Commit status**: Ensure commits exist and are properly formatted
- **Branch state**: Verify branch is ahead of target branch
- **Remote tracking**: Check if branch exists on remote or needs to be pushed
- **Auto branch creation**: Create feature branch automatically if on main/develop
- **Issue context**: Extract related GitHub issue numbers from branch names
- **Target branch**: Determine appropriate target branch (main, develop, etc.)
- **Branch naming**: Ensure proper naming conventions for team workflows

### 2. Context Gathering
Collect comprehensive details for PR creation:
- **Log context gathering**: `log_activity "Gathering context and analyzing commits for PR"`
- **Related issues**: Identify linked GitHub issues from branch name and commits
- **GitHub context**: Read related GitHub issue details and requirements for context
- **Commit analysis**: Analyze commit messages for PR title and description
- **Change scope**: Determine files changed and impact assessment
- **Acceptance criteria**: Extract requirements from linked GitHub issues

### 3. Branch Push
Push the current branch to remote if needed:
- **Remote check**: Verify if branch exists on remote
- **Push operation**: Push with upstream tracking if needed
- **Conflict detection**: Check for any push conflicts or issues
- **Verification**: Confirm push was successful

### 4. Enhanced PR Creation
Create GitHub PR with comprehensive details and automation:
- **Smart title generation**: Create clear, descriptive PR title from context
- **Dynamic description**: Generate detailed PR description with templates
- **Issue linking**: Proper GitHub issue linking with closure keywords
- **Labels and metadata**: Apply appropriate labels and milestones automatically
- **Reviewer auto-assignment**: Intelligent reviewer suggestion based on CODEOWNERS and file changes
- **Draft PR support**: Create draft PRs for work-in-progress
- **Template selection**: Choose appropriate PR template based on change type

### 5. Integration Updates
Update GitHub tracking and provide next steps:
- **Issue updates**: Update related GitHub issues with PR information
- **Status tracking**: Mark GitHub issues as "in review" status with labels
- **Next steps**: Provide clear guidance for review and merge process

## MCP Tools Usage

**GitHub MCP (Required):**
```
# Create GitHub PR
- Push branch to remote repository
- Create PR with title, description, and metadata
- Link PR to related GitHub issues
- Apply labels and assign reviewers
- Set milestones and project boards
```

**GitHub Operations:**
```
# Update GitHub issues
- Add PR information to related GitHub issues
- Update issue labels from "in progress" to "in review"
- Add PR URL and number references in issue comments
- Track PR creation timestamp in issue timeline
```

## Automatic Branch Management

### Auto Branch Creation
Automatically create feature branches if working on main/develop:

```bash
# Detect if on main branch and create feature branch
check_and_create_branch() {
    local current_branch=$(git branch --show-current)
    local protected_branches=("main" "master" "develop" "dev")
    
    # Check if on protected branch
    for protected in "${protected_branches[@]}"; do
        if [[ "$current_branch" == "$protected" ]]; then
            echo "⚠️ **Cannot create PR from protected branch: $current_branch**"
            echo ""
            echo "🔄 **Auto-creating feature branch...**"
            
            # Generate branch name from staged changes or prompt
            local branch_name=$(generate_branch_name_from_changes)
            
            echo "📝 Suggested branch name: $branch_name"
            read -p "Use this branch name? [Y/n/custom]: " choice
            
            case "$choice" in
                "n"|"N") 
                    read -p "Enter custom branch name: " branch_name
                    ;;
                "custom")
                    read -p "Enter custom branch name: " branch_name
                    ;;
            esac
            
            # Create and switch to new branch
            git checkout -b "$branch_name"
            echo "✅ Created and switched to branch: $branch_name"
            return 0
        fi
    done
    
    return 1  # Not on protected branch
}

# Generate intelligent branch names from changes
generate_branch_name_from_changes() {
    local staged_files=$(git diff --cached --name-only)
    local branch_prefix="feature"
    local branch_desc="update"
    
    # Analyze file patterns to suggest branch type and description
    if echo "$staged_files" | grep -q "test\|spec"; then
        branch_prefix="test"
        branch_desc="add-tests"
    elif echo "$staged_files" | grep -q "docs\|README\|\.md"; then
        branch_prefix="docs"
        branch_desc="update-documentation"
    elif echo "$staged_files" | grep -q "fix\|bug"; then
        branch_prefix="fix"
        branch_desc="resolve-issue"
    elif echo "$staged_files" | grep -q "auth\|login\|security"; then
        branch_prefix="feature"
        branch_desc="authentication-system"
    elif echo "$staged_files" | grep -q "api\|endpoint"; then
        branch_prefix="feature"
        branch_desc="api-endpoints"
    elif echo "$staged_files" | grep -q "ui\|component\|css"; then
        branch_prefix="feature"
        branch_desc="ui-components"
    fi
    
    echo "$branch_prefix-$(date +%m%d)-$branch_desc"
}
```

## PR Creation Scope

### Auto-Branch Creation from Main
```
User: /create_pr

Claude: ⚠️ **Cannot create PR from protected branch: main**

🔄 **Auto-creating feature branch...**

📊 **Analyzing staged changes:**
- src/auth/Login.js (new file)
- src/auth/AuthContext.js (new file)
- src/components/Header.js (modified)

📝 Suggested branch name: feature-1220-authentication-system

Use this branch name? [Y/n/custom]: Y

✅ Created and switched to branch: feature-1220-authentication-system

Now creating PR from new feature branch...
```

### From Current Branch
```
User: /create_pr

Claude: Creating PR from current branch...
```

### With Custom Title
```
User: /create_pr "Add user authentication system"

Claude: Creating PR with custom title...
```

### With Target Branch
```
User: /create_pr --target develop

Claude: Creating PR targeting develop branch...
```

### Draft PR Creation
```
User: /create_pr --draft

Claude: Creating draft PR for work-in-progress...
```

## PR Title and Description Generation

### Automatic Title Generation
Based on branch name and commits:
- **Branch pattern**: `issue-123-feature-name` → "Add feature name (#123)"
- **Commit analysis**: Extract main feature from recent commits
- **Issue context**: Use GitHub issue title if available
- **Conventional format**: Follow team's title conventions

### Dynamic PR Template Selection
Choose appropriate template based on change analysis:

```bash
# Select template based on change type
select_pr_template() {
    local changed_files="$1"
    local commit_messages="$2"
    
    # Analyze changes to determine template type
    if echo "$changed_files" | grep -q "test\|spec"; then
        echo "testing"
    elif echo "$changed_files" | grep -q "docs\|README\|\.md"; then
        echo "documentation"
    elif echo "$commit_messages" | grep -q "fix\|bug\|hotfix"; then
        echo "bugfix"
    elif echo "$commit_messages" | grep -q "feat\|feature"; then
        echo "feature"
    elif echo "$changed_files" | grep -q "security\|auth"; then
        echo "security"
    else
        echo "general"
    fi
}
```

### Enhanced PR Templates

#### Feature Template
```markdown
## 🚀 Feature Summary
<!-- Brief description of the new feature -->

## 📋 Related Issues
<!-- Links to GitHub issues this PR addresses -->
- Closes #123
- Refs #124

## ✨ Changes Made
<!-- Detailed list of changes with context -->
- Added user authentication system with JWT tokens
- Implemented secure login/register components
- Created protected route wrapper with redirect logic
- Added persistent session management

## 🧪 Testing Checklist
<!-- Comprehensive testing requirements -->
- [ ] **Unit Tests**: Authentication service functions
- [ ] **Integration Tests**: Login/logout flow end-to-end
- [ ] **Manual Testing**: User registration and login
- [ ] **Security Testing**: Token validation and expiration
- [ ] **Accessibility Testing**: Keyboard navigation and screen readers
- [ ] **Cross-browser Testing**: Chrome, Firefox, Safari compatibility

## ✅ Acceptance Criteria
<!-- From linked GitHub issues -->
- [x] User can register with email/password validation
- [x] User can login with existing credentials
- [x] Protected routes redirect unauthenticated users
- [x] Session persists across browser refresh
- [x] Token expiration handled gracefully

## 🚀 Deployment Notes
<!-- Production deployment considerations -->
- **Environment Variables**: Requires JWT_SECRET configuration
- **Database**: Migration scripts included for user tables
- **Dependencies**: New npm packages added (see package.json)
- **Documentation**: API endpoints documented in /docs/api.md

## 📸 Screenshots/Demo
<!-- Visual changes or demo links -->
[Attach screenshots or demo video if UI changes]

## 🔍 Reviewer Focus Areas
<!-- Guide reviewers on what to focus on -->
- Security implementation of JWT handling
- Error handling and user feedback
- Code organization and maintainability
```

#### Bug Fix Template
```markdown
## 🐛 Bug Fix Summary
<!-- Brief description of the bug and fix -->

## 🔗 Related Issues
- Fixes #123
- Related to #124

## 🔧 Root Cause Analysis
<!-- What caused the bug -->
- **Issue**: JWT tokens were not being validated on server restart
- **Cause**: Token storage relied on server memory instead of stateless verification
- **Impact**: Users randomly logged out after deployment

## ✅ Changes Made
<!-- Specific fixes implemented -->
- Modified JWT verification to use secret key validation
- Added token expiration handling in middleware
- Implemented proper error responses for invalid tokens

## 🧪 Testing
<!-- How the fix was validated -->
- [x] Verified token persistence across server restarts
- [x] Tested token expiration behavior
- [x] Confirmed error handling with invalid tokens
- [x] Load tested with concurrent user sessions

## 🚨 Risk Assessment
<!-- Potential risks and mitigation -->
- **Risk**: Low - Changes are isolated to authentication middleware
- **Mitigation**: Comprehensive testing and gradual rollout planned
- **Rollback**: Simple revert available if issues arise
```

#### Security Template
```markdown
## 🔒 Security Update Summary
<!-- Brief description of security changes -->

## 🚨 Security Impact
<!-- Security implications and severity -->
- **Severity**: High/Medium/Low
- **Affected Components**: Authentication system, API endpoints
- **User Impact**: Enhanced security, improved data protection

## 🔗 Related Issues
- Fixes #123 (Security vulnerability report)
- Addresses #124 (Security audit findings)

## 🛡️ Security Changes
<!-- Detailed security improvements -->
- Implemented rate limiting on authentication endpoints
- Added input sanitization to prevent injection attacks
- Enhanced password hashing with bcrypt and salt
- Added CSRF protection for state-changing operations

## 🧪 Security Testing
<!-- Security validation performed -->
- [x] **Penetration Testing**: Attempted common attack vectors
- [x] **Code Security Scan**: OWASP dependency check passed
- [x] **Authentication Testing**: Token handling and session security
- [x] **Input Validation**: SQL injection and XSS prevention verified

## 📋 Security Checklist
- [x] No sensitive data exposed in logs or responses
- [x] All user inputs properly validated and sanitized
- [x] Authentication mechanisms follow security best practices
- [x] Error messages don't leak sensitive information
- [x] Dependencies updated to latest secure versions

## 🚀 Deployment Security Notes
<!-- Security considerations for deployment -->
- **Secrets Management**: All secrets properly configured in environment
- **HTTPS**: Ensure SSL/TLS properly configured in production
- **Monitoring**: Security events logged for audit trail
```

## Intelligent Reviewer Assignment

### CODEOWNERS-Based Assignment
```bash
# Analyze changed files and suggest reviewers based on CODEOWNERS
suggest_reviewers() {
    local changed_files="$1"
    local reviewers=()
    
    # Check if CODEOWNERS file exists
    if [[ -f ".github/CODEOWNERS" ]]; then
        echo "📋 **Analyzing CODEOWNERS for reviewer suggestions...**"
        
        # Parse CODEOWNERS and match file patterns
        while IFS= read -r line; do
            # Skip comments and empty lines
            [[ "$line" =~ ^#.*$ ]] || [[ -z "$line" ]] && continue
            
            # Extract pattern and owners
            local pattern=$(echo "$line" | awk '{print $1}')
            local owners=$(echo "$line" | awk '{for(i=2;i<=NF;i++) print $i}')
            
            # Check if any changed files match the pattern
            if echo "$changed_files" | grep -q "$pattern"; then
                reviewers+=($owners)
            fi
        done < ".github/CODEOWNERS"
    fi
    
    # Add reviewers based on file types if no CODEOWNERS matches
    if [[ ${#reviewers[@]} -eq 0 ]]; then
        if echo "$changed_files" | grep -q "\.js\|\.ts\|\.jsx\|\.tsx"; then
            reviewers+=("@frontend-team")
        fi
        
        if echo "$changed_files" | grep -q "\.py\|\.go\|\.java"; then
            reviewers+=("@backend-team")
        fi
        
        if echo "$changed_files" | grep -q "test\|spec"; then
            reviewers+=("@qa-team")
        fi
        
        if echo "$changed_files" | grep -q "docs\|README"; then
            reviewers+=("@docs-team")
        fi
    fi
    
    # Remove duplicates and format
    local unique_reviewers=($(printf "%s\n" "${reviewers[@]}" | sort -u))
    echo "${unique_reviewers[@]}"
}

# Smart reviewer assignment based on change complexity
assign_reviewers_by_complexity() {
    local lines_changed="$1"
    local files_changed="$2"
    local suggested_reviewers="$3"
    
    local review_count=1
    
    # Determine number of reviewers based on change size
    if [[ $lines_changed -gt 500 ]] || [[ $files_changed -gt 10 ]]; then
        review_count=2
        echo "🔍 **Large changeset detected** - Suggesting 2 reviewers"
    elif [[ $lines_changed -gt 100 ]] || [[ $files_changed -gt 5 ]]; then
        review_count=1
        echo "📝 **Medium changeset** - Suggesting 1 reviewer"
    else
        review_count=1
        echo "✅ **Small changeset** - Suggesting 1 reviewer"
    fi
    
    # Select reviewers from suggestions
    local selected_reviewers=($(echo "$suggested_reviewers" | head -n $review_count))
    echo "👥 **Suggested reviewers**: ${selected_reviewers[*]}"
    
    # Prompt for confirmation
    read -p "Assign these reviewers? [Y/n/custom]: " choice
    case "$choice" in
        "n"|"N")
            read -p "Enter custom reviewers (space-separated): " custom_reviewers
            echo "$custom_reviewers"
            ;;
        "custom")
            read -p "Enter custom reviewers (space-separated): " custom_reviewers
            echo "$custom_reviewers"
            ;;
        *)
            echo "${selected_reviewers[*]}"
            ;;
    esac
}
```

### Change Impact Analysis
```bash
# Analyze the scope and impact of changes for better PR categorization
analyze_change_impact() {
    local changed_files=$(git diff --name-only HEAD~1..HEAD 2>/dev/null || git diff --cached --name-only)
    local lines_added=$(git diff --shortstat HEAD~1..HEAD 2>/dev/null | awk '{print $4}' || echo "0")
    local lines_deleted=$(git diff --shortstat HEAD~1..HEAD 2>/dev/null | awk '{print $6}' || echo "0")
    
    local impact_level="low"
    local impact_areas=()
    
    # Determine impact level
    local total_lines=$((lines_added + lines_deleted))
    if [[ $total_lines -gt 500 ]]; then
        impact_level="high"
    elif [[ $total_lines -gt 100 ]]; then
        impact_level="medium"
    fi
    
    # Identify impact areas
    if echo "$changed_files" | grep -q "src/auth\|auth\|login\|security"; then
        impact_areas+=("security")
    fi
    
    if echo "$changed_files" | grep -q "api\|server\|backend"; then
        impact_areas+=("backend")
    fi
    
    if echo "$changed_files" | grep -q "component\|ui\|css\|frontend"; then
        impact_areas+=("frontend")
    fi
    
    if echo "$changed_files" | grep -q "test\|spec"; then
        impact_areas+=("testing")
    fi
    
    if echo "$changed_files" | grep -q "config\|env\|docker\|deploy"; then
        impact_areas+=("infrastructure")
    fi
    
    echo "impact_level:$impact_level,areas:${impact_areas[*]},files:$(echo "$changed_files" | wc -l),lines:$total_lines"
}
```

## Example Enhanced Interaction

```
User: /create_pr

Claude: I'll create a pull request from your current branch. Let me analyze the context and push the changes...

---

# 🚀 **Creating Pull Request**

## **Step 1: Enhanced Branch Analysis**
```
📍 Current branch: issue-123-user-authentication
🎯 Target branch: main (detected)
📊 Commits ahead: 7 commits
📁 Files changed: 8 files (+287 lines, -15 lines)
🔗 Related issue: #123 "Add user authentication system"
```

## **Step 2: Context Gathering**
```
✅ Found GitHub issue #123: "Add user authentication system"
✅ Issue details: Description, acceptance criteria, and requirements
✅ Acceptance criteria: 7 criteria identified from GitHub issue
✅ Commit analysis: Feature implementation complete
✅ Change scope: Authentication system with JWT tokens
```

## **Step 3: Branch Push**
```
🔄 Checking remote branch status...
❌ Branch not found on remote, pushing now...
✅ Pushed issue-123-user-authentication to origin
✅ Set up upstream tracking
```

## **Step 4: PR Creation**
```
🔄 Creating GitHub PR...
✅ PR #456 created successfully
✅ Title: "feat(auth): implement JWT-based user authentication (#123)"
✅ Description: Generated with full context and acceptance criteria
✅ Labels applied: enhancement, authentication, ready-for-review
✅ Reviewers assigned: @tech-lead, @senior-dev (based on changed files)
✅ Linked to milestone: M01 - Authentication Epic
```

## **Step 5: GitHub Integration**
```
✅ Updated GitHub issue #123 with PR link and status
✅ Issue labels updated: in progress → in review
✅ Added PR reference: #456 in issue comments
✅ GitHub issue #123 marked as "in review" with appropriate labels
```

---

# 🎉 **Pull Request Created Successfully!**

**📋 PR Details:**
- **PR Number**: #456
- **Title**: "feat(auth): implement JWT-based user authentication (#123)"
- **URL**: https://github.com/owner/repo/pull/456
- **Status**: Open, ready for review

**🔗 Related Issues:**
- **Closes**: #123 "Add user authentication system"
- **Epic**: M01 - Authentication Epic (75% complete)

**👥 Review Process:**
- **Assigned reviewers**: @tech-lead, @senior-dev
- **Required approvals**: 2/2
- **Automated checks**: Build pipeline triggered

**📊 Change Summary:**
- **Files changed**: 8 files
- **Lines added**: +287
- **Lines removed**: -15
- **Components**: Login, Register, AuthContext, ProtectedRoute

---

## **🔍 Next Steps**

1. **Review Process**: `/pr_review 456` - Validate implementation against requirements
2. **Code Quality**: Wait for automated checks (build, tests, security scan)
3. **Team Review**: Reviewers will provide feedback through GitHub
4. **Merge Ready**: `/pr_merge 456` when all approvals and checks pass

**✨ Your PR is now ready for team review!**

**GitHub Integration Status:**
- ✅ Issue #123 updated with PR link and review labels
- ✅ GitHub issue marked as "in review"
- ✅ Team notifications sent
- ✅ CI/CD pipeline triggered
- ✅ Project milestone updated

**Monitoring:**
- **Build status**: ⏳ In progress
- **Security scan**: ⏳ Queued
- **Review notifications**: ✅ Sent to reviewers

Would you like me to:
1. **Check build status** and provide updates
2. **Review the PR** immediately with `/pr_review 456`
3. **Show PR details** on GitHub
4. **Update team** with additional context
```

## Advanced Features

### Smart Target Branch Detection
Automatically determine the best target branch:
- **Main/master**: For feature branches and bug fixes
- **Develop**: For development workflow projects
- **Release branches**: For hotfixes to specific versions
- **Custom**: Based on project configuration

### Reviewer Assignment
Intelligent reviewer assignment based on:
- **Code ownership**: CODEOWNERS file patterns
- **File expertise**: Historical commit patterns
- **Team structure**: Configured review groups
- **Availability**: Team member workload and status

### PR Template Integration
Use repository PR templates when available:
- **Feature template**: For new functionality
- **Bug fix template**: For issue resolutions
- **Documentation template**: For docs updates
- **Security template**: For security-related changes

### Automated Checks Integration
Coordinate with repository automation:
- **Status checks**: Wait for required checks to start
- **Quality gates**: Verify minimum requirements
- **Deployment previews**: Trigger preview environments
- **Notifications**: Alert stakeholders of new PR

## Error Handling

### No Commits to Push
```
❌ Cannot create PR: No commits ahead of target branch

Current status:
- Branch: issue-123-feature
- Commits ahead of main: 0
- Local changes: 3 files modified

Please ensure you have commits ready:
1. Stage changes: `git add .`
2. Create commit: `/commit`
3. Try PR creation again: `/create_pr`
```

### Push Conflicts
```
❌ Push failed: Merge conflicts with remote

The remote branch has been updated since you started working.
You need to resolve conflicts first:

1. Fetch latest: `git fetch origin`
2. Rebase your branch: `git rebase origin/main`
3. Resolve any conflicts
4. Try again: `/create_pr`

Alternatively, use merge strategy:
1. Merge main: `git merge origin/main`
2. Resolve conflicts
3. Commit merge: `git commit`
4. Try again: `/create_pr`
```

### Missing Issue Context
```
⚠️ No GitHub issue detected for PR context

Branch: feature/random-name
Recent commits: 3 commits

To create a more informative PR:
1. **Link to issue**: Rename branch to `issue-123-description`
2. **Create issue first**: Use `/create_task` to create GitHub issue
3. **Manual context**: Provide PR details manually

Proceed with basic PR? (Y/n/create-issue)
```

### GitHub API Errors
```
❌ GitHub API Error: Insufficient permissions

The current GitHub token doesn't have permission to create PRs.

Required permissions:
- Repository: Write access
- Pull requests: Create and manage
- Issues: Read access for linking

Please check:
1. GitHub token configuration
2. Repository permissions
3. Organization settings

Manual fallback:
1. Push completed: ✅ Branch is on remote
2. Create PR manually: Visit GitHub repository
3. Use generated title and description below
```

## Branch Naming Conventions

### Recommended Patterns
- **Feature**: `issue-123-feature-description`
- **Bug fix**: `issue-456-fix-login-error`
- **Hotfix**: `hotfix-789-critical-security`
- **Documentation**: `docs-update-readme`

### Pattern Benefits
- **Issue linking**: Automatic GitHub issue detection
- **PR titles**: Generated from branch names
- **Team clarity**: Clear purpose and context
- **Automation**: Triggers appropriate workflows

## Success Criteria

A successful PR creation includes:
- ✅ Branch successfully pushed to remote
- ✅ GitHub PR created with comprehensive description
- ✅ Proper issue linking with closure keywords
- ✅ Appropriate labels, reviewers, and milestones applied
- ✅ Local task files updated with PR information
- ✅ Clear next steps provided for review process
- ✅ Team notifications sent and automation triggered

## Integration with Other Commands

### From Commit Workflow
```bash
# 1. Complete feature implementation
/do_task 123

# 2. Create commits with proper linking
/commit

# 3. Create PR for review (NEW!)
/create_pr

# 4. Review PR comprehensively
/pr_review 456

# 5. Merge when ready
/pr_merge 456
```

### With Release Management
PRs created with `/create_pr` automatically integrate with:
- **Release notes**: PR titles become release note entries
- **Version calculation**: Feature/fix classification affects versioning
- **Deployment tracking**: PR merge triggers deployment workflows
- **Quality metrics**: PR review feedback improves team processes

Remember: The goal is to make PR creation effortless while ensuring comprehensive context, proper GitHub integration, and clear team communication. This bridges the gap between individual development work and collaborative code review.