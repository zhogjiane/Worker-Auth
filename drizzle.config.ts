import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './migrations',
  driver: 'd1-http',
  dialect: 'sqlite',
  dbCredentials: {
    databaseId: process.env.DB_ID || 'worker-auth-db',
    accountId: process.env.CF_ACCOUNT_ID || '',
    token: process.env.CF_API_TOKEN || '',
  },
  verbose: true,
  strict: true,
} satisfies Config; 