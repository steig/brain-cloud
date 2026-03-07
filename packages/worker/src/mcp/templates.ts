/**
 * Decision templates for common decision types.
 * Ported from mcp-server/src/templates.ts
 */

export interface DecisionTemplate {
  name: string
  description: string
  type: string
  suggestedFields: {
    context_prompts: string[]
    option_prompts: string[]
    rationale_prompts: string[]
  }
  defaultTags: string[]
}

export const DECISION_TEMPLATES: Record<string, DecisionTemplate> = {
  architecture: {
    name: 'Architecture Decision',
    description: 'Major architectural or design pattern choice',
    type: 'architecture',
    suggestedFields: {
      context_prompts: [
        'What problem or requirement drives this decision?',
        'What are the current constraints (team size, timeline, tech stack)?',
        'What are the quality attributes that matter most (performance, maintainability, security)?',
      ],
      option_prompts: [
        'Consider at least 3 options including "do nothing"',
        'For each option, evaluate: complexity, maintainability, performance, team familiarity',
        'Include rough effort estimates for each option',
      ],
      rationale_prompts: [
        'Why does this option best fit the constraints?',
        'What are you giving up by not choosing the alternatives?',
        'What would make you revisit this decision?',
      ],
    },
    defaultTags: ['architecture', 'adr'],
  },
  library: {
    name: 'Library/Tool Selection',
    description: 'Choosing between external dependencies',
    type: 'library',
    suggestedFields: {
      context_prompts: [
        'What capability do you need?',
        'What is your current stack and what needs to be compatible?',
      ],
      option_prompts: [
        'Compare: maintenance status, community size, bundle size, API design',
        'Check: last release date, open issues count, TypeScript support',
        'Test: does it actually solve your specific use case?',
      ],
      rationale_prompts: [
        'How does this fit with existing dependencies?',
        'What is the migration cost if this library is abandoned?',
        'What alternatives exist if you need to switch?',
      ],
    },
    defaultTags: ['library', 'dependency'],
  },
  pattern: {
    name: 'Code Pattern Choice',
    description: 'Choosing between implementation patterns or approaches',
    type: 'pattern',
    suggestedFields: {
      context_prompts: [
        'What behavior are you implementing?',
        'Are there existing patterns in the codebase for similar things?',
      ],
      option_prompts: [
        'Consider: readability, testability, reusability',
        'Which pattern is most familiar to the team?',
        'Which pattern has the fewest edge cases?',
      ],
      rationale_prompts: [
        'Is this consistent with existing codebase patterns?',
        'Does this make the code easier or harder to understand?',
      ],
    },
    defaultTags: ['pattern', 'implementation'],
  },
  process: {
    name: 'Process/Workflow Decision',
    description: 'Team workflow, CI/CD, or development process choice',
    type: 'process',
    suggestedFields: {
      context_prompts: [
        'What pain point does this address?',
        'How many people/projects does this affect?',
      ],
      option_prompts: [
        'Consider: adoption effort, learning curve, reversibility',
        'What is the ongoing maintenance burden of each option?',
      ],
      rationale_prompts: [
        'How will you measure if this was the right choice?',
        'What is the rollback plan if this doesn\'t work?',
      ],
    },
    defaultTags: ['process', 'workflow'],
  },
  tooling: {
    name: 'Tooling Decision',
    description: 'Development tools, IDE, CI/CD, infrastructure choices',
    type: 'tooling',
    suggestedFields: {
      context_prompts: [
        'What workflow is this tool supporting?',
        'What are you currently using and why is it insufficient?',
      ],
      option_prompts: [
        'Compare: cost, integration with existing tools, team experience',
        'Consider: vendor lock-in, data portability, self-hosted vs SaaS',
      ],
      rationale_prompts: [
        'What is the total cost of ownership (licensing + setup + maintenance)?',
        'How does this affect developer experience?',
      ],
    },
    defaultTags: ['tooling'],
  },
}

export function getDecisionTemplate(type: string): DecisionTemplate | null {
  return DECISION_TEMPLATES[type] || null
}

export function listDecisionTemplates(): { name: string; type: string; description: string }[] {
  return Object.values(DECISION_TEMPLATES).map(t => ({
    name: t.name, type: t.type, description: t.description,
  }))
}
