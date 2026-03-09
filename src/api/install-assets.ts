import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import {
  INSTALL_VERSION,
  HOOKS,
  HOOK_LIBS,
  COMMANDS,
  DIRECTIVES,
  SETTINGS_FRAGMENT,
} from './install-content'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Build manifest with SHA-256 checksums
async function buildManifest(): Promise<{
  version: string
  generated: string
  files: Record<string, { sha256: string; size: number }>
}> {
  const files: Record<string, { sha256: string; size: number }> = {}

  const computeHash = async (content: string) => {
    const data = new TextEncoder().encode(content)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  for (const [name, content] of Object.entries(HOOKS)) {
    files[`hooks/${name}`] = {
      sha256: await computeHash(content),
      size: new TextEncoder().encode(content).byteLength,
    }
  }

  for (const [name, content] of Object.entries(HOOK_LIBS)) {
    files[`hooks/${name}`] = {
      sha256: await computeHash(content),
      size: new TextEncoder().encode(content).byteLength,
    }
  }

  for (const [name, content] of Object.entries(COMMANDS)) {
    files[`commands/${name}`] = {
      sha256: await computeHash(content),
      size: new TextEncoder().encode(content).byteLength,
    }
  }

  const directivesContent = DIRECTIVES
  files['directives.md'] = {
    sha256: await computeHash(directivesContent),
    size: new TextEncoder().encode(directivesContent).byteLength,
  }

  const settingsContent = JSON.stringify(SETTINGS_FRAGMENT, null, 2)
  files['settings.json'] = {
    sha256: await computeHash(settingsContent),
    size: new TextEncoder().encode(settingsContent).byteLength,
  }

  return {
    version: INSTALL_VERSION,
    generated: new Date().toISOString(),
    files,
  }
}

// GET /install/manifest.json
app.get('/manifest.json', async (c) => {
  const manifest = await buildManifest()
  return c.json(manifest, 200, {
    'Cache-Control': 'public, max-age=300',
  })
})

// GET /install/hooks/:file
app.get('/hooks/:file', (c) => {
  const file = c.req.param('file')
  const content = HOOKS[file]
  if (!content) return c.text('Not found', 404)
  return c.text(content, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
  })
})

// GET /install/hooks/lib/:file
app.get('/hooks/lib/:file', (c) => {
  const file = `lib/${c.req.param('file')}`
  const content = HOOK_LIBS[file]
  if (!content) return c.text('Not found', 404)
  return c.text(content, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
  })
})

// GET /install/commands/:file
app.get('/commands/:file', (c) => {
  const file = c.req.param('file')
  const content = COMMANDS[file]
  if (!content) return c.text('Not found', 404)
  return c.text(content, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
  })
})

// GET /install/directives.md
app.get('/directives.md', (c) => {
  return c.text(DIRECTIVES, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
  })
})

// GET /install/settings.json
app.get('/settings.json', (c) => {
  return c.json(SETTINGS_FRAGMENT, 200, {
    'Cache-Control': 'public, max-age=300',
  })
})

export { app as installAssetRoutes }
