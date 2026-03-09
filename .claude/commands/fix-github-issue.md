---
category: git
---

# Fix GitHub Issue

Please analyze and fix the GitHub issue: $ARGUMENTS.

Follow these steps using the LDC AI Framework:

## Explore Phase
1. **Use GitHub MCP to get issue details**:
   - mcp__github__git_show or gh issue view $ARGUMENTS
   - Understand the problem described in the issue
   - Identify related components and context

2. **Search the codebase for relevant files**:
   - Use Grep tool for error messages or keywords
   - Use Glob + Read to find related functions and symbols
   - mcp__memory__search_nodes for similar issues or patterns

## Plan Phase
3. **Use Sequential Thinking for analysis**:
   - mcp__sequential-thinking__sequentialthinking("analyze issue and create fix plan")
   - Consider multiple approaches and their trade-offs
   - Identify integration points and potential side effects

## Code Phase
4. **Implement the necessary changes**:
   - Follow existing code patterns found in exploration
   - Use Edit tool for targeted file changes
   - Use Write tool for new files if needed

5. **Write and run tests**:
   - Find existing test patterns using Grep tool
   - Create appropriate test cases
   - Verify the fix works as expected

## Commit Phase
6. **Ensure code quality**:
   - Run linting and type checking if available
   - Use Task tool for security review if sensitive changes
   - Follow SOLID principles and project conventions

7. **Create descriptive commit**:
   - mcp__github__git_add for changed files
   - mcp__github__git_commit with conventional format: "fix: resolve issue #$ARGUMENTS - description"
   - Include "Closes #$ARGUMENTS" in commit message

8. **Update Memory MCP**:
   - mcp__memory__create_entities for new bug patterns learned
   - mcp__memory__add_observations for project insights

Remember to use the GitHub MCP for all GitHub-related tasks and follow the framework's MCP-first approach.