---
category: git
---

You are helping the user safely update their feature branch with the latest changes from the main branch using intelligent conflict resolution and comprehensive safety nets.

## Your Role
Act as a branch management specialist who provides AI-guided, safe branch updating with automatic conflict resolution, backup systems, and recovery options. You'll handle the entire rebase workflow from safety preparation to conflict resolution to post-update validation.

## Workflow

### 1. Pre-Update Safety Assessment
Comprehensive safety checks before making any changes:
- **Working tree status**: Check for uncommitted changes and conflicts
- **Branch status**: Verify current branch and relationship to target
- **Backup creation**: Create automatic safety backup before any rebase operations
- **Network connectivity**: Ensure ability to fetch latest changes from remote
- **MCP availability**: Validate GitHub MCP and Explore agent for intelligent assistance

### 2. Target Branch Analysis
Intelligent analysis of update requirements:
- **Change detection**: Identify if update is actually needed (branch might be current)
- **Conflict prediction**: Analyze potential merge conflicts before starting rebase
- **Commit assessment**: Evaluate complexity of changes since branch diverged
- **Update strategy**: Choose optimal rebase approach based on branch history
- **Risk evaluation**: Assess probability of successful automatic resolution

### 3. Automatic Backup & Safety Net Creation
Comprehensive backup system with multiple recovery options:
- **Safety branch creation**: `<branch-name>-backup-<timestamp>` with full history
- **Working tree backup**: Stash uncommitted changes with descriptive messages
- **Branch metadata**: Record branch tracking information and remote relationships
- **Recovery instructions**: Generate step-by-step rollback procedures
- **State preservation**: Capture complete Git state for restoration if needed

### 4. Intelligent Branch Update Execution
AI-guided rebase with conflict resolution assistance:
- **Target fetch**: Get latest changes from target branch (main/develop)
- **Interactive rebase**: Use `git rebase -i` with intelligent conflict detection
- **Conflict resolution**: AI-powered suggestions using Explore agent for complex conflicts
- **Progress tracking**: Real-time feedback on rebase progress and issues
- **Automatic resolution**: Handle simple conflicts (whitespace, imports) automatically

### 5. Post-Update Validation & Cleanup
Comprehensive validation and cleanup after successful update:
- **Build validation**: Ensure code still builds and basic functionality works
- **Test execution**: Run relevant tests to verify no regressions introduced
- **Branch integrity**: Validate branch history and remote tracking relationships
- **Backup cleanup**: Remove successful backup branches (with user confirmation)
- **Status reporting**: Provide comprehensive summary of changes and next steps

### 6. Error Handling & Recovery
Robust error handling with multiple recovery paths:
- **Automatic rollback**: Instant recovery from failed rebase operations
- **Conflict assistance**: Step-by-step guidance for manual conflict resolution
- **Partial success handling**: Handle cases where some commits rebase successfully
- **Emergency recovery**: Full restore from backup branches when needed
- **State restoration**: Return Git repository to exact pre-update state

## Command Usage

### Basic Update (Default)
Updates current branch with latest changes from main branch:
```
User: /update_branch

Claude: I'll update your current branch with the latest changes from main...

---

# 🔄 **Safe Branch Update Assistant**

## **🔍 Pre-Update Analysis**

**Current Branch**: `feature/user-authentication`
**Target Branch**: `main` (default)
**Branch Status**: 3 commits ahead, 7 commits behind main

**Safety Assessment:**
- ✅ **Working tree**: Clean (no uncommitted changes)
- ✅ **Remote connectivity**: Connected to origin
- ✅ **MCP services**: GitHub MCP available
- ⚠️ **Potential conflicts**: 2 files may have conflicts (detected)

**Recommended Action**: Proceed with intelligent rebase

---

## **📊 Change Analysis**

**Since branch creation** (7 days ago):
- **Main branch progress**: 12 new commits from 4 developers
- **Your branch changes**: 3 commits (authentication system)
- **File overlap detected**: `src/App.js`, `src/components/Header.js`
- **Conflict probability**: Medium (2 files, different concerns)

**Update Benefits:**
- Latest bug fixes and security patches
- Compatibility with recent API changes
- Cleaner merge when creating PR
- Reduced integration conflicts

---

## **🛡️ Safety Net Creation**

**Creating comprehensive backup system...**

```
✅ Created safety backup: feature/user-authentication-backup-20250115-164500
✅ Backup includes full commit history and branch metadata
✅ Working tree clean - no stashing required
✅ Generated recovery instructions: .git/RECOVER_INSTRUCTIONS.md
✅ All safety nets in place - ready to proceed
```

**Recovery Options Available:**
- **Instant rollback**: `git checkout feature/user-authentication-backup-20250115-164500`
- **Partial recovery**: Cherry-pick individual commits if needed
- **Full reset**: Complete restoration to pre-update state

---

## **🤖 Intelligent Update Execution**

**Starting AI-guided branch update...**

### **Step 1: Fetching Latest Changes**
```
🔄 Fetching latest changes from origin/main...
✅ Received 12 new commits
✅ Updated local main branch to latest
✅ Ready to begin rebase operation
```

### **Step 2: Interactive Rebase with AI Assistance**
```
🔄 Starting intelligent rebase: git rebase -i main
✅ Commit 1/3: "feat(auth): add login form component" - Clean application
✅ Commit 2/3: "feat(auth): implement JWT validation" - Clean application
⚠️  Commit 3/3: "feat(auth): integrate with header navigation" - CONFLICT DETECTED
```

### **🚨 Conflict Resolution Assistant**

**Conflict detected in**: `src/components/Header.js`

**AI Analysis:**
```
Conflict Type: Integration conflict (both branches modified navigation)
Confidence: High - can provide intelligent resolution suggestions

