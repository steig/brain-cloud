---
category: ops
---

# Security Scan

Perform a comprehensive security analysis of the specified code: $ARGUMENTS.

Follow the LDC AI Framework security workflow:

## Analysis Phase
1. **Use Sequential Thinking for security assessment**:
   - mcp__sequential-thinking__sequentialthinking("analyze security implications and create scan plan")
   - Consider OWASP Top 10 vulnerabilities
   - Identify attack vectors and threat models

2. **Parallel security analysis** (use Task tool):
   - Stream 1: Task(description="OWASP Top 10 vulnerability scan")
   - Stream 2: Task(description="Input validation and sanitization review")
   - Stream 3: Task(description="Authentication and authorization analysis")

## Code Analysis
3. **Search for security patterns** (use Grep tool):
   - `password|secret|key|token` for credential exposure
   - `sql.*query|SELECT.*FROM` for SQL injection risks
   - `eval|exec|innerHTML` for code injection vulnerabilities

4. **Analyze authentication flows**:
   - Use Grep/Glob to find auth-related functions
   - Trace references for security boundary enforcement
   - Check session management and token handling

## Security Checks
5. **Validate input handling**:
   - Check all user input validation
   - Verify output encoding and escaping
   - Review file upload and processing logic

6. **Check for common vulnerabilities**:
   - Cross-Site Scripting (XSS)
   - Cross-Site Request Forgery (CSRF)
   - Insecure Direct Object References
   - Security Misconfiguration
   - Sensitive Data Exposure

## Memory Integration
7. **Store security findings**:
   - mcp__memory__create_entities for new security patterns
   - mcp__memory__create_relations between vulnerabilities and fixes
   - mcp__memory__add_observations for security lessons learned

## Reporting
8. **Generate security report**:
   - Prioritize findings by severity (Critical, High, Medium, Low)
   - Provide specific remediation steps
   - Include code examples of secure implementations
   - Document false positives and acceptable risks

**Focus Areas:**
- Authentication and session management
- Input validation and output encoding
- SQL injection and NoSQL injection
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Insecure cryptographic storage
- Insufficient transport layer protection
- Unvalidated redirects and forwards
- Security misconfiguration
- Insecure direct object references