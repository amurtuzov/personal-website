import { Worker, Job } from "bullmq";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";
import sharp from "sharp";
import type { Metadata } from "sharp";
import exifReader from "exif-reader";
import { prismaClient, disconnectPrisma } from '@packages/database';
import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { Readable } from "stream";
import { promisify } from "util";
import url from "url";

// --- Env sanity checks ---
const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION || 'us-east-1';
const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const configuredObjectAcl = process.env.S3_OBJECT_ACL?.trim();
const defaultObjectAcl = endpoint?.includes('digitaloceanspaces.com') ? 'public-read' : undefined;
const objectAcl = (configuredObjectAcl || defaultObjectAcl) as PutObjectCommandInput['ACL'] | undefined;
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
const redisPassword = process.env.REDIS_PASSWORD;

if (!bucket || !accessKeyId || !secretAccessKey) {
  console.error("Missing required S3 configuration");
  process.exit(1);
}

// --- Clients ---
const isMinIO = endpoint?.includes('minio');

const s3 = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: isMinIO, // MinIO requires path style
  // forcePathStyle: false,
});

console.log(`S3 Client initialized: ${endpoint || 'AWS S3'} / ${bucket}`);
if (objectAcl) {
  console.log(`S3 object ACL enabled for variants: ${objectAcl}`);
}

// ---- Types ----
interface GenerateVariantsData {
  photoId: number | string;
  s3Key: string;
}

const execFileAsync = promisify(execFile);

// ---- Helpers ----
function streamToBuffer(stream: Readable | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(stream)) return Promise.resolve(stream);
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c) => chunks.push(Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function parseRedisConnection() {
  if (redisUrl) {
    try {
      const u = new url.URL(redisUrl);
      return {
        host: u.hostname,
        port: Number(u.port || 6379),
        password: u.password || redisPassword,
      };
    } catch (e) {
      console.warn("Invalid REDIS_URL, falling back to REDIS_HOST/PORT");
    }
  }
  return {
    host: redisHost,
    port: redisPort,
    password: redisPassword,
  };
}

function withExtension(key: string, extension: string): string {
  const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
  const lowerKey = key.toLowerCase();
  const lowerExt = normalizedExt.toLowerCase();
  if (lowerKey.endsWith(lowerExt)) return key;

  const lastSlash = key.lastIndexOf('/');
  const lastDot = key.lastIndexOf('.');
  if (lastDot > lastSlash) {
    return `${key.slice(0, lastDot)}${normalizedExt}`;
  }
  return `${key}${normalizedExt}`;
}

function isHeifSourceKey(key: string): boolean {
  return /\.(heic|heif)$/i.test(key);
}

function isHeifDecodePluginError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /No decoding plugin installed for this compression format/i.test(message);
}

