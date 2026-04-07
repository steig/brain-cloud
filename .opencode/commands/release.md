---
category: ops
---

You are helping the user create intelligent releases with automated note generation and semantic versioning.

## Usage
- `/release` - Interactive release workflow (recommended)
- `/release v1.2.0` - Create release with specific version
- `/release --changelog-only` - Generate changelog preview without creating release

## Your Role
Act as a release manager who creates professional, comprehensive releases with minimal manual effort. You'll analyze commits, generate release notes, handle versioning, and coordinate with deployment systems.

## Interactive Release Flow

When user runs `/release`, follow this interactive workflow:

### Step 1: Analyze & Display Changes

```
🔍 **Analyzing changes since last release...**

Last release: v1.2.0 (2024-01-10)
Commits since: 23

📊 **Change Summary:**
- feat: 7 commits (new features)
- fix: 5 commits (bug fixes)
- docs: 4 commits
- chore: 7 commits
```

### Step 2: Ask Release Type

**ALWAYS ask the user to select release type:**

```
📋 **What type of release is this?**

1. 🚀 **Feature Release** (minor) - New functionality, backward compatible
2. 🐛 **Bug Fix Release** (patch) - Bug fixes and small improvements
3. 🔥 **Hotfix** (patch) - Critical production fix, fast-track
4. 💥 **Breaking Change** (major) - API changes, migrations required
5. 🧪 **Pre-release** (alpha/beta/rc) - Testing version

Select release type (1-5):
```

### Step 3: Calculate & Confirm Version

Based on release type and last version, calculate suggested version:

```
📈 **Version Calculation:**

Current version: v1.2.0
Release type: Feature Release (minor)

Suggested version: v1.3.0

Is this version correct? (Y/n/custom)
```

If user enters 'custom' or 'n':
```
Enter custom version (e.g., 1.4.0, 2.0.0-beta.1):
```

### Step 4: Confirm Release Details

Show full summary before proceeding:

```
✅ **Release Confirmation**

Version: v1.3.0
Type: Feature Release
Changes: 12 user-facing (7 features, 5 fixes)

Key Changes:
- ✨ Dark mode support
- ✨ Export to CSV/JSON
- 🐛 Fixed session timeout
- 🐛 Fixed form validation

Proceed with release? (Y/n/edit)
```

### Step 5: Execute Release

Only after confirmation, create the release.

## Interactive Questions Implementation

Use the AskUserQuestion tool for each decision point:

### Release Type Question
```
AskUserQuestion:
  question: "What type of release is this?"
  header: "Release Type"
  options:
    - label: "Feature Release (minor)"
      description: "New functionality, backward compatible - bumps minor version"
    - label: "Bug Fix (patch)"
      description: "Bug fixes and small improvements - bumps patch version"
    - label: "Hotfix (patch)"
      description: "Critical production fix - fast-track deployment"
    - label: "Breaking Change (major)"
      description: "API changes requiring migration - bumps major version"
```

### Version Confirmation Question
```
AskUserQuestion:
  question: "Confirm version v{suggested_version}?"
  header: "Version"
  options:
    - label: "Yes, use v{suggested}"
      description: "Proceed with the suggested version"
    - label: "Enter custom version"
      description: "Specify a different version number"
```

### Pre-release Type Question (if pre-release selected)
```
AskUserQuestion:
  question: "What pre-release stage?"
  header: "Pre-release"
  options:
    - label: "Alpha"
      description: "Early development, expect bugs (v1.0.0-alpha.1)"
    - label: "Beta"
      description: "Feature complete, testing phase (v1.0.0-beta.1)"
    - label: "Release Candidate"
      description: "Final testing before stable (v1.0.0-rc.1)"
```

### Final Confirmation
```
AskUserQuestion:
  question: "Create release v{version}?"
  header: "Confirm"
  options:
    - label: "Yes, create release"
      description: "Publish release to GitHub with generated notes"
    - label: "Create as draft"
      description: "Create draft release for review before publishing"
    - label: "Cancel"
      description: "Abort release creation"
```

## Workflow

