# Feature Request Refinement Template

Use this template when refining feature ideas for product development.

## ChatGPT Prompt for Feature Ideas

```markdown
You are a senior product manager and technical architect. Help me transform this rough feature idea into a comprehensive product specification with clear user value and technical considerations.

My feature idea: [PASTE YOUR IDEA HERE]

Please guide me through this systematic analysis:

## PRODUCT REQUIREMENTS ANALYSIS

### 1. PROBLEM VALIDATION
- **User problem**: What specific pain point does this solve?
- **Problem frequency**: How often do users encounter this issue?
- **Current workarounds**: How are users solving this today?
- **Pain severity**: How much does the current situation cost users?
- **Market validation**: Do competitors offer similar solutions?

### 2. USER RESEARCH
- **Primary personas**: Who are the main users of this feature?
- **User journeys**: At what point would they use this?
- **Use cases**: What are the top 3-5 scenarios for usage?
- **User goals**: What are they trying to accomplish?
- **Success criteria**: How will users know the feature worked?

### 3. SOLUTION DESIGN
- **Core functionality**: What is the minimum viable feature?
- **User interface**: How do users interact with this feature?
- **User flow**: Step-by-step process from start to finish
- **Edge cases**: What unusual scenarios must we handle?
- **Error handling**: What happens when things go wrong?

## TECHNICAL ANALYSIS

### 4. ARCHITECTURE IMPACT
- **System components**: Which parts of the system are affected?
- **Data requirements**: What new data do we need to store/process?
- **API changes**: What endpoints need to be created/modified?
- **Database changes**: What schema updates are required?
- **Third-party integrations**: What external services are needed?

### 5. TECHNICAL COMPLEXITY
- **Implementation difficulty**: Rate 1-10 with explanation
- **New technologies**: Do we need to learn/adopt new tools?
- **Performance impact**: How will this affect system performance?
- **Scalability concerns**: Will this work with 10x more users?
- **Security considerations**: What security risks does this introduce?

### 6. DEPENDENCIES & CONSTRAINTS
- **Technical dependencies**: What other features/systems must exist first?
- **Resource constraints**: What skills/people do we need?
- **Timeline constraints**: Are there external deadlines?
- **Budget constraints**: What's the cost tolerance for this feature?
- **Regulatory requirements**: Any compliance considerations?

## BUSINESS ANALYSIS

### 7. VALUE PROPOSITION
- **User value**: How does this improve the user experience?
- **Business value**: How does this help achieve company goals?
- **Competitive advantage**: Does this differentiate us from competitors?
- **Revenue impact**: Will this drive new sales or reduce churn?
- **Cost savings**: Does this reduce operational costs?

### 8. MARKET ANALYSIS
- **Target market size**: How many users could use this feature?
- **Adoption rate**: What percentage of users will likely use this?
- **Market timing**: Is the market ready for this solution?
- **Competitive landscape**: How do competitors handle this problem?
- **Industry trends**: Does this align with market direction?

### 9. RISK ASSESSMENT
- **Technical risks**: What could go wrong during development?
- **Market risks**: What if users don't adopt this feature?
- **Resource risks**: What if key people become unavailable?
- **Timeline risks**: What if development takes longer than expected?
- **Mitigation strategies**: How can we reduce these risks?

## DEVELOPMENT PLANNING

### 10. EFFORT ESTIMATION
- **Discovery phase**: [X days] - user research, technical investigation
- **Design phase**: [X days] - UI/UX design, technical architecture
- **Development phase**: [X weeks] - implementation and testing
- **QA phase**: [X days] - quality assurance and bug fixes
- **Deployment phase**: [X days] - release and monitoring
- **Total effort**: [X person-weeks]

### 11. RESOURCE REQUIREMENTS
- **Product management**: Strategy, requirements, coordination
- **Design**: User experience, visual design, prototyping
- **Frontend development**: User interface implementation
- **Backend development**: API and business logic development
- **QA/Testing**: Quality assurance and test automation
- **DevOps**: Infrastructure and deployment support

### 12. RELEASE STRATEGY
- **MVP scope**: What's the minimal first version?
- **Phased rollout**: How do we gradually release this?
- **Feature flags**: What parts can be toggled on/off?
- **A/B testing**: How do we validate the feature works?
- **Rollback plan**: How do we undo this if needed?

## SUCCESS METRICS

### PRIMARY METRICS
- **Usage metrics**: How many users adopt this feature?
- **Engagement metrics**: How frequently is it used?
- **Success metrics**: How often do users complete their goal?
- **Performance metrics**: How fast/reliable is the feature?
- **Business metrics**: What business outcomes improve?

### SECONDARY METRICS
- **User satisfaction**: NPS, satisfaction surveys, feedback
- **Support metrics**: Reduction in support tickets
- **Development metrics**: Code quality, bug rates, velocity
- **Operational metrics**: System performance, uptime
- **Competitive metrics**: Feature parity, differentiation

## USER STORY OUTPUT

Generate the final feature specification:

**EPIC TITLE**: [Clear, outcome-focused title]

**USER STORIES**:
As a [user persona]
I want [feature capability]
So that [business value/outcome]

**ACCEPTANCE CRITERIA**:
□ [Specific, testable criterion 1]
□ [Specific, testable criterion 2]
□ [Specific, testable criterion 3]
□ [Performance requirements]
□ [Security requirements]
□ [Usability requirements]

**TECHNICAL REQUIREMENTS**:
- Architecture: [High-level technical approach]
- Dependencies: [Required systems/services]
- Performance: [Speed, capacity, reliability requirements]
- Security: [Authentication, authorization, data protection]
- Compatibility: [Browser, device, API version support]

**DEFINITION OF DONE**:
□ Feature implemented according to specifications
□ Unit tests written and passing
□ Integration tests covering main user flows
□ Performance benchmarks met
□ Security review completed
□ User documentation updated
□ Feature flagged and ready for gradual rollout

**ROLLOUT PLAN**:
- Phase 1: [Internal testing and validation]
- Phase 2: [Beta user group rollout]
- Phase 3: [Gradual rollout to all users]
- Success criteria for each phase

---

Please analyze my feature idea and provide the comprehensive specification above. Ask clarifying questions about any ambiguous aspects.
```

## Usage Instructions

1. **Copy the template above**
2. **Replace `[PASTE YOUR IDEA HERE]`** with your feature concept
3. **Paste into ChatGPT, Claude, or Gemini**
4. **Work through the analysis** answering questions as they come up
5. **Use the final specification** for development planning
6. **Create tickets/tasks** from the user stories

## Example Input/Output

**Input**: "Add a dashboard to show user metrics"

**Output**: Complete feature specification including:
- User personas: Product managers, team leads, executives
- Core functionality: Real-time metrics visualization
- Technical approach: REST API + React dashboard components
- Success metrics: 70% user adoption, 5-second load time
- Implementation: 6 weeks development, 3 person team