import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function normalizeOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    return new URL(trimmed).origin;
  } catch {
    return undefined;
  }
}

function parseAllowedOrigins(value?: string) {
  if (!value) return [];

  return value
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry));
}

async function bootstrap(){
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const httpServer = app.getHttpAdapter().getInstance();
  if (typeof httpServer?.set === 'function') {
    httpServer.set('trust proxy', 1);
  }

  app.use((_, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    next();
  });

  const allowedOrigins = parseAllowedOrigins(config.get<string>('CORS_ALLOWED_ORIGINS'));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86_400,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  console.log(`Backend running on ${port}`);
}
bootstrap();
