import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default(
      [
        'http://localhost:3000',
        'http://localhost:8081',
        'http://localhost:8082',
        'http://localhost:5173',
        'https://amurtuzov.com',
        'https://photos.amurtuzov.com',
        'https://cms.amurtuzov.com',
      ].join(',')
    ),
  FORM_ALLOWED_ORIGINS: z
    .string()
    .default(
      [
        'http://localhost:3000',
        'http://localhost:8081',
        'http://localhost:8082',
        'https://amurtuzov.com',
        'https://photos.amurtuzov.com',
      ].join(',')
    ),
  FORM_MIN_SUBMISSION_MS: z.coerce.number().int().min(0).default(2000),
  FORM_MAX_SUBMISSION_MS: z.coerce.number().int().min(1000).default(43_200_000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  REDIS_URL: z.string().url().optional(),
  REDIS_PASSWORD: z.string().min(12, 'REDIS_PASSWORD must be at least 12 characters'),
  S3_BUCKET: z.string(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
});

export type EnvVars = z.infer<typeof envSchema>;
