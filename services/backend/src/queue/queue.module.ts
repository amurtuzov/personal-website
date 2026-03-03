import { Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
const redisPassword = process.env.REDIS_PASSWORD;

function createRedisConnection() {
  if (redisUrl) {
    return new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      password: redisPassword,
    });
  }
  return new IORedis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null,
  });
}

@Module({
  providers: [
    {
      provide: 'REDIS_CONNECTION',
      useFactory: () => {
        const connection = createRedisConnection();
        console.log(`Redis connected: ${redisUrl || `${redisHost}:${redisPort}`}`);
        return connection;
      },
    },
    {
      provide: 'PHOTO_QUEUE',
      useFactory: (connection: IORedis) => {
        return new Queue('photoQueue', { connection });
      },
      inject: ['REDIS_CONNECTION'],
    },
    {
      provide: 'EMAIL_QUEUE',
      useFactory: (connection: IORedis) => {
        return new Queue('emailQueue', { connection });
      },
      inject: ['REDIS_CONNECTION'],
    },
    {
      provide: 'CLEANUP_QUEUE',
      useFactory: (connection: IORedis) => {
        return new Queue('cleanupQueue', { connection });
      },
      inject: ['REDIS_CONNECTION'],
    },
  ],
  exports: ['PHOTO_QUEUE', 'EMAIL_QUEUE', 'CLEANUP_QUEUE', 'REDIS_CONNECTION'],
})
export class QueueModule {}
