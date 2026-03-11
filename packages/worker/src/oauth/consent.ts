/**
 * Server-rendered HTML consent page for OAuth 2.1 authorization
 */

export function renderConsentPage(opts: {
  clientName: string | null
  scope: string | null
  formAction: string
  csrfFields: string // hidden form fields to carry through
}): string {
  const clientDisplay = opts.clientName || 'An application'
  const scopes = (opts.scope || 'mcp:read mcp:write').split(' ')

  const scopeDescriptions: Record<string, string> = {
    'mcp:read': 'Read your thoughts, decisions, and session data',
    'mcp:write': 'Create and modify thoughts, decisions, and sessions',
  }

  const scopeList = scopes
    .map(s => `<li>${scopeDescriptions[s] || s}</li>`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize — Brain Cloud</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a; color: #e5e5e5;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 1rem;
    }
    .card {
      background: #171717; border: 1px solid #262626; border-radius: 12px;
      padding: 2rem; max-width: 420px; width: 100%;
    }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; color: #f5f5f5; }
    .client { color: #a78bfa; font-weight: 600; }
    p { color: #a3a3a3; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1rem; }
    ul { list-style: none; margin-bottom: 1.5rem; }
    li {
      padding: 0.5rem 0; border-bottom: 1px solid #262626;
      font-size: 0.875rem; color: #d4d4d4;
    }
    li:before { content: '\\2713 '; color: #22c55e; margin-right: 0.5rem; }
    .actions { display: flex; gap: 0.75rem; }
    button {
      flex: 1; padding: 0.625rem 1rem; border-radius: 8px; border: none;
      font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
    }
    button:hover { opacity: 0.85; }
    .approve { background: #7c3aed; color: white; }
    .deny { background: #262626; color: #a3a3a3; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorize Access</h1>
    <p><span class="client">${escapeHtml(clientDisplay)}</span> wants to access your Brain Cloud data.</p>
    <ul>${scopeList}</ul>
    <form method="POST" action="${escapeHtml(opts.formAction)}">
      ${opts.csrfFields}
      <div class="actions">
        <button type="submit" name="consent" value="deny" class="deny">Deny</button>
        <button type="submit" name="consent" value="approve" class="approve">Approve</button>
      </div>
    </form>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