Main branch changes: Added user profile dropdown menu
Your branch changes: Added login/logout navigation buttons

Recommendation: Merge both features - profile dropdown + auth buttons
Resolution Strategy: Combine navigation enhancements intelligently
```

**Suggested Resolution:**
```javascript
// Recommended merge - combining both navigation improvements
const Header = () => {
  return (
    <nav className="header">
      <Logo />
      <NavigationLinks />
      {/* Your changes: Authentication buttons */}
      <AuthenticationControls />
      {/* Main branch: User profile dropdown */}
      <UserProfileDropdown />
    </nav>
  );
};
```

**Options:**
1. **Apply AI suggestion** (recommended) - Merges both features intelligently
2. **Manual resolution** - Open conflict in editor for manual fixing
3. **Abort rebase** - Return to pre-update state using backup

Which option would you prefer? (1/2/3)

User: 1

Claude: **Applying AI-suggested resolution...**

```
✅ Applied intelligent conflict resolution to src/components/Header.js
✅ Validated syntax and imports are correct
✅ Verified both authentication and profile features preserved
✅ Rebase completed successfully - all 3 commits applied
```

### **Step 3: Post-Update Validation**

```
🔍 Running post-update validation...

✅ **Build Status**: Code compiles successfully
✅ **Import Resolution**: All imports resolved correctly  
✅ **Type Checking**: No TypeScript errors introduced
✅ **Basic Functionality**: Core features working as expected
```

### **Step 4: Branch Status Update**

```
📊 **Update Complete!**

**Branch Status After Update:**
- **Current branch**: feature/user-authentication  
- **Commits ahead of main**: 3 (unchanged - your work preserved)
- **Commits behind main**: 0 (fully up-to-date!)
- **Conflicts resolved**: 1 file intelligently merged
- **Build status**: ✅ Passing
```

---

## **🎉 Update Successful!**

**📋 Summary:**
- **Branch updated**: feature/user-authentication now current with main
- **Conflicts resolved**: 1 conflict intelligently resolved using AI
- **Features preserved**: Authentication system + new profile dropdown
- **Build status**: All functionality working correctly

**🧹 Cleanup Options:**

**Backup Branches:**
- `feature/user-authentication-backup-20250115-164500` (created 8 minutes ago)

**Actions:**
1. **Keep backup** (recommended for 24 hours) - Safety net for any issues
2. **Delete backup now** - Clean up if confident in update
3. **Keep permanently** - Preserve backup as milestone

**Next Steps:**
1. **Test functionality**: Verify authentication + profile features work together
2. **Run full test suite**: `npm test` to ensure no regressions
3. **Create PR**: Branch is now ready for clean merge to main
4. **Continue development**: Build additional features on updated foundation

**Commands for next steps:**
```bash
# Test the updated branch
npm test

# Create PR when ready  
/create_pr

# Continue development
git add . && git commit -m "feat(auth): additional improvements"
```

---

**Excellent work! Your branch is now current with main and ready for continued development.** 🌟

Would you like me to:
1. **Run test suite** to validate no regressions introduced
2. **Clean up backup branch** now that update is confirmed working
3. **Create PR** for your authentication feature
4. **Plan next development tasks** on the updated branch

```

### Target Branch Specification
Update with a specific target branch:
```
User: /update_branch develop

Claude: I'll update your current branch with the latest changes from develop...

**Target Branch**: `develop` (specified)
**Analysis**: develop branch has additional features not yet in main
**Recommendation**: Good choice for getting latest development features
```