async function convertHeifToJpegBuffer(inputBuffer: Buffer, photoId: number | string): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `heif-${String(photoId)}-`));
  const inputPath = path.join(tempDir, "source.heic");
  const outputPath = path.join(tempDir, "source.jpg");

  try {
    await fs.writeFile(inputPath, inputBuffer);
    await execFileAsync("heif-convert", ["-q", "100", inputPath, outputPath], {
      timeout: 30_000,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return await fs.readFile(outputPath);
  } catch (err) {
    let stderr = "";
    if (err && typeof err === "object" && "stderr" in err) {
      const maybeStderr = (err as { stderr?: unknown }).stderr;
      if (typeof maybeStderr === "string") {
        stderr = maybeStderr.trim();
      } else if (Buffer.isBuffer(maybeStderr)) {
        stderr = maybeStderr.toString("utf8").trim();
      }
    }

    const details = stderr ? ` stderr="${stderr}"` : "";
    throw new Error(`heif-convert failed for photo ${photoId}.${details}`);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function generateWebVariants(inputBuffer: Buffer): Promise<{ webBuffer: Buffer; thumbBuffer: Buffer }> {
  const base = sharp(inputBuffer).rotate();

  const webBuffer = await base
    .clone()
    .resize({ width: 2560, withoutEnlargement: true })
    .webp({ quality: 100 })
    .toBuffer();

  const thumbBuffer = await base
    .clone()
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 100 })
    .toBuffer();

  return { webBuffer, thumbBuffer };
}

// ---- EXIF (safe subset) ----
type SafeExif = {
  make?: string;
  model?: string;
  lensModel?: string;
  dateTimeOriginal?: string;
  createDate?: string;
  offsetTimeOriginal?: string;
  shutterSpeed?: string;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
};

function parseExifDateTime(dateTime?: string, offset?: string): Date | null {
  if (!dateTime) return null;
  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(dateTime.trim());
  if (!match) return null;

  const [, y, m, d, hh, mm, ss] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const hour = Number(hh);
  const minute = Number(mm);
  const second = Number(ss);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const normalizedOffset = offset?.trim();
  if (normalizedOffset) {
    if (normalizedOffset.toUpperCase() === 'Z') {
      const iso = `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
      const parsed = new Date(iso);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const offMatch = /^([+-])(\d{2}):?(\d{2})$/.exec(normalizedOffset);
    if (offMatch) {
      const [, sign, oh, om] = offMatch;
      const iso = `${y}-${m}-${d}T${hh}:${mm}:${ss}${sign}${oh}:${om}`;
      const parsed = new Date(iso);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  const parsed = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeExifString(value: unknown): string | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  if (typeof value !== 'string') return undefined;
  const s = value.replace(/\0+$/g, '').trim();
  return s.length > 0 ? s : undefined;
}

function normalizeExifNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value) && typeof value[0] === 'number' && Number.isFinite(value[0])) return value[0];
  return undefined;
}

function formatShutterSpeed(seconds: number): string | undefined {
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;

  if (seconds >= 1) {
    const fixed = seconds.toFixed(3);
    const trimmed = fixed.replace(/\.?0+$/, '');
    return `${trimmed}s`;
  }

  // Cameras typically show slow speeds as decimals (0.3s, 0.5s) rather than 1/3, 1/2
  if (seconds >= 0.3) {
    const fixed = seconds.toFixed(1);
    const trimmed = fixed.replace(/\.0$/, '');
    return `${trimmed}s`;
  }

  const denominator = Math.round(1 / seconds);
  if (!Number.isFinite(denominator) || denominator <= 0) return undefined;
  return `1/${denominator}`;
}

function normalizeExifDate(value: unknown, offset?: string): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string') return null;

  const exifParsed = parseExifDateTime(value, offset);
  if (exifParsed) return exifParsed;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractSafeExif(metadata: Metadata): { safeExif: SafeExif; takenAt?: Date } | null {
  if (!metadata.exif) return null;

  let parsed: ReturnType<typeof exifReader>;
  try {
    parsed = exifReader(metadata.exif);
  } catch {
    return null;
  }

  const image = parsed.Image || {};
  const photo = parsed.Photo || {};

  const safeExif: SafeExif = {};

  const make = normalizeExifString(image.Make);
  const model = normalizeExifString(image.Model);
  if (make) safeExif.make = make;
  if (model) safeExif.model = model;

  const dateTimeOriginal = normalizeExifString(photo.DateTimeOriginal);
  const createDate = normalizeExifString(photo.DateTimeDigitized);
  const offsetTimeOriginal = normalizeExifString(photo.OffsetTimeOriginal ?? photo.OffsetTime);

  if (dateTimeOriginal) safeExif.dateTimeOriginal = dateTimeOriginal;
  if (createDate) safeExif.createDate = createDate;
  if (offsetTimeOriginal) safeExif.offsetTimeOriginal = offsetTimeOriginal;

  const fNumber = normalizeExifNumber(photo.FNumber);
  const iso = normalizeExifNumber(photo.ISOSpeedRatings);
  const focalLength = normalizeExifNumber(photo.FocalLength);
  const lensModel = normalizeExifString(photo.LensModel);

  const exposureTimeSeconds = normalizeExifNumber(photo.ExposureTime);
  const shutterSpeedApex = normalizeExifNumber(photo.ShutterSpeedValue);
  const shutterSeconds =
    exposureTimeSeconds && exposureTimeSeconds > 0
      ? exposureTimeSeconds
      : shutterSpeedApex !== undefined
        ? Math.pow(2, -shutterSpeedApex)
        : undefined;
  const shutterSpeed = shutterSeconds ? formatShutterSpeed(shutterSeconds) : undefined;

  if (shutterSpeed) safeExif.shutterSpeed = shutterSpeed;
  if (fNumber !== undefined) safeExif.fNumber = fNumber;
  if (iso !== undefined) safeExif.iso = iso;
  if (focalLength !== undefined) safeExif.focalLength = focalLength;
  if (lensModel) safeExif.lensModel = lensModel;

  const takenAtValue = photo.DateTimeOriginal ?? photo.DateTimeDigitized;
  const takenAt = normalizeExifDate(takenAtValue, offsetTimeOriginal);

  if (Object.keys(safeExif).length === 0 && !takenAt) return null;

  return {
    safeExif,
    ...(takenAt ? { takenAt } : {}),
  };
}

// ---- Worker connection options ----
const redisConn = parseRedisConnection();
const workerConnection = {
  host: redisConn.host,
  port: redisConn.port,
  password: redisConn.password,
};

// ---- Worker ----
const worker = new Worker(
  "photoQueue",
  async (job: Job<GenerateVariantsData>) => {
    try {
      if (job.name !== "generateVariants") return;

      const { photoId, s3Key } = job.data;

      if (!s3Key) throw new Error("Missing s3Key in job data");

      console.log(`Processing photo ${photoId}: ${s3Key}`);

      // 1. Download original from S3
      const getCmd = new GetObjectCommand({ Bucket: bucket!, Key: s3Key });
      const res = await s3.send(getCmd);

      if (!res.Body) throw new Error("Empty body from S3");

      const body = res.Body as Readable | Buffer;
      const buffer = await streamToBuffer(body);
      let processingBuffer = buffer;
      let usedHeifConvertFallback = false;

      console.log(`Downloaded ${s3Key}, size: ${buffer.length} bytes`);

      // 2. Get original image metadata
      let metadata: Metadata;
      try {
        metadata = await sharp(processingBuffer).metadata();
      } catch (err) {
        if (isHeifSourceKey(s3Key) && isHeifDecodePluginError(err)) {
          console.warn(`HEIC/HEIF metadata decode failed for ${s3Key}; retrying via heif-convert`);
          processingBuffer = await convertHeifToJpegBuffer(buffer, photoId);
          usedHeifConvertFallback = true;
          metadata = await sharp(processingBuffer).metadata();
        } else {
          throw err;
        }
      }
      const rawWidth = metadata.width || 1600;
      const rawHeight = metadata.height || 1200;
      const hasRotatedOrientation = (metadata.orientation ?? 0) >= 5;
      const originalWidth = hasRotatedOrientation ? rawHeight : rawWidth;
      const originalHeight = hasRotatedOrientation ? rawWidth : rawHeight;

      // 2.1 Extract safe EXIF fields (no GPS / serials / comments)
      let exifResult: { safeExif: SafeExif; takenAt?: Date } | null = null;
      try {
        exifResult = extractSafeExif(metadata);
        if (exifResult) {
          console.log(`Extracted safe EXIF fields: ${Object.keys(exifResult.safeExif).length}`);
        }
      } catch (e) {
        console.warn(`Failed to extract EXIF for ${s3Key}`, e);
      }

      // 3. Generate resized versions
      let webBuffer: Buffer;
      let thumbBuffer: Buffer;
      try {
        ({ webBuffer, thumbBuffer } = await generateWebVariants(processingBuffer));
      } catch (err) {
        if (!usedHeifConvertFallback && isHeifSourceKey(s3Key) && isHeifDecodePluginError(err)) {
          console.warn(`HEIC/HEIF variant decode failed for ${s3Key}; retrying via heif-convert`);
          processingBuffer = await convertHeifToJpegBuffer(buffer, photoId);
          usedHeifConvertFallback = true;
          ({ webBuffer, thumbBuffer } = await generateWebVariants(processingBuffer));
        } else {
          throw err;
        }
      }

      console.log(
        `Generated variants: web=${webBuffer.length}b, thumb=${thumbBuffer.length}b`
        + (usedHeifConvertFallback ? " (heif-convert fallback)" : "")
      );

      // 4. Generate new S3 keys
      const webKey = withExtension(s3Key.replace("originals/", "web/"), "webp");
      const thumbKey = withExtension(s3Key.replace("originals/", "thumbs/"), "webp");

      // 5. Upload processed variants
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket!,
          Key: webKey,
          Body: webBuffer,
          ...(objectAcl ? { ACL: objectAcl } : {}),
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket!,
          Key: thumbKey,
          Body: thumbBuffer,
          ...(objectAcl ? { ACL: objectAcl } : {}),
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      console.log(`Uploaded variants: ${webKey}, ${thumbKey}`);

      // 6. Update DB using shared Prisma client
      const existingPhoto = await prismaClient.photo.findUnique({
        where: { id: String(photoId) },
        select: { takenAt: true },
      });

      if (!existingPhoto) {
        throw new Error(`Photo not found: ${photoId}`);
      }

      const updateData: Record<string, unknown> = {
        webKey,
        thumbKey,
        width: originalWidth,
        height: originalHeight,
      };

      if (exifResult?.safeExif && Object.keys(exifResult.safeExif).length > 0) {
        updateData.exif = exifResult.safeExif;
      }

      if (!existingPhoto.takenAt && exifResult?.takenAt) {
        updateData.takenAt = exifResult.takenAt;
      }

      await prismaClient.photo.update({
        where: { id: String(photoId) },
        data: updateData,
      });

      console.log(`✅ Processed photo ${photoId} successfully`);
    } catch (err) {
      console.error("❌ Worker job error:", err);
      throw err;
    }
  },
  { connection: workerConnection }
);

// ---- Error logging ----
worker.on("failed", (job, err) => {
  console.error("Job failed", job?.id, err);
});

worker.on("error", (err) => {
  console.error("Worker error", err);
});

// graceful shutdown
const shutdown = async () => {
  console.log("Shutting down image worker...");
  try {
    await worker.close();
    await disconnectPrisma();
    process.exit(0);
  } catch (e) {
    console.error("Error during shutdown", e);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`Image worker started — redis=${workerConnection.host}:${workerConnection.port}`);
