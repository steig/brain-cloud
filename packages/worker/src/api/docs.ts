import { Hono } from 'hono'
import type { Env, Variables } from '../types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

function getOpenApiSpec(frontendUrl: string) {
  return {
  openapi: '3.1.0',
  info: {
    title: 'Brain Cloud API',
    version: '1.0.0',
    description: 'Personal knowledge management and AI-powered developer tooling API.',
  },
  servers: [
    { url: frontendUrl, description: 'This instance' },
    { url: 'http://localhost:8787', description: 'Local development' },
  ],
  components: {
    securitySchemes: {
      apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
          requestId: { type: 'string' },
        },
      },
      Thought: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          type: { type: 'string', enum: ['note', 'idea', 'question', 'todo', 'insight'] },
          tags: { type: 'string' },
          project_id: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Decision: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          chosen: { type: 'string' },
          rationale: { type: 'string' },
          context: { type: 'string' },
          project_id: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Session: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          goals: { type: 'string' },
          mood_start: { type: 'string' },
          mood_end: { type: 'string', nullable: true },
          summary: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          ended_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
  security: [{ apiKey: [] }, { bearerAuth: [] }],
  paths: {
    '/api/thoughts': {
      get: {
        tags: ['Thoughts'],
        summary: 'List thoughts',
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'project_id', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { '200': { description: 'Array of thoughts' } },
      },
      post: {
        tags: ['Thoughts'],
        summary: 'Create a thought',
        requestBody: {
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Thought' } } },
        },
        responses: { '201': { description: 'Created thought' } },
      },
    },
    '/api/thoughts/{id}': {
      patch: { tags: ['Thoughts'], summary: 'Update a thought', responses: { '204': { description: 'Updated' } } },
      delete: { tags: ['Thoughts'], summary: 'Delete a thought', responses: { '204': { description: 'Deleted' } } },
    },
    '/api/thoughts/{id}/related': {
      get: { tags: ['Thoughts'], summary: 'Get related entries via semantic similarity', responses: { '200': { description: 'Related entries' } } },
    },
    '/api/decisions': {
      get: { tags: ['Decisions'], summary: 'List decisions', responses: { '200': { description: 'Array of decisions' } } },
      post: { tags: ['Decisions'], summary: 'Create a decision', responses: { '201': { description: 'Created' } } },
    },
    '/api/sessions': {
      get: { tags: ['Sessions'], summary: 'List sessions', responses: { '200': { description: 'Array of sessions' } } },
      post: { tags: ['Sessions'], summary: 'Start a session', responses: { '201': { description: 'Created' } } },
    },
    '/api/sentiment': {
      get: { tags: ['Sentiment'], summary: 'List sentiments', responses: { '200': { description: 'Array of sentiments' } } },
      post: { tags: ['Sentiment'], summary: 'Record sentiment', responses: { '201': { description: 'Created' } } },
    },
    '/api/teams': {
      get: { tags: ['Teams'], summary: 'List your teams', responses: { '200': { description: 'Array of teams' } } },
      post: { tags: ['Teams'], summary: 'Create a team', responses: { '201': { description: 'Created' } } },
    },
    '/api/ask': {
      post: {
        tags: ['AI'],
        summary: 'Ask Your Brain — RAG conversational search',
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: {
            question: { type: 'string' },
            history: { type: 'array', items: { type: 'object' } },
          } } } },
        },
        responses: { '200': { description: 'Answer with sources' } },
      },
    },
    '/api/export': {
      get: { tags: ['Export'], summary: 'Export data (JSON or CSV)', responses: { '200': { description: 'Exported data' } } },
    },
    '/api/github/repos': {
      get: { tags: ['GitHub'], summary: 'List linked repos', responses: { '200': { description: 'Repos' } } },
      post: { tags: ['GitHub'], summary: 'Link a repo', responses: { '201': { description: 'Linked' } } },
    },
    '/api/admin/stats': {
      get: { tags: ['Admin'], summary: 'System dashboard stats (admin only)', responses: { '200': { description: 'Stats' } } },
    },
    '/api/admin/users': {
      get: { tags: ['Admin'], summary: 'List users (admin only)', responses: { '200': { description: 'User list' } } },
    },
    '/health': {
      get: { tags: ['System'], summary: 'Health check', responses: { '200': { description: 'OK' } } },
    },
    '/mcp': {
      post: { tags: ['MCP'], summary: 'MCP JSON-RPC endpoint', responses: { '200': { description: 'JSON-RPC response' } } },
    },
  },
  }
}

// OpenAPI JSON
app.get('/openapi.json', (c) => {
  const frontendUrl = c.env.FRONTEND_URL || new URL(c.req.url).origin
  return c.json(getOpenApiSpec(frontendUrl))
})

// Swagger UI
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Brain Cloud API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: '/api-docs/openapi.json', dom_id: '#swagger-ui' })
  </script>
</body>
</html>`)
})

export { app as docsRoutes }
