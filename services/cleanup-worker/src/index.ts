import { S3Client, DeleteObjectsCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Worker, Job } from 'bullmq';

type DeleteS3ObjectsData = {
  keys: string[];
};

const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION || 'us-east-1';
const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
const redisPassword = process.env.REDIS_PASSWORD;

if (!bucket || !accessKeyId || !secretAccessKey) {
  console.error('Missing required S3 configuration');
  process.exit(1);
}

function parseRedisConnection() {
  if (redisUrl) {
    try {
      const u = new URL(redisUrl);
      return {
        host: u.hostname,
        port: Number(u.port || 6379),
        password: u.password || redisPassword,
      };
    } catch {
      console.warn('Invalid REDIS_URL, falling back to REDIS_HOST/PORT');
    }
  }
  return {
    host: redisHost,
    port: redisPort,
    password: redisPassword,
  };
}

const redisConn = parseRedisConnection();
const workerConnection = {
  host: redisConn.host,
  port: redisConn.port,
  password: redisConn.password,
};

const isMinIO = endpoint?.includes('minio');
const s3 = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: isMinIO,
});

function normalizeKeys(keys: string[]) {
  return Array.from(new Set(keys.map((k) => k.trim()).filter((k) => k.length > 0)));
}

async function deleteKeys(keys: string[]) {
  const uniqueKeys = normalizeKeys(keys);
  if (uniqueKeys.length === 0) return;

  // Prefer batch deletion (up to 1000 keys per request).
  if (uniqueKeys.length > 1) {
    for (let i = 0; i < uniqueKeys.length; i += 1000) {
      const chunk = uniqueKeys.slice(i, i + 1000);
      const res = await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket!,
          Delete: {
            Objects: chunk.map((Key) => ({ Key })),
            Quiet: true,
          },
        })
      );

      const errors = res.Errors || [];
      if (errors.length > 0) {
        // Treat "NoSuchKey" as success. Anything else should retry.
        const hardErrors = errors.filter((e) => e.Code && e.Code !== 'NoSuchKey');
        if (hardErrors.length > 0) {
          throw new Error(`Failed to delete some objects: ${hardErrors.map((e) => e.Key).join(', ')}`);
        }
      }
    }
    return;
  }

  // Single key fallback
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket!, Key: uniqueKeys[0] }));
  } catch (err: any) {
    // If the object doesn't exist, that's fine.
    const code = err?.name || err?.Code;
    if (code === 'NoSuchKey') return;
    throw err;
  }
}

const worker = new Worker(
  'cleanupQueue',
  async (job: Job<DeleteS3ObjectsData>) => {
    if (job.name !== 'deleteS3Objects') return;
    await deleteKeys(job.data.keys);
  },
  { connection: workerConnection, concurrency: 5 }
);

worker.on('completed', (job) => {
  console.log(`✅ Cleanup job completed id=${job.id} keys=${(job.data?.keys || []).length}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Cleanup job failed id=${job?.id}`, err);
});

worker.on('error', (err) => {
  console.error('Cleanup worker error', err);
});

const shutdown = async () => {
  console.log('Shutting down cleanup worker...');
  try {
    await worker.close();
    process.exit(0);
  } catch (e) {
    console.error('Error during shutdown', e);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`Cleanup worker started — redis=${workerConnection.host}:${workerConnection.port} bucket=${bucket}`);

