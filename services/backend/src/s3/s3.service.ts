import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';

export interface PresignedUploadRequest {
  filename: string;
  contentType: string;
  locationName?: string;
  takenAt?: string;
}

export interface PresignedUploadResponse {
  id: string;
  key: string;
  url: string;
  expiresIn: number;
  filename: string;
}

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl?: string;
  private readonly endpoint?: string;
  private readonly presignEndpoint?: string;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('S3_REGION', 'us-east-1');
    this.endpoint = this.config.get<string>('S3_ENDPOINT');
    this.presignEndpoint = this.config.get<string>('S3_PRESIGN_ENDPOINT');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY_ID')!;
    const secretAccessKey = this.config.get<string>('S3_SECRET_ACCESS_KEY')!;

    this.bucket = this.config.get<string>('S3_BUCKET')!;
    this.publicUrl = this.config.get<string>('S3_PUBLIC_URL');

    const normalizedEndpoint = this.endpoint?.toLowerCase();
    const isMinIO =
      normalizedEndpoint?.includes('minio')
      || normalizedEndpoint?.includes('localhost')
      || normalizedEndpoint?.includes('127.0.0.1');
    const isDigitalOcean = this.endpoint?.includes('digitaloceanspaces.com');

    this.s3 = new S3Client({
      region,
      endpoint: this.presignEndpoint || this.endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // MinIO requires forcePathStyle, DigitalOcean Spaces doesn't
      forcePathStyle: isMinIO,
    });

    const storageType = isMinIO
      ? 'MinIO (local)'
      : isDigitalOcean
        ? 'DigitalOcean Spaces'
        : 'S3-compatible';

    console.log(`S3 Service initialized: ${storageType} / ${this.bucket}`);
    if (this.endpoint) {
      console.log(`Endpoint: ${this.endpoint}`);
    }
    if (this.presignEndpoint) {
      console.log(`Presign endpoint: ${this.presignEndpoint}`);
    }
  }

  /**
   * Generate presigned URL for a single file
   */
  async createPresignedUpload({
                                filename,
                                contentType,
                              }: PresignedUploadRequest): Promise<PresignedUploadResponse> {
    const ext = filename.split('.').pop() || 'jpg';
    const date = new Date().toISOString().slice(0, 10);
    const key = `originals/${new Date().getFullYear()}/${date}-${randomUUID()}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    const url = await getSignedUrl(this.s3 as any, cmd, { expiresIn: 60 * 5 });

    return {
      id: randomUUID(),
      key,
      url,
      expiresIn: 300,
      filename,
    };
  }

  /**
   * Generate multiple presigned URLs for bulk upload
   */
  async createBulkPresignedUploads(
    files: PresignedUploadRequest[]
  ): Promise<PresignedUploadResponse[]> {
    return Promise.all(files.map((file) => this.createPresignedUpload(file)));
  }

  /**
   * Get public URL for a given S3 key
   * Works with MinIO, DigitalOcean Spaces, and AWS S3
   */
  getPublicUrl(key: string): string {
    // If CDN URL is configured, use it
    if (this.publicUrl) {
      return `https://${this.publicUrl}/${key}`;
    }

    // MinIO local development
    const normalizedEndpoint = this.endpoint?.toLowerCase();
    const isMinIO =
      normalizedEndpoint?.includes('minio')
      || normalizedEndpoint?.includes('localhost')
      || normalizedEndpoint?.includes('127.0.0.1');
    if (isMinIO) {
      const base = this.presignEndpoint || this.endpoint || '';
      return `${base}/${this.bucket}/${key}`;
    }

    // DigitalOcean Spaces
    if (this.endpoint?.includes('digitaloceanspaces.com')) {
      const region = this.endpoint.match(/https:\/\/(.+?)\.digitaloceanspaces\.com/)?.[1] || 'nyc3';
      return `https://${this.bucket}.${region}.digitaloceanspaces.com/${key}`;
    }

    // AWS S3
    const region = this.config.get<string>('S3_REGION', 'us-east-1');
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  getS3Client(): S3Client {
    return this.s3;
  }

  getBucket(): string {
    return this.bucket;
  }

  getEndpoint(): string | undefined {
    return this.endpoint;
  }
}