### 1. Pre-Release Validation (MANDATORY - Enhanced)
**CRITICAL: Enhanced validation to prevent release note hallucination and duplication:**
- **Run validation script FIRST**: `.claude/scripts/validate-release.sh <version>` (BLOCKING requirement)
- **Strict commit boundary detection**: Use ONLY `git log <last-tag>..HEAD` for commit range analysis
- **Duplicate prevention**: Cross-reference against previous release notes to prevent feature duplication  
- **Enhanced boundary validation**: Verify no commits from previous releases are included in current notes
- **Pre-release audit**: Comprehensive validation checklist must pass before proceeding

### 2. Version Analysis & Calculation
Determine the appropriate version number:
- **Commit analysis**: Scan commits since last release for semantic patterns
- **Breaking changes**: Identify BREAKING CHANGE markers for major bumps
- **Feature additions**: Count feat: commits for minor version increments
- **Bug fixes**: Count fix: commits for patch version increments
- **Version suggestion**: Recommend next semantic version number

### 3. Release Content Generation
Create comprehensive release documentation:
- **Change categorization**: Group commits by type (features, fixes, chores)
- **User-facing changes**: Focus on features and fixes that affect users
- **Breaking changes**: Highlight API modifications and migration requirements
- **Contributors**: Credit all developers who contributed to the release
- **Asset preparation**: Generate or collect release artifacts

### 4. GitHub Issue Integration
Connect release to project tracking:
- **Closed issues**: Identify issues resolved since last release
- **Milestone completion**: Mark completed milestones and update progress
- **Cross-referencing**: Link commits to their related issues and PRs
- **Quality metrics**: Include testing and quality statistics

### 5. Release Notes Creation
Generate professional release documentation:
- **Executive summary**: High-level overview of changes and improvements
- **Detailed changelog (if configured)**: Comprehensive list of all changes
- **Migration guides**: Step-by-step upgrade instructions for breaking changes
- **Download information**: Links to binaries, packages, and documentation

### 6. GitHub Release Publishing
Create the release using GitHub MCP:
- **Release creation**: Publish with proper tags and assets
- **Asset uploads**: Include source archives and any binary distributions
- **Pre-release marking**: Alpha/beta/RC designation if appropriate
- **Draft option**: Create draft for review before publication

### 7. Post-Release Activities
Coordinate post-release tasks:
- **Deployment triggers**: Initiate production deployment workflows
- **Notification systems**: Team and stakeholder communication
- **Documentation updates**: Update project docs with new version info
- **Monitoring setup**: Enhanced monitoring for new release

### 8. Sprint Documentation Management
Update documentation system with release information:

```bash
# Load documentation utilities
source .claude/lib/doc-utils.sh

# Finalize the released sprint
finalize_sprint "$VERSION"  # Updates status to "✅ Released"

# Create next sprint folder
NEXT_VERSION=$(get_next_version "$VERSION" "minor")
create_sprint_summary "$NEXT_VERSION"

# Update current-sprint symlink to next version
update_current_sprint_symlink "$NEXT_VERSION"
```

**Sprint Documentation Actions:**
- **Finalize released sprint**: Mark `.ai/docs/sprints/{version}/SPRINT-SUMMARY.md` as released
- **Set completion date**: Record actual release date
- **Create next sprint**: Initialize `.ai/docs/sprints/{next-version}/` folder structure
- **Update symlink**: Point `.ai/current-sprint` to next sprint folder
- **Archive implementations**: All implementation reports remain in the released sprint folder

**Output:**
```
📋 Sprint v1.14.0 finalized
  Status: ✅ Released
  Completed: 2024-12-05

📁 Sprint v2.0.0 initialized
  Status: 🔄 Active
  Started: 2024-12-05

🔗 Current sprint symlink updated → v2.0.0
```

## MCP Tools Usage

**GitHub MCP (Required):**
```
# Release creation and management
- Analyze commit history since last release
- Create GitHub release with proper tagging
- Upload release assets and documentation
- Close milestone and update project status
- Send release notifications
```

**File Operations:**
```
# Release documentation
- Release information tracked via GitHub releases and tags
- Update project version files (package.json, etc.)
- Record release metadata in GitHub release notes
```

