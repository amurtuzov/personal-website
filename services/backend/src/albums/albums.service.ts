import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@packages/database';
import { Queue } from 'bullmq';
import { PRISMA } from '../prisma/prisma.module';
import { CreateAlbumDto, UpdateAlbumDto } from './dto/albums.dto';
import { PaginationQueryDto } from '../common/pagination.dto';

@Injectable()
export class AlbumsService {
  constructor(
    @Inject(PRISMA) private prisma: PrismaClient,
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

  async create(data: CreateAlbumDto) {
    return this.prisma.album.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        isPublic: data.isPublic ?? true,
      },
    });
  }

  async findAll(includePrivate = false, query?: PaginationQueryDto) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const search = query?.search?.trim();

    const where: Prisma.AlbumWhereInput = {
      ...(includePrivate ? {} : { isPublic: true }),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.album.findMany({
        where,
        include: {
          photos: {
            take: 1,
            where: includePrivate ? undefined : { isPublic: true },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { photos: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.album.count({ where }),
    ]);

    const albumIds = items.map((album) => album.id);
    const coverPhotoIds = Array.from(
      new Set(
        items
          .map((album) => album.coverPhotoId)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      )
    );

    const coverPhotos =
      coverPhotoIds.length > 0
        ? await this.prisma.photo.findMany({
            where: {
              id: { in: coverPhotoIds },
              albumId: { in: albumIds },
              ...(includePrivate ? {} : { isPublic: true }),
            },
          })
        : [];

    const coverPhotoById = new Map(coverPhotos.map((photo) => [photo.id, photo]));

    return {
      items: items.map((album) => ({
        ...album,
        coverPhoto: album.coverPhotoId ? coverPhotoById.get(album.coverPhotoId) ?? null : null,
      })),
      page,
      pageSize,
      total,
    };
  }

  async findBySlug(slug: string, includePrivate = false) {
    const album = await this.prisma.album.findUnique({ where: { slug } });

    if (!album) {
      throw new NotFoundException(`Album with slug "${slug}" not found`);
    }

    if (!album.isPublic && !includePrivate) {
      throw new NotFoundException(`Album with slug "${slug}" not found`);
    }

    const coverPhoto =
      album.coverPhotoId
        ? await this.prisma.photo.findFirst({
            where: {
              id: album.coverPhotoId,
              albumId: album.id,
              ...(includePrivate ? {} : { isPublic: true }),
            },
          })
        : null;

    return {
      ...album,
      coverPhoto,
    };
  }

  async findById(id: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        photos: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { photos: true },
        },
      },
    });

    if (!album) {
      throw new NotFoundException(`Album with id "${id}" not found`);
    }

    const coverPhoto =
      album.coverPhotoId && Array.isArray(album.photos)
        ? album.photos.find((photo) => photo.id === album.coverPhotoId) ?? null
        : null;

    return {
      ...album,
      coverPhoto,
    };
  }

  async update(id: string, data: UpdateAlbumDto) {
    const updateData: Prisma.AlbumUpdateInput = { ...data };

    if ('coverPhotoId' in data) {
      const coverPhotoId = data.coverPhotoId;
      if (coverPhotoId === null || coverPhotoId === '') {
        updateData.coverPhotoId = null;
      } else if (typeof coverPhotoId === 'string') {
        const photo = await this.prisma.photo.findFirst({
          where: {
            id: coverPhotoId,
            albumId: id,
          },
          select: { id: true },
        });

        if (!photo) {
          throw new BadRequestException('Cover photo must belong to this album');
        }

        updateData.coverPhotoId = coverPhotoId;
      }
    }

    try {
      const updatedAlbum = await this.prisma.album.update({
        where: { id },
        data: updateData,
        include: {
          photos: {
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { photos: true },
          },
        },
      });

      const coverPhoto =
        updatedAlbum.coverPhotoId && Array.isArray(updatedAlbum.photos)
          ? updatedAlbum.photos.find((photo) => photo.id === updatedAlbum.coverPhotoId) ?? null
          : null;

      return {
        ...updatedAlbum,
        coverPhoto,
      };
    } catch (error) {
      throw new NotFoundException(`Album with id "${id}" not found`);
    }
  }

  async delete(id: string) {
    try {
      const photos = await this.prisma.photo.findMany({
        where: { albumId: id },
        select: { s3Key: true, webKey: true, thumbKey: true },
      });

      const deletedAlbum = await this.prisma.album.delete({
        where: { id },
      });

      await this.enqueueS3Delete(photos.flatMap((p) => [p.s3Key, p.webKey, p.thumbKey]));
      return deletedAlbum;
    } catch (error) {
      throw new NotFoundException(`Album with id "${id}" not found`);
    }
  }
}
