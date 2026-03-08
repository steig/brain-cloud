import type { Env } from './types'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

const FROM_EMAIL = 'noreply@brain-ai.dev'
const FROM_NAME = 'Brain Cloud'

/**
 * Send transactional email via MailChannels (free for Cloudflare Workers).
 * Falls back to console.log in development/testing.
 */
export async function sendEmail(env: Env, options: EmailOptions): Promise<boolean> {
  // If no email provider configured, log and return
  if (!env.MAILCHANNELS_ENABLED) {
    console.log(`[email] Would send to ${options.to}: ${options.subject}`)
    return true
  }

  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: options.subject,
        content: [
          ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
          { type: 'text/html', value: options.html },
        ],
      }),
    })

    if (!response.ok) {
      console.error(`[email] Failed to send: ${response.status}`)
      return false
    }
    return true
  } catch (e) {
    console.error('[email] Error:', e)
    return false
  }
}

// --- Email Templates ---

export function teamInviteEmail(teamName: string, inviterName: string, inviteUrl: string): EmailOptions & { to: string } {
  return {
    to: '', // caller sets this
    subject: `You've been invited to join ${teamName} on Brain Cloud`,
    html: `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Join ${teamName} on Brain Cloud</h2>
        <p style="color: #4a4a4a; line-height: 1.6;">
          ${inviterName} has invited you to join <strong>${teamName}</strong> on Brain Cloud —
          a personal knowledge management tool for developers.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;">
          Accept Invite
        </a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">
          If you didn't expect this invitation, you can ignore this email.
        </p>
      </div>
    `,
    text: `${inviterName} invited you to join ${teamName} on Brain Cloud. Accept: ${inviteUrl}`,
  }
}

export function welcomeEmail(userName: string): EmailOptions & { to: string } {
  return {
    to: '',
    subject: 'Welcome to Brain Cloud',
    html: `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Welcome, ${userName}!</h2>
        <p style="color: #4a4a4a; line-height: 1.6;">
          Your Brain Cloud account is ready. Start by connecting your AI tools:
        </p>
        <ol style="color: #4a4a4a; line-height: 1.8;">
          <li>Create an API key in Settings</li>
          <li>Run <code>npx brain-cloud init</code> to configure your tools</li>
          <li>Start capturing thoughts, decisions, and sessions</li>
        </ol>
        <a href="https://brain-ai.dev/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;">
          Go to Dashboard
        </a>
      </div>
    `,
    text: `Welcome to Brain Cloud, ${userName}! Get started: https://brain-ai.dev/dashboard`,
  }
}

export function accountDeletedEmail(userName: string): EmailOptions & { to: string } {
  return {
    to: '',
    subject: 'Your Brain Cloud account has been deleted',
    html: `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Account Deleted</h2>
        <p style="color: #4a4a4a; line-height: 1.6;">
          Hi ${userName}, your Brain Cloud account and all associated data have been permanently deleted
          as requested. This action cannot be undone.
        </p>
        <p style="color: #888; font-size: 13px;">
          If you didn't request this, please contact support immediately.
        </p>
      </div>
    `,
    text: `Your Brain Cloud account has been deleted, ${userName}. This cannot be undone.`,
  }
}