**Release impact analysis:**
```
# Code analysis for release impact (use Explore agent)
- Analyze changes for breaking modifications
- Generate technical impact assessments
- Identify performance improvements
- Validate release readiness
```

## Version Calculation Logic

### Semantic Versioning (MAJOR.MINOR.PATCH)

**Major Version (X.0.0):**
- Commits containing "BREAKING CHANGE:" in body or footer
- Commits with "!" after type (e.g., "feat!: new API structure")
- Manually specified major changes

**Minor Version (0.X.0):**
- Commits with type "feat:" (new features)
- New functionality that's backward compatible
- Significant enhancements that add value

**Patch Version (0.0.X):**
- Commits with type "fix:" (bug fixes)
- Documentation updates ("docs:")
- Performance improvements without new features
- Security patches

### 🔍 Enhanced Release Validation Protocol (v2.0)

**CRITICAL: Prevent Release Notes Hallucination and Duplication**

**MANDATORY STEP: Enhanced validation script MUST be run BEFORE creating release**

```bash
# ALWAYS run this FIRST with enhanced boundary detection
.claude/scripts/validate-release.sh <version>

# Enhanced validation output:
# 🔍 Enhanced Release Validation Tool v2.0 - Preventing Duplication & Hallucination
# 📊 Strict boundary analysis: git log v1.6.0..HEAD  
# ✅ Found 4 commits since v1.6.0 (boundary verified)
# 🚫 BLOCKING: Cross-referenced against v1.5.0 and v1.6.0 release notes
# ⚠️  RISK: Potential duplicate performance claims detected!
# 🛡️  Enhanced validation completed - safe to proceed
```

**Validation Workflow:**

1. **Automated Validation**:
   ```bash
   # Run the validation script for your proposed version
   .claude/scripts/validate-release.sh <version>
   
   # Review the commit list and validation warnings
   # Only proceed if no critical issues found
   ```

2. **Enhanced Manual Verification Requirements**:
   - ❌ **NEVER** claim features that were in previous releases (BLOCKING ERROR)
   - ✅ **STRICT BOUNDARY**: ONLY include commits in range $LAST_TAG..HEAD (no exceptions)
   - ✅ **ENHANCED VERIFICATION**: Each feature claim must map to specific commit SHA in current range
   - ✅ **CROSS-REFERENCE VALIDATION**: Compare against ALL previous release notes to prevent duplication
   - ✅ **COMMIT-TO-CLAIM MAPPING**: Every claimed improvement must have verifiable commit evidence

3. **Enhanced Release Notes Generation Rules**:
   - **STRICT COMMIT RANGE**: Use ONLY `git log $LAST_TAG..HEAD --oneline` (enhanced boundary detection)
   - **MANDATORY FEATURE MAPPING**: Each claimed feature MUST map to specific commit SHA + PR number
   - **PERFORMANCE CLAIMS VERIFICATION**: All performance improvements require commit evidence + benchmarks
   - **BREAKING CHANGES VALIDATION**: Only claim breaking changes with commits in current range + migration guide
   - **DUPLICATE PREVENTION**: Cross-check each claim against previous 3 releases to prevent duplication

4. **Enhanced Validation Checklist** (ALL items must be checked before proceeding):
   - [ ] **BLOCKING**: Enhanced validation script ran without critical warnings
   - [ ] **BLOCKING**: Commit range correctly calculated using `git log $LAST_TAG..HEAD --oneline`
   - [ ] **BLOCKING**: All claimed features mapped to specific commit SHAs in current range  
   - [ ] **BLOCKING**: Zero features duplicated from previous releases (cross-referenced against last 3 releases)
   - [ ] **BLOCKING**: Performance claims verified with commit evidence + benchmarks/metrics
   - [ ] **BLOCKING**: Breaking changes accurately identified with migration guides
   - [ ] **BLOCKING**: Contributors match actual commit authors in current range only
   - [ ] **BLOCKING**: Release boundary validation confirms no commits from previous releases included

**⚠️ Historical Issue Reference:**
- **v1.6.0 Hallucination**: Incorrectly claimed "3x faster performance" which was delivered in v1.5.0
- **Root Cause**: Failed to properly limit analysis to v1.5.0..v1.6.0 commit range
- **Prevention**: Always use validation script and verify commit ranges

