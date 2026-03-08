export interface ChangelogEntry {
  version: string
  date: string
  title: string
  description: string
  changes: Array<{ type: 'added' | 'improved' | 'fixed'; text: string }>
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2026-03-08',
    title: 'Public Documentation & Install Script v3',
    description: 'Full public docs site, redesigned installer, improved admin dashboard, and waitlist system.',
    changes: [
      { type: 'added', text: 'Public /docs page with getting started guide, core concepts, and full MCP tools reference' },
      { type: 'added', text: 'Waitlist system with admin approval flow' },
      { type: 'added', text: 'Sentry error tracking integration' },
      { type: 'added', text: 'Install script v3 with client detection, modular installation, and idempotency' },
      { type: 'improved', text: 'Admin dashboard UX with better stats and user management' },
      { type: 'improved', text: 'Docs page UX — visual hierarchy, breadcrumbs, proper spacing, back-to-top button' },
      { type: 'improved', text: 'Demo mode with guided tour and sample data' },
      { type: 'improved', text: 'Markdown rendering in content lists' },
      { type: 'fixed', text: 'D1 datetime parsing now treats timestamps as UTC' },
      { type: 'fixed', text: 'Backend /docs route renamed to /api-docs to avoid SPA routing conflict' },
    ],
  },
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
