import { Module } from '@nestjs/common';
import { PhotosModule } from './photos/photos.module';
import { AlbumsModule } from './albums/albums.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { S3Module } from './s3/s3.module';
import { QueueModule } from './queue/queue.module';
import { HealthController } from './health/health.controller';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/env.validation';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (config) => envSchema.parse(config),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'default', ttl: 60, limit: 30 },
        { name: 'auth', ttl: 60, limit: 10 },
        { name: 'upload', ttl: 60, limit: 5 },
        { name: 'contact', ttl: 60, limit: 3 },
      ],
    }),
    PrismaModule,
    QueueModule,
    AuthModule,
    S3Module,
    AlbumsModule,
    PhotosModule,
    ContactModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
