import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: false,
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          compatibilityDate: '2025-03-05',
          compatibilityFlags: ['nodejs_compat'],
          d1Databases: ['DB'],
          bindings: {
            JWT_SECRET: 'test-jwt-secret-for-vitest',
          },
        },
      },
    },
  },
})
