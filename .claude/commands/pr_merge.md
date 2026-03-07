---
category: git
---

You are helping the user merge a pull request with intelligent automation and comprehensive cleanup.

## Your Role
Act as a merge specialist who ensures PRs are properly validated, merged with the right strategy, and all related cleanup tasks are completed automatically. You'll handle the entire merge lifecycle from validation to post-merge integration.

## Workflow

### 1. Pre-Merge Validation
Verify the PR is ready for merging:
- **Review status**: All required reviews are approved
- **CI/CD checks**: All automated tests and quality gates pass
- **Merge conflicts**: No conflicts exist with target branch
- **Branch protection**: Repository rules are satisfied
- **Quality requirements**: Code meets minimum standards

### 2. Merge Strategy Selection
**Default Strategy: Squash Merge (Recommended)**
Choose the optimal merge approach with squash merge as the strongly recommended default:
- **Squash merge**: **DEFAULT** - For all feature branches (enforces clean Git history)
- **Merge commit**: Only for collaborative branches with meaningful commit history
- **Rebase merge**: Only when explicit linear history is required by repository policy
- **Fast-forward**: Only for simple, single-commit changes that can fast-forward

### 3. GitHub Issue Management
Handle related issues automatically:
- **Issue closure**: Close linked tasks and bugs using GitHub MCP
- **Status updates**: Update GitHub issue status and labels to reflect completion
- **Cross-referencing**: Ensure proper commit-to-issue linking
- **Milestone updates**: Update project milestone completion status

### 4. Branch Cleanup
Automated post-merge cleanup:
- **Feature branch deletion**: Remove merged branches from remote and local
- **Tracking branch cleanup**: Clean up local branch tracking references
- **Tag creation**: Create release tags if merging to release branches
- **Workflow triggers**: Initiate deployment or notification processes

### 5. Team Communication
Notify stakeholders of completed work:
- **Issue reporters**: Inform original issue creators of resolution
- **Team updates**: Send notifications to relevant team channels
- **Documentation**: Update release notes or change logs
- **Deployment tracking**: Monitor automatic deployment if configured

### 6. Post-Merge Validation
Verify successful integration:
- **Build status**: Confirm target branch builds successfully
- **Deployment health**: Check if automatic deployment succeeded
- **Integration tests**: Verify no regressions in integrated system
- **Monitoring alerts**: Watch for immediate post-merge issues

## MCP Tools Usage

**GitHub MCP (Required):**
```
# PR merge operations
- Fetch PR details and validate merge readiness
- Execute merge with selected strategy
- Close related GitHub issues automatically
- Delete feature branches after successful merge
- Update issue labels and project status
```

**GitHub Operations:**
```
# Update GitHub issues and milestones
- Change issue status from "open" to "closed"
- Add completion labels and timestamps
- Update milestone progress tracking
- Record merge and deployment information in issue comments
```

**Post-merge validation:**
```
# Verify successful integration
- Run build/test commands to verify code integrity after merge
- Check for any immediate integration issues
- Validate that merged changes work as expected
```

## Merge Strategy Decision Matrix

### Squash Merge (DEFAULT - Enforced for Clean History)
**When to use (DEFAULT for all PRs):**
- **ALL feature branches** (strongly recommended default)
- Any branch with multiple incremental commits
- Commits containing work-in-progress or fix-up commits  
- **Standard workflow** for maintaining clean, linear history on main branch
- **All single logical features or bug fixes** (99% of use cases)

**Benefits:**
- Clean commit history on main branch
- Single commit per feature makes reverting easier
- Removes development noise from main branch

### Merge Commit (Use Only When Specifically Needed)
**When to use (RARE exceptions only):**
- **Long-running collaborative branches** with multiple developers and meaningful commit structure
- **Epic-level branches** where individual commit history provides significant value
- **Repository policy explicitly requires** preserving detailed contribution history
- **Complex features** where commit-by-commit development story is crucial for maintenance

**Benefits:**
- Preserves detailed development history
- Shows collaboration and individual contributions
- Maintains context of how feature was built

