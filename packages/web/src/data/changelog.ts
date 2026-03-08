export interface ChangelogEntry {
  version: string
  date: string
  title: string
  description: string
  changes: Array<{ type: 'added' | 'improved' | 'fixed'; text: string }>
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '2026-03-08',
    title: 'Project Tracking & Auto-Update',
    description: 'All Brain MCP write tools now support project tracking, sessions return richer project-scoped context, and a new auto-update system keeps client config in sync.',
    changes: [
      { type: 'added', text: 'Project parameter on all write tools (thoughts, decisions, sessions, sentiment, DX events, conversations)' },
      { type: 'added', text: 'Project-scoped session context with recent thoughts, decisions, blockers, and last session summary' },
      { type: 'added', text: 'Pending handoffs surfaced on session start for target project' },
      { type: 'added', text: 'brain_check_update tool for automatic client config updates' },
      { type: 'improved', text: 'Session start returns decision rationale in context' },
      { type: 'fixed', text: 'DX events now correctly store project_id' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-07',
    title: 'Brain Cloud Launch',
    description: 'Initial public release with full feature set.',
    changes: [
      { type: 'added', text: 'MCP server for Claude Code and Claude Desktop integration' },
      { type: 'added', text: 'Thought, Decision, and Session tracking' },
      { type: 'added', text: 'AI-powered coaching and daily digests' },
      { type: 'added', text: '"Ask Your Brain" RAG conversational search' },
      { type: 'added', text: 'GitHub integration with repo sync' },
      { type: 'added', text: 'Team collaboration with invites and roles' },
      { type: 'added', text: 'Cross-project insights and pattern detection' },
      { type: 'added', text: 'Data export (JSON/CSV)' },
      { type: 'added', text: 'Admin dashboard and user management' },
      { type: 'added', text: 'API key scoping with read/write/admin permissions' },
      { type: 'added', text: 'Rate limiting and structured error handling' },
      { type: 'added', text: 'GDPR-compliant account deletion' },
    ],
  },
]