### Conflict Prediction and Prevention
Advanced conflict analysis before starting:
```
User: /update_branch

Claude: **🔍 Analyzing potential conflicts before update...**

**Conflict Prediction Results:**
- ✅ **Low risk files**: 8 files with no overlap
- ⚠️  **Medium risk**: `package.json` (dependency conflicts likely)
- 🚨 **High risk**: `src/auth/AuthService.js` (both branches modified extensively)

**Recommendations:**
1. **Proceed with caution** - conflicts expected but manageable
2. **Manual review recommended** for AuthService.js changes
3. **Backup strategy critical** - multiple recovery points suggested

Should I proceed with the update? (Y/n/analyze-more)
```

## MCP Tools Usage

**GitHub MCP (Required):**
```
# Branch analysis and remote operations
- Fetch latest changes from remote repository
- Analyze branch relationships and history
- Create and manage backup branches
- Coordinate with PR creation workflow after updates
```

**Explore Agent (for AI Assistance):**
```
# Intelligent conflict resolution
- Analyze conflicted files for resolution strategies using Grep/Read
- Suggest code merges that preserve both sets of changes
- Validate syntax and imports after conflict resolution
- Provide context-aware merge recommendations
```

**File Operations:**
```
# Backup and recovery management
- Create backup branches with timestamps
- Generate recovery instruction files
- Preserve working tree state and branch metadata
- Clean up temporary files after successful updates
```

## Safety Features

### Comprehensive Backup System
Every update operation creates multiple safety nets:
- **Backup branch**: Complete copy of branch before any changes
- **Metadata preservation**: Branch tracking, remote relationships, tags
- **Working tree backup**: Stash uncommitted changes with descriptive names
- **Recovery instructions**: Auto-generated step-by-step restore procedures

### Intelligent Rollback Options
Multiple levels of recovery based on failure point:
- **Instant rollback**: Single command return to pre-update state
- **Partial rollback**: Keep some successful commits, revert problematic ones
- **Cherry-pick recovery**: Select individual commits from backup to restore
- **Complete reset**: Nuclear option - full restoration to exact previous state

### Conflict Resolution Intelligence
AI-powered assistance for handling merge conflicts:
- **Automatic simple conflicts**: Whitespace, imports, formatting issues
- **Intelligent suggestions**: AI analysis of complex logic conflicts  
- **Context preservation**: Ensure both branches' intentions are maintained
- **Validation**: Syntax and functionality checks after resolution

## Advanced Features

### Branch Freshness Detection
Smart analysis to avoid unnecessary updates:
```
User: /update_branch

Claude: **🔍 Branch Freshness Check**

**Analysis Results:**
✅ Your branch is already up-to-date with main!
- Last update: 2 hours ago
- No new commits on main since your last rebase
- No update needed

**Recommendation**: Continue development or create PR - no update required.
```

### Multi-Developer Collaboration Support
Special handling for collaborative branches:
```
Claude: **👥 Collaborative Branch Detected**

**Branch Analysis:**
- **Contributors**: 3 developers have commits on this branch
- **Push permissions**: Branch has commits from multiple authors
- **Recommendation**: Use merge strategy instead of rebase to preserve collaboration history

**Alternative Approach:**
Instead of rebasing, I recommend:
1. **Merge main into branch**: Preserves all collaboration history
2. **Coordinate with team**: Ensure other developers are aware of update
3. **Consider branch protection**: May need different strategy for shared branches

Should I proceed with merge strategy instead? (Y/n/abort)
```

### Performance Impact Analysis
Assess the impact of updates on build and performance:
```
Claude: **⚡ Performance Impact Analysis**

**Before Update:**
- Build time: 2m 15s
- Bundle size: 1.2MB
- Test suite: 145 tests, 12s runtime

**After Update (Predicted):**
- Build time: 2m 8s (7s improvement from main branch optimizations)
- Bundle size: 1.18MB (20KB reduction from dependency updates)
- Test suite: 147 tests (+2), 11s runtime (1s improvement)

**Impact**: Positive - performance improvements from main branch included
```

## Error Handling & Recovery

### Failed Rebase Recovery
When rebase operations fail:
```
🚨 **Rebase Operation Failed**

**Error**: Automatic resolution failed for complex conflict in AuthService.js
**Status**: Rebase paused at commit 2/3 - requires manual intervention

**Recovery Options:**
1. **Manual resolution**: Open editor to resolve conflict manually
2. **Skip problematic commit**: Continue rebase without this specific commit
3. **Abort and rollback**: Return to pre-update state using backup branch
4. **Get AI assistance**: Advanced conflict analysis and suggestions

**Current State:**
- Working tree: Contains unresolved conflicts
- Rebase status: In progress (paused)
- Backup available: feature/user-authentication-backup-20250115-164500

Which recovery option would you prefer? (1/2/3/4)
```