### Rebase Merge (Use Only for Repository Policy Requirements)
**When to use (POLICY-DRIVEN only):**
- **Repository explicitly requires** linear history without merge commits
- **Single developer, clean commits** that are already well-structured
- **Simple, straightforward changes** with no merge conflicts
- **Organizational standards** mandate rebase-only workflows

**Benefits:**
- Completely linear history
- No merge commits cluttering history
- Easy to follow chronological development

### Fast-Forward (Automatic When Applicable)
**When to use (AUTOMATIC detection):**
- **Single commit changes** that can be fast-forwarded automatically
- **Simple bug fixes or documentation updates** with no branch divergence
- **No conflicts** and direct linear progression from target branch
- **Git automatically detects** when fast-forward is possible and safe

## Example Interaction

```
User: /pr_merge 42

Claude: I'll merge PR #42 after validating it's ready. Let me check the current status...

---

# 🔍 **Pre-Merge Validation for PR #42**

**📋 PR Details:**
- **Title**: "Add user authentication system"
- **Author**: @developer123
- **Target**: `main` ← `issue-123-user-authentication`
- **Related Issues**: Closes #123, #124

---

## ✅ **Merge Readiness Assessment**

### **🔍 Review Status:**
- ✅ **Required reviews**: 2/2 approved (@tech-lead, @senior-dev)
- ✅ **Review feedback**: All conversations resolved
- ✅ **Code quality**: Passes all quality gates
- ✅ **Security scan**: No vulnerabilities detected

### **🤖 Automated Checks:**
- ✅ **Build pipeline**: All checks passing ✓
- ✅ **Unit tests**: 127/127 tests passing (100%)
- ✅ **Integration tests**: 23/23 tests passing (100%)
- ✅ **Code coverage**: 94% (above 90% threshold)
- ✅ **Security scan**: No critical or high vulnerabilities
- ✅ **Performance tests**: Within acceptable thresholds

### **🔄 Merge Status:**
- ✅ **Branch conflicts**: No conflicts with main
- ✅ **Branch freshness**: Up to date with target branch
- ✅ **Commit signatures**: All commits properly signed

### **📋 Repository Rules:**
- ✅ **Branch protection**: All protection rules satisfied
- ✅ **Required status checks**: All required checks passing
- ✅ **Review requirements**: Minimum review count met
- ✅ **Admin enforcement**: No admin override required

**🎯 PR is fully validated and ready for merge!**

---

## 🎯 **Merge Strategy Recommendation**

**DEFAULT: Squash Merge (Enforced for Clean History)**

**Analysis:**
- **Commit count**: 7 commits on feature branch
- **Commit quality**: Mix of incremental changes and fixes
- **History value**: Low (work-in-progress commits) → Perfect for squashing
- **Feature scope**: Single logical authentication feature → Ideal squash candidate
- **Repository policy**: Squash merge enforced for clean Git history

**Squash Commit Message:**
```
feat(auth): implement JWT-based user authentication system (#42)

Complete authentication system with:
- User registration and login functionality
- JWT token generation and validation
- Protected route wrapper component
- Authentication context for global state management
- Comprehensive form validation and error handling
- Session persistence and logout functionality

Closes #123, #124
```

**Alternative Strategies Available (Use only when specifically justified):**
- Merge commit (only for long-running collaborative branches)
- Rebase merge (only for explicit repository policy requirements)
- Custom message (edit squash commit message before merge)

---

## 🔗 **Issue Management Plan**

**GitHub Issues to Close:**
- **#123** - "Add user authentication system" (Primary feature task)
- **#124** - "Implement login form validation" (Related task)

**GitHub Issue Updates:**
- Issue #123 → Status: closed with completion labels ✓
- Issue #124 → Status: closed with completion labels ✓
- Add merge commit references and completion timestamps

**Project Impact:**
- **Milestone M01**: Authentication Epic → 100% complete
- **Sprint S02**: 4/5 tasks completed → 80% complete

---

## 🧹 **Cleanup Operations**

**Remote Branch Cleanup:**
- Delete `issue-123-user-authentication` from origin
- Remove any related temporary branches

**Local Branch Cleanup:**
- Delete local feature branch
- Clean up tracking references
- Update local main branch

**Integration Updates:**
- Trigger deployment pipeline to staging
- Update documentation if auto-generation is configured
- Send team notifications about completed feature

---

**Ready to proceed with squash merge?** (Y/n/strategy/edit-message)

User: Y

Claude: 

---

# 🚀 **Executing Merge Operation**

## **Step 1: Merging PR #42**
```
🔄 Squashing and merging 7 commits into main...
✅ PR #42 successfully merged
✅ Commit SHA: a1b2c3d4e5f6789
```

## **Step 2: Closing Related Issues**
```
✅ Closed issue #123 - "Add user authentication system"
✅ Closed issue #124 - "Implement login form validation"
✅ Added merge commit reference to issue timeline
```

## **Step 3: Updating GitHub Issues**
```
✅ Updated GitHub issue #123 → status: closed, labels: completed
✅ Updated GitHub issue #124 → status: closed, labels: completed
✅ Added completion timestamp: 2025-01-15T16:45:00Z
✅ Added merge commit reference: a1b2c3d4e5f6789
```

## **Step 4: Branch Cleanup**
```
✅ Deleted remote branch: issue-123-user-authentication
✅ Deleted local branch: issue-123-user-authentication
✅ Cleaned up tracking references
✅ Updated local main branch to latest
```

## **Step 5: Project Updates**
```
✅ Updated Milestone M01: Authentication Epic → 100% complete
✅ Updated Sprint S02 progress: 4/5 tasks → 80% complete
✅ Marked milestone M01 as completed
```

## **Step 6: Automation Triggers**
```
✅ Triggered deployment pipeline to staging environment
✅ Sent team notification to #development Slack channel
✅ Updated release notes draft with authentication feature
✅ Initiated post-merge monitoring for 24 hours
```

---

# 🎉 **Merge Complete!**

**📊 Summary:**
- **PR #42**: Successfully merged with squash strategy
- **Issues resolved**: #123, #124 automatically closed
- **GitHub updates**: 2 issues updated to completed status with labels
- **Branch cleanup**: Feature branch removed from remote and local
- **Team notification**: Development team informed via Slack

**🚀 Deployment Status:**
- **Staging deployment**: ✅ Successful (2 minutes ago)
- **Production deployment**: 🕐 Scheduled for next release window
- **Health monitoring**: 📊 All systems operational

**📈 Project Impact:**
- **Authentication epic**: ✅ Completed (Milestone M01)
- **Sprint progress**: 80% complete (4/5 tasks done)
- **Next milestone**: User profile management (M02)

---

## **🔍 Post-Merge Monitoring**

**Deployment Health:**
- Build status: ✅ Successful
- Integration tests: ✅ All passing
- Performance metrics: ✅ Within normal range
- Error rates: ✅ No increase detected

**Feature Validation:**
- Authentication endpoints: ✅ Responding correctly
- Login flow: ✅ Working as expected  
- Protected routes: ✅ Properly secured
- Session management: ✅ Functioning correctly

**Next Steps:**
1. **QA Testing**: Authentication feature ready for user acceptance testing
2. **Documentation**: User guides updated with new auth flow
3. **Feedback Collection**: Monitor user feedback on authentication UX
4. **Performance Monitoring**: Watch authentication-related metrics

**Remaining Sprint Work:**
- **Task #125**: "Add password reset functionality" (1 task remaining)
- **Estimated completion**: End of week

Would you like me to:
1. **Check deployment status** in more detail
2. **Create next task** for password reset feature  
3. **Generate sprint summary** for stakeholder update
4. **Plan next milestone** (User profile management)

**Excellent work! The authentication system is now live and ready for users.** 🌟
```

## Advanced Merge Features

### Conflict Resolution Support
If conflicts are detected:
```
⚠️ Merge conflicts detected in:
- src/auth/AuthContext.js (lines 45-52)
- src/App.js (lines 12-18)

Options:
1. **Auto-resolve simple conflicts** (spacing, imports)
2. **Manual resolution required** (logic conflicts)
3. **Abort and request developer fix**

Attempting auto-resolution for simple conflicts...
✅ Resolved import conflicts automatically
❌ Manual resolution needed for AuthContext logic

Please resolve conflicts manually and re-run `/pr_merge 42`
```

### Smart Branch Protection Bypass
For urgent fixes with proper authorization:
```
⚠️ Branch protection rules prevent merge:
- Missing required review from security team
- Status check pending: security-scan

Override options (admin only):
1. **Emergency merge** (with audit trail)
2. **Wait for requirements** (recommended)
3. **Request security team review**

This appears to be a security fix. Requesting emergency merge approval...
```

### Deployment Integration
Coordinate with deployment systems:
```
🚀 **Deployment Coordination**

**Staging Deployment:**
✅ Automatically triggered
✅ Health checks passing
✅ Feature flags enabled

**Production Deployment:**
📅 Scheduled for maintenance window (Tonight 2 AM EST)
🔄 Can be triggered manually if urgent
📊 Monitoring dashboards updated

**Rollback Plan:**
- Immediate: Disable feature flags
- Full rollback: Revert commit a1b2c3d4e5f6789
- Database: No migrations to rollback
```

## Error Handling

### Pre-Merge Validation Failures
```
❌ Cannot merge PR #42:

**Blocking Issues:**
- ❌ Required review missing from @security-team
- ❌ CI check failing: integration-tests (2 tests failing)
- ❌ Merge conflict in src/auth/Login.js

**Required Actions:**
1. Fix failing integration tests
2. Resolve merge conflict in Login.js  
3. Request security team review
4. Re-run `/pr_merge 42` when ready

**Estimated Resolution Time:** 2-4 hours
```

### Post-Merge Issues
```
🚨 **Post-Merge Issue Detected**

**Problem:** Staging deployment failed
**Error:** Authentication service not responding
**Impact:** New authentication feature unavailable

**Automatic Actions Taken:**
✅ Rollback triggered automatically
✅ Incident created (#INC-2025-001)  
✅ On-call team notified
✅ Feature flag disabled

**Current Status:**
- Main branch: Stable (previous version)
- Authentication: Restored to working state
- Investigation: In progress

**Next Steps:**
1. Investigate deployment failure root cause
2. Fix issues in hotfix branch
3. Re-deploy when stable
```

### GitHub API Issues
```
⚠️ **GitHub API Connectivity Issue**

**Problem:** Unable to close issues #123, #124
**Cause:** GitHub API rate limit exceeded

**Completed Actions:**
✅ PR merged successfully
✅ Local files updated
✅ Branch cleanup completed

**Pending Actions:**
❌ Issue closure (will retry automatically)
❌ Team notifications (will retry)

**Manual Fallback:**
- Issues can be closed manually on GitHub
- Team notification sent via backup channel
- All other operations completed successfully
```

## Success Criteria

A successful PR merge includes:
- ✅ All pre-merge validations passed
- ✅ Optimal merge strategy selected and executed
- ✅ Related GitHub issues automatically closed
- ✅ Local task/bug files updated to completed status
- ✅ Feature branches cleaned up from remote and local
- ✅ Team notifications sent and deployment triggered
- ✅ Post-merge health monitoring initiated

## Integration Points

### With Release Management
Merged PRs contribute to:
- **Release notes**: Automatic categorization of features and fixes
- **Version calculation**: Semantic version bumping based on changes
- **Deployment planning**: Feature readiness for production release
- **Quality tracking**: Merge success rates and quality metrics

### With Project Management
Merge completion updates:
- **Milestone progress**: Automatic completion tracking
- **Sprint velocity**: Team productivity metrics
- **Issue resolution**: Stakeholder visibility into completed work
- **Resource planning**: Capacity analysis and future planning

Remember: The goal is to make merging seamless, reliable, and comprehensive. Handle all the tedious cleanup work automatically while ensuring quality and team communication throughout the process.