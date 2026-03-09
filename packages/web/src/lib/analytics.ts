const TRACKING_URL = '/t/pageview'

export function trackPageView(path: string) {
  // Don't track in development
  if (import.meta.env.DEV) return

  // Fire and forget — don't block rendering
  fetch(TRACKING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, referrer: document.referrer || undefined }),
    keepalive: true,
  }).catch(() => {}) // silently ignore errors
}