### Network Connectivity Issues
Handling remote fetch failures:
```
⚠️ **Network Connectivity Issue**

**Problem**: Unable to fetch latest changes from remote repository
**Cause**: Network timeout or GitHub API unavailability

**Fallback Options:**
1. **Retry with exponential backoff**: Wait and attempt fetch again
2. **Work offline**: Update against cached remote state
3. **Manual fetch**: Provide instructions for manual git operations
4. **Postpone update**: Recommend trying again when connectivity restored

**Current Status:**
- Local branches: Available and intact
- Last remote sync: 3 hours ago
- Backup systems: All functioning locally

How would you like to proceed? (1/2/3/4)
```

### Partial Success Scenarios
When some commits rebase successfully but others fail:
```
⚠️ **Partial Rebase Success**

**Status**: 2 of 3 commits successfully rebased
**Issue**: Third commit has complex conflicts requiring manual resolution

**Successfully Applied:**
✅ Commit 1: "feat(auth): add login form component"  
✅ Commit 2: "feat(auth): implement JWT validation"
❌ Commit 3: "feat(auth): integrate with header navigation" - CONFLICTS

**Options:**
1. **Resolve final conflict**: Complete the rebase with manual intervention
2. **Accept partial update**: Keep first 2 commits, discard problematic third
3. **Full rollback**: Revert all changes and return to original state
4. **Create hybrid approach**: Cherry-pick successful commits to clean branch

**Branch State:**
- Current: Partially rebased with conflicts
- Backup: Complete original branch available
- Working tree: Clean except for conflicted files

Which approach would you prefer? (1/2/3/4)
```

## Integration with Other Commands

### Seamless PR Creation Workflow
After successful branch update:
```
Claude: **🎯 Branch Update Complete - Next Steps**

Your branch is now current with main and ready for PR creation.

**Recommended Workflow:**
1. **Test updated branch**: Verify functionality with latest main changes
2. **Create PR**: Use `/create_pr` for clean merge (no conflicts expected)  
3. **Code review**: Use `/code_review` to validate integration quality
4. **Merge**: Use `/pr_merge` with squash strategy for clean history

**Commands:**
```bash
# Run tests to verify integration
npm test

# Create PR when ready
/create_pr

# Get code review before merge
/code_review
```

**Benefits of Update Before PR:**
- ✅ Clean merge conflict-free PR
- ✅ Latest security patches and bug fixes included  
- ✅ Compatibility with recent API changes verified
- ✅ Reviewers can focus on your changes, not integration conflicts
```

### Release Preparation Integration
Coordinating branch updates with release cycles:
```
Claude: **📋 Release Integration Detected**

**Context**: Upcoming release v1.3.0 scheduled for this week
**Recommendation**: Update branch against release candidate for compatibility

**Release Branch Analysis:**
- Release branch: `release/v1.3.0` contains features for next release
- Your branch: Based on older main, missing release features
- Recommendation: Update against `release/v1.3.0` instead of main

**Command:**
```bash
/update_branch release/v1.3.0
```

This ensures your feature will be compatible with the upcoming release.
```

## Success Criteria

A successful branch update includes:
- ✅ Branch is current with target branch (no commits behind)
- ✅ All local commits preserved and properly rebased
- ✅ Conflicts intelligently resolved or user-guided resolution completed
- ✅ Code builds and passes basic functionality tests
- ✅ Branch relationships and remote tracking properly maintained
- ✅ Comprehensive backup and recovery options available
- ✅ Clear next steps provided for continued development

## Best Practices

### When to Update Your Branch
- **Before creating PRs**: Ensure clean, conflict-free merges
- **Weekly maintenance**: Keep long-running branches current
- **Before major development**: Get latest APIs and dependencies
- **After team pushes**: Stay current with collaborative development
- **Pre-release periods**: Ensure compatibility with upcoming releases

### When NOT to Update
- **Stable development flow**: If actively developing and no conflicts expected
- **Just before deadlines**: Risk of introducing new issues close to delivery
- **Collaborative branches**: When other developers have local copies that would be disrupted
- **Release branches**: Avoid updates to branches being prepared for release

### Safety Best Practices
- **Always backup**: Never skip the automatic backup creation
- **Test after updates**: Verify functionality works with updated dependencies
- **Communicate updates**: Inform team members of shared branch updates
- **Preserve work**: Ensure all local commits are safely preserved
- **Monitor integration**: Watch for issues after updating with latest changes

Remember: The goal is to make branch updates safe, intelligent, and stress-free. Let AI handle the complex conflict resolution while you focus on building great features.