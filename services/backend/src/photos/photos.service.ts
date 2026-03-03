import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@packages/database';
import { Queue } from 'bullmq';
import { PRISMA } from '../prisma/prisma.module';
import { PaginationQueryDto } from '../common/pagination.dto';

export interface PhotoInput {
  albumId?: string;
  userId?: string;
  s3Key: string;
  title?: string;
  description?: string;
  locationName?: string;
  takenAt?: Date;
  exif?: any;
  isPublic?: boolean;
}

export interface BulkPhotoInput {
  photos: PhotoInput[];
  albumId?: string;
}

export interface UpdatePhotoDto {
  albumId?: string | null;
  title?: string;
  description?: string;
  locationName?: string;
  takenAt?: Date;
  isPublic?: boolean;
}

@Injectable()
export class PhotosService {
  constructor(
    @Inject(PRISMA) private prisma: PrismaClient,
    @Inject('PHOTO_QUEUE') private photoQueue: Queue,
    @Inject('CLEANUP_QUEUE') private cleanupQueue: Queue
  ) {}

  private async enqueueS3Delete(keys: Array<string | null | undefined>) {
    const uniqueKeys = Array.from(
      new Set(keys.filter((k): k is string => typeof k === 'string' && k.trim().length > 0))
    );
    if (uniqueKeys.length === 0) return;

    await this.cleanupQueue.add(
      'deleteS3Objects',
      { keys: uniqueKeys },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 1000,
        removeOnFail: 10_000,
      }
    );
  }

  /**
   * Create single photo and queue for processing
   */
  async createPhotoAndQueue(data: PhotoInput) {
    const photo = await this.prisma.photo.create({
      data: {
        albumId: data.albumId || null,
        userId: data.userId || null,
        title: data.title,
        description: data.description,
        locationName: data.locationName,
        takenAt: data.takenAt,
        s3Key: data.s3Key,
        exif: data.exif,
        isPublic: data.isPublic ?? true,
      },
    });

    await this.photoQueue.add('generateVariants', {
      photoId: photo.id,
      s3Key: data.s3Key
    });

    return photo;
  }

  /**
   * Bulk create photos and queue all for processing
   */
  async createBulkPhotosAndQueue(data: BulkPhotoInput, userId?: string) {
    const { photos, albumId } = data;

    if (!photos || photos.length === 0) {
      throw new BadRequestException('No photos provided');
    }

    if (photos.length > 100) {
      throw new BadRequestException('Maximum 100 photos per bulk upload');
    }

    // Create all photos in a transaction
    const createdPhotos = await this.prisma.$transaction(
      photos.map(photo =>
        this.prisma.photo.create({
          data: {
            albumId: photo.albumId || albumId || null,
            userId: userId || null,
            title: photo.title,
            description: photo.description,
            locationName: photo.locationName,
            takenAt: photo.takenAt,
            s3Key: photo.s3Key,
            exif: photo.exif,
            isPublic: photo.isPublic ?? true,
          },
        })
      )
    );

    // Queue all photos for processing
    await this.photoQueue.addBulk(
      createdPhotos.map(photo => ({
        name: 'generateVariants',
        data: {
          photoId: photo.id,
          s3Key: photo.s3Key,
        },
      }))
    );

    return {
      success: true,
      count: createdPhotos.length,
      photos: createdPhotos,
    };
  }

  async findAll(includePrivate = false, query?: PaginationQueryDto) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const search = query?.search?.trim();

    const where: Prisma.PhotoWhereInput = {
      ...(includePrivate ? {} : { isPublic: true }),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.photo.findMany({
        where,
        include: {
          album: {
            select: {
              id: true,
              slug: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.photo.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  async findById(id: string, includePrivate = false) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
      include: {
        album: true,
      },
    });

    if (!photo) {
      throw new NotFoundException(`Photo with id "${id}" not found`);
    }

    if (!photo.isPublic && !includePrivate) {
      throw new NotFoundException(`Photo with id "${id}" not found`);
    }

    return photo;
  }

  async findByAlbum(albumId: string, query?: PaginationQueryDto, includePrivate = false) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const search = query?.search?.trim();

    const where: Prisma.PhotoWhereInput = {
      albumId,
      ...(includePrivate ? {} : { isPublic: true }),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.photo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.photo.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  async update(id: string, data: UpdatePhotoDto) {
    try {
      return await this.prisma.photo.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new NotFoundException(`Photo with id "${id}" not found`);
    }
  }

  async delete(id: string) {
    try {
      const deleted = await this.prisma.photo.delete({
        where: { id },
      });
      await this.enqueueS3Delete([deleted.s3Key, deleted.webKey, deleted.thumbKey]);
      return deleted;
    } catch (error) {
      throw new NotFoundException(`Photo with id "${id}" not found`);
    }
  }

  async bulkDelete(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('No photo IDs provided');
    }

    const photos = await this.prisma.photo.findMany({
      where: { id: { in: ids } },
      select: { s3Key: true, webKey: true, thumbKey: true },
    });

    const result = await this.prisma.photo.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    await this.enqueueS3Delete(photos.flatMap((p) => [p.s3Key, p.webKey, p.thumbKey]));

    return {
      success: true,
      deleted: result.count,
    };
  }

  async reprocessPhoto(id: string) {
    const photo = await this.findById(id, true);

    if (!photo.s3Key) {
      throw new Error('Photo has no s3Key');
    }

    await this.photoQueue.add('generateVariants', {
      photoId: photo.id,
      s3Key: photo.s3Key
    });

    return { message: 'Photo reprocessing queued', photoId: id };
  }
}
