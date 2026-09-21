import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as cookieParser from 'cookie-parser';
import { Logger } from '@nestjs/common';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Ensure production database schema and tables exist before AppModule initializes
  if (process.env.DATABASE_URL) {
    const candidatePaths = [
      path.resolve(__dirname, '../prisma/schema.prisma'),
      path.resolve(process.cwd(), 'apps/api/prisma/schema.prisma'),
      path.resolve(process.cwd(), 'prisma/schema.prisma'),
    ];
    const schemaPath = candidatePaths.find((p) => fs.existsSync(p));

    if (schemaPath) {
      try {
        logger.log(`Synchronizing database schema via: ${schemaPath}`);
        execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate --accept-data-loss`, {
          stdio: 'inherit',
          env: process.env,
        });
        logger.log(`Database tables verified and synchronized successfully.`);
      } catch (err: any) {
        logger.warn(`Automatic schema push warning: ${err.message}`);
      }
    }
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for Cashfree HMAC webhook verification
  });

  app.use(cookieParser());

  const isProduction = process.env.NODE_ENV === 'production';
  const configuredOrigins = [
    process.env.PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.API_BASE_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()) : []),
  ]
    .filter(Boolean)
    .map((u) => u!.replace(/\/+$/, ''));

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser agents (e.g. C# Desktop Agent, server-side fetch, mobile apps, curl)
      if (!origin) {
        return callback(null, true);
      }

      const cleanOrigin = origin.replace(/\/+$/, '');

      if (!isProduction) {
        // Development / LAN mode:
        // Allow localhost, 127.0.0.1, or private LAN IPs (10.x, 192.168.x, 172.16-31.x) on any port
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);
        const isLanIp = /^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
          cleanOrigin,
        );
        const isConfigured = configuredOrigins.includes(cleanOrigin);

        if (isLocalhost || isLanIp || isConfigured) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin} in development`));
      }

      // Production mode: strictly match configured production origins
      if (configuredOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }

      callback(new Error(`CORS blocked for origin: ${origin} in production`));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type, Accept, Authorization, x-session-token, x-webhook-signature, x-webhook-timestamp',
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(`=======================================================`);
  logger.log(`  SecurePrint API Server running on port ${port}       `);
  logger.log(`  Health Check: http://localhost:${port}/health        `);
  logger.log(`=======================================================`);
}

bootstrap();
