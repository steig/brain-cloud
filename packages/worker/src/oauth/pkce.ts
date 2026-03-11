/**
 * PKCE S256 verification via Web Crypto (RFC 7636)
 */

export async function verifyPkceS256(codeVerifier: string, codeChallenge: string): Promise<boolean> {
  const data = new TextEncoder().encode(codeVerifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  // Base64url encode (no padding)
  const encoded = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return encoded === codeChallenge
}
