import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: false,
        main: './src/index.ts',
        miniflare: {
          compatibilityDate: '2025-03-05',
          compatibilityFlags: ['nodejs_compat'],
          d1Databases: ['DB'],
          bindings: {
            JWT_SECRET: 'test-jwt-secret-for-vitest',
            JWT_ISSUER: 'brain-ai.dev',
            FRONTEND_URL: 'http://localhost',
            GITHUB_CLIENT_ID: 'test',
            GITHUB_CLIENT_SECRET: 'test',
            GITHUB_CALLBACK_URL: 'http://localhost/auth/github/callback',
          },
        },
      },
    },
  },
})