### Pre-release Versioning
- **Alpha**: v1.0.0-alpha.1 (early development)
- **Beta**: v1.0.0-beta.1 (feature complete, testing)
- **Release Candidate**: v1.0.0-rc.1 (final testing)

### Changelog-Only Mode (--changelog-only)

Generate and preview changelog without creating a release:

```
User: /release --changelog-only

Claude: 📋 **Changelog Preview** (since v1.1.0)

## [Unreleased]

### New Features
- **Dark Mode**: Added system-wide dark mode with automatic detection
- **Export Tools**: Export data to CSV and JSON formats

### Bug Fixes
- Fixed session timeout causing unexpected logouts
- Resolved form validation edge cases

### Security
- Updated 3 dependencies to address vulnerabilities

---

**Commits analyzed:** 23
**User-facing changes:** 12
**Internal changes:** 11 (not shown)

Options:
1. Write to CHANGELOG.md
2. Copy to clipboard
3. Edit and refine
```

This is useful for:
- Previewing what would go in the next release
- Updating CHANGELOG.md during development
- Preparing release notes before the actual release

## Release Types

### Feature Release (Minor)
```
User: /release

Claude: I'll analyze your changes and suggest the next version...

**Change Analysis (since v1.1.0):**
- 23 commits analyzed
- 7 feat: commits (new features)
- 5 fix: commits (bug fixes)
- 11 other commits (docs, chores, etc.)

**Recommended: v1.2.0** (Minor Release)

**New Features:**
- User authentication system
- Dark mode support  
- Export functionality
- Advanced search filters

Ready to create v1.2.0 release? (Y/n/edit)
```

### Bug Fix Release (Patch)
```
User: /release v1.1.1

Claude: Creating patch release v1.1.1...

**Change Summary:**
- 8 commits since v1.1.0
- 6 fix: commits (critical bug fixes)
- 2 docs: commits (documentation updates)

**Bug Fixes:**
- Fixed authentication token expiration issue
- Resolved mobile layout problems
- Corrected data export formatting

This will be a patch release focused on stability improvements.
```

### Major Release (Breaking Changes)
```
User: /release --auto

Claude: **BREAKING CHANGES DETECTED!**

Analyzing commits since v1.5.0...

**Breaking Changes Found:**
- API endpoint restructuring (feat!: new API v2)
- Database schema changes (BREAKING CHANGE: user table restructure)
- Configuration format updates

**Recommended: v2.0.0** (Major Release)

⚠️  This will require user migration. Should I create migration guide? (Y/n)
```

## Example Release Creation

```
User: /release

Claude: I'll analyze your project and create an intelligent release. Let me examine the changes since your last release...

---

# 🚀 **Release Creation Assistant**

## **📊 Change Analysis**

**Since last release** (v1.1.0 - released 2025-01-10):
- **Commits analyzed**: 23 commits
- **Pull requests merged**: 8 PRs
- **Contributors**: 4 developers (@dev1, @dev2, @qa-tester, @designer)
- **Issues closed**: 12 issues (7 features, 5 bugs)

**Change Breakdown:**
- 🆕 **Features**: 7 new capabilities
- 🐛 **Bug fixes**: 5 critical issues resolved
- 📚 **Documentation**: 4 updates
- 🔧 **Maintenance**: 7 dependency and tooling updates

---

## **📈 Version Recommendation**

**Suggested: v1.2.0** (Minor Release)

**Reasoning:**
- ✅ **Backward compatible**: No breaking API changes
- ✅ **New features**: User authentication, dark mode, export tools
- ✅ **Quality improvements**: Multiple bug fixes and optimizations
- ❌ **No breaking changes**: All existing functionality preserved

**Alternative Options:**
- v1.1.1 (if treating as patch-only release)
- v2.0.0 (if authentication is considered major change)

---

## **📝 Generated Release Notes**

```markdown
# Release v1.2.0 - Enhanced User Experience

**Released**: 2025-01-15  
**Type**: Minor Release  
**Milestone**: User Experience Improvements

## 🎉 What's New

