export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  apiBaseUrl: string;
  publicBaseUrl: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  storage: {
    endpoint?: string;
    bucket: string;
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    useLocalFallback: boolean;
    localUploadDir: string;
  };
  cashfree: {
    env: 'SANDBOX' | 'PRODUCTION';
    appId: string;
    secretKey: string;
    webhookSecret: string;
    apiVersion: string;
  };
  timezone: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  nodeEnv: 'development',
  port: 4000,
  apiBaseUrl: 'http://localhost:4000',
  publicBaseUrl: 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/secureprint?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'secureprint-super-secure-production-jwt-secret-key-32chars',
  jwtExpiresIn: '7d',
  storage: {
    bucket: process.env.STORAGE_BUCKET || 'secureprint-documents',
    region: process.env.STORAGE_REGION || 'ap-south-1',
    useLocalFallback: true,
    localUploadDir: 'uploads',
  },
  cashfree: {
    env: (process.env.CASHFREE_ENV as 'SANDBOX' | 'PRODUCTION') || 'SANDBOX',
    appId: process.env.CASHFREE_APP_ID || 'TEST_APP_ID',
    secretKey: process.env.CASHFREE_SECRET_KEY || 'TEST_SECRET_KEY',
    webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET || 'TEST_WEBHOOK_SECRET',
    apiVersion: '2023-08-01',
  },
  timezone: 'Asia/Kolkata',
};