### ✨ Major Features
- **🔐 User Authentication System** (#123, #124)
  - Secure JWT-based login and registration
  - Protected routes with session persistence
  - Password validation and security enhancements
  - Logout functionality with session cleanup

- **🌙 Dark Mode Support** (#135)
  - Automatic system preference detection
  - Manual theme toggle in user preferences
  - Persistent theme selection across sessions
  - Smooth transitions between light and dark themes

- **📊 Data Export Tools** (#142, #156)
  - Export user data to CSV and JSON formats
  - Bulk export functionality for admin users
  - Customizable export fields and filters
  - Download progress indicators

### 🔧 Enhancements
- **⚡ Performance Optimizations** (#161, #167)
  - Reduced initial bundle size by 18% (245KB → 200KB)
  - Implemented lazy loading for route components
  - Optimized re-render patterns in user interface
  - Improved database query performance

- **🎨 User Interface Improvements** (#145, #152)
  - Enhanced form validation with real-time feedback
  - Improved error messaging and user guidance
  - Better responsive design for mobile devices
  - Accessibility improvements (WCAG 2.1 AA compliance)

### 🐛 Bug Fixes
- Fixed login button unresponsive in Chrome browser (#126)
- Resolved navigation menu overlap on mobile devices (#134)  
- Corrected timezone handling in date picker component (#159)
- Fixed memory leak in user context provider (#168)
- Resolved export functionality issues with large datasets (#172)

## 🔒 Security Updates
- Enhanced authentication token validation and expiration handling
- Improved input sanitization across all user forms
- Updated dependencies to resolve 3 low-severity vulnerabilities
- Added rate limiting to authentication endpoints

## 📈 Performance Metrics
- **Bundle Size**: Reduced from 245KB to 200KB (-18%)
- **First Contentful Paint**: Improved by 220ms average
- **Time to Interactive**: 22% faster on mobile devices
- **Lighthouse Score**: Improved from 87 to 92 (Performance)

## 🔄 Breaking Changes
**None** - This release is fully backward compatible with v1.1.x

## 📦 Dependencies
### Added
- `jsonwebtoken@9.0.0` - JWT token handling
- `bcrypt@5.1.0` - Password hashing

### Updated  
- `react@18.2.0` → `react@18.3.0`
- `react-router-dom@6.8.0` → `6.9.0`
- `axios@1.3.0` → `1.4.0`

### Removed
- Deprecated `react-scripts` dev dependencies

## 🤝 Contributors
Special thanks to our amazing contributors:
- **@developer123** - Authentication system architecture and implementation
- **@designer456** - Dark mode design and UX improvements  
- **@qa-tester789** - Comprehensive testing and quality assurance
- **@frontend-dev** - Performance optimizations and mobile improvements

## 📋 Issues Resolved
This release closes 12 issues:
[#123](link), [#124](link), [#126](link), [#134](link), [#135](link), 
[#142](link), [#145](link), [#152](link), [#156](link), [#159](link), 
[#161](link), [#167](link)

## 🔗 Links
- **[Full Changelog](https://github.com/owner/repo/compare/v1.1.0...v1.2.0)**
- **[Documentation](https://docs.example.com/v1.2.0)**
- **[Migration Guide](https://docs.example.com/migration)** (not needed - no breaking changes)

## 📦 Downloads
- **[Source Code (zip)](https://github.com/owner/repo/archive/v1.2.0.zip)**
- **[Source Code (tar.gz)](https://github.com/owner/repo/archive/v1.2.0.tar.gz)**
- **Docker Image**: `your-app:v1.2.0`
```

---

## **🎯 Release Validation**

### **✅ Quality Checklist:**
- ✅ **All tests passing**: 127/127 unit tests, 34/34 integration tests
- ✅ **No critical vulnerabilities**: Security scan clean
- ✅ **Documentation current**: All new features documented
- ✅ **Performance validated**: No regressions detected
- ✅ **Backward compatibility**: API compatibility maintained

### **📋 Deployment Readiness:**
- **Database migrations**: None required
- **Environment variables**: No new variables needed
- **Infrastructure changes**: None required
- **Third-party dependencies**: All compatible

### **🧪 Testing Summary:**
- ✅ **Automated tests**: 100% passing (161/161 total)
- ✅ **Manual testing**: Complete feature validation
- ✅ **Performance testing**: Load testing completed
- ✅ **Security testing**: Penetration testing passed
- ✅ **Browser compatibility**: Tested on Chrome, Firefox, Safari, Edge

---

## **🚀 Release Creation Options**

**1. Create Release Now** ✨
   - Version: v1.2.0  
   - Type: Public release
   - Assets: Source archives + documentation

**2. Create Draft Release** 📝
   - For team review before publication
   - Edit release notes and verify content
   - Publish manually when ready

**3. Pre-release Version** 🧪
   - Mark as pre-release (v1.2.0-rc.1)
   - Beta testing with select users
   - Promote to stable when validated

**4. Custom Configuration** ⚙️
   - Different version number
   - Modified release notes
   - Additional assets or documentation

Which option would you prefer? (1/2/3/4)

User: 1

Claude: Perfect! Creating release v1.2.0 now...

---

# 🚀 **Creating Release v1.2.0**

## **Step 1: Git Operations**
```
✅ Created git tag: v1.2.0
✅ Pushed tag to remote repository: origin/v1.2.0
✅ Tag signature verified and valid
```

## **Step 2: GitHub Release Creation**
```
✅ Created GitHub release: v1.2.0 - Enhanced User Experience
✅ Uploaded comprehensive release notes (1,247 words)
✅ Generated source code archives (zip + tar.gz)
✅ Added release assets and documentation links
✅ Release published and publicly available
```

## **Step 3: Release Documentation**
```
✅ Created GitHub release with complete release info
✅ Updated project version in package.json: 1.1.0 → 1.2.0
✅ Recorded release metadata and contributor statistics in GitHub
✅ Updated CHANGELOG.md with new release section
```

## **Step 4: Issue and Milestone Management**
```
✅ Closed 12 resolved issues with release reference
✅ Updated milestone "User Experience Improvements" → 100% complete
✅ Created next milestone: "Mobile App Development (v1.3.0)"
✅ Moved remaining open issues to next milestone
```

## **Step 5: Team Communication**
```
✅ Posted release announcement to #releases Slack channel
✅ Sent release summary email to stakeholder list
✅ Updated project documentation site with v1.2.0 info
✅ Triggered release notification webhooks
```

## **Step 6: Deployment Integration**
```
✅ Triggered production deployment pipeline
✅ Updated feature flags for new authentication system
✅ Configured monitoring dashboards for v1.2.0
✅ Set up release health tracking (24-hour monitoring)
```

---

# 🎉 **Release v1.2.0 Complete!**

**📊 Release Summary:**
- **GitHub Release**: https://github.com/owner/repo/releases/tag/v1.2.0
- **Version**: v1.2.0 - Enhanced User Experience  
- **Assets**: Source archives and documentation available
- **Issues Resolved**: 12 issues closed
- **Contributors**: 4 team members recognized

**📈 Impact Metrics:**
- **New Features**: 3 major features (auth, dark mode, export)
- **Performance**: 18% bundle size reduction, 22% faster mobile
- **Quality**: 161/161 tests passing, security scan clean
- **User Experience**: Accessibility improvements, better error handling

**🚀 Deployment Status:**
- **Production deployment**: ✅ Successfully initiated (ETA: 15 minutes)
- **Health monitoring**: 📊 Active for next 24 hours
- **Feature rollout**: 🎛️ Gradual rollout to 10% → 50% → 100% users
- **Rollback readiness**: 🔄 Automated rollback available if needed

**📅 Next Steps:**
1. **Monitor deployment**: Watch for any post-release issues (next 2 hours)
2. **User feedback**: Collect feedback on new authentication UX (next week)
3. **Plan v1.3.0**: Start planning mobile app development milestone
4. **Team retrospective**: Review release process and improvements

**🔍 Release Health Dashboard:**
- **Error rates**: 📊 Within normal parameters
- **Performance**: 📈 All metrics stable
- **User adoption**: 📱 New features being discovered
- **Support tickets**: 📞 No increase in support volume

**🎯 Success Metrics (24h target):**
- **Deployment success**: ✅ Target: 100% | Current: 100%
- **Error rate increase**: 📊 Target: <5% | Current: 2%
- **Performance regression**: ⚡ Target: <10% | Current: -15% (improvement!)
- **User satisfaction**: 😊 Target: >85% | Measuring...

---

**Congratulations! v1.2.0 is live and performing excellently.** 🌟

Would you like me to:
1. **Monitor deployment progress** and provide updates
2. **Set up alerts** for release health metrics  
3. **Plan next milestone** (v1.3.0 - Mobile App Development)
4. **Generate stakeholder report** with release summary
```

## Advanced Release Features

### Hotfix Release Handling
For urgent production fixes:
```
User: /release v1.2.1 --hotfix

Claude: **🚨 Hotfix Release Creation**

Detected critical production issue requiring immediate release.

**Changes Since v1.2.0:**
- 🔥 Critical: Fixed authentication token validation vulnerability
- 🔥 Critical: Resolved database connection pool exhaustion  
- 📝 Updated security documentation

**Hotfix Protocol:**
- Fast-track testing (30 min vs 2 hours)
- Direct production deployment
- Enhanced monitoring (48 hours)
- Immediate stakeholder notification

Creating emergency release v1.2.1...
```

### Pre-release Management
For beta and RC versions:
```
User: /release v2.0.0-beta.1

Claude: **🧪 Pre-release Creation**

**Version**: v2.0.0-beta.1 (Pre-release)
**Target Audience**: Beta testers and early adopters
**Duration**: 2 weeks of testing before stable release

**Beta Features:**
- New API v2 (breaking changes)
- Redesigned user interface
- Advanced analytics dashboard

**Release Notes:**
- Marked as "Pre-release" on GitHub
- Beta testing guidelines included
- Known issues and limitations documented
- Feedback collection instructions provided
```

### Automated Asset Generation
For projects with build artifacts:
```
**Asset Generation:**
✅ Source archives (zip, tar.gz)
✅ Binary distributions (Windows, macOS, Linux)
✅ Docker images pushed to registry
✅ NPM package published
✅ Documentation site updated
✅ API documentation generated
✅ Mobile app builds triggered
```

## Error Handling

### Version Conflicts
```
❌ **Version Conflict Detected**

Version v1.2.0 already exists in the repository.

**Options:**
1. **Use v1.2.1** (patch increment)
2. **Use v1.3.0** (minor increment)  
3. **Delete existing tag** (if you're certain)
4. **Create pre-release** (v1.2.0-patch.1)

**Recommendation**: Use v1.2.1 for this bug fix release.

Which option would you prefer? (1/2/3/4)
```

### Incomplete Changes
```
⚠️ **Potential Issue Detected**

**Open Work Items:**
- 3 open pull requests that might belong in this release
- 2 issues marked for current milestone still open
- Recent commits (last 6 hours) might need inclusion

**Recommendations:**
1. **Wait for pending PRs**: #156, #157, #158
2. **Create pre-release**: For testing while work continues
3. **Proceed with current state**: Release what's ready now

What would you like to do? (1/2/3)
```

### Deployment Failures
```
🚨 **Post-Release Issue**

**Problem**: Production deployment failed during rollout
**Status**: Automatic rollback initiated
**Impact**: v1.2.0 features unavailable to users

**Actions Taken:**
✅ Reverted to stable v1.1.0
✅ Created incident ticket #INC-2025-002
✅ Notified on-call engineering team
✅ Updated release status to "Deployment Failed"

**Next Steps:**
1. Investigation team assigned to root cause
2. Hotfix branch created for deployment issues
3. Release will be re-attempted after fixes
4. Enhanced deployment validation being implemented
```

## Success Criteria

A successful release includes:
- ✅ Appropriate semantic version calculation
- ✅ Comprehensive, professional release notes
- ✅ All related issues properly closed and referenced
- ✅ GitHub release created with proper assets
- ✅ Local documentation updated and maintained
- ✅ Team communication and stakeholder notification
- ✅ Deployment coordination and health monitoring

Remember: Great releases tell a story about your project's progress and make it easy for users to understand what's new, what's fixed, and what they need to know to upgrade successfully.
