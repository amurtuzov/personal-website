import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AlbumsService } from './albums.service';
import { CreateAlbumDto, UpdateAlbumDto } from './dto/albums.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PaginationQueryDto } from '../common/pagination.dto';
import { S3Service } from '../s3/s3.service';

@Controller('api/albums')
export class AlbumsController {
  constructor(
    private albums: AlbumsService,
    private s3: S3Service
  ) {}

  private withPhotoUrls<T extends { thumbKey?: string | null; webKey?: string | null }>(photo: T) {
    return {
      ...photo,
      thumbUrl: photo.thumbKey ? this.s3.getPublicUrl(photo.thumbKey) : null,
      webUrl: photo.webKey ? this.s3.getPublicUrl(photo.webKey) : null,
    };
  }

  private withAlbumPhotoUrls<T extends { photos?: Array<any>; coverPhoto?: any | null }>(album: T) {
    const withPhotos =
      album?.photos && Array.isArray(album.photos)
        ? { ...album, photos: album.photos.map((p) => this.withPhotoUrls(p)) }
        : album;

    if (!withPhotos?.coverPhoto) {
      return withPhotos;
    }

    return {
      ...withPhotos,
      coverPhoto: this.withPhotoUrls(withPhotos.coverPhoto),
    };
  }

  // Public: Get all public albums
  @Get()
  async getAll(@Query() query: PaginationQueryDto) {
    const result = await this.albums.findAll(false, query);
    return {
      ...result,
      items: result.items.map((album) => this.withAlbumPhotoUrls(album)),
    };
  }

  // Public: Get album by slug
  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    const album = await this.albums.findBySlug(slug, false);
    return this.withAlbumPhotoUrls(album);
  }

  // Protected: Get all albums (public + private)
  @UseGuards(JwtAuthGuard)
  @Get('/admin/all')
  async getAllAdmin(@Query() query: PaginationQueryDto) {
    const result = await this.albums.findAll(true, query);
    return {
      ...result,
      items: result.items.map((album) => this.withAlbumPhotoUrls(album)),
    };
  }

  // Protected: Create album
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() data: CreateAlbumDto) {
    return this.albums.create(data);
  }

  // Protected: Get album by ID (includes private)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(@Param('id') id: string) {
    const album = await this.albums.findById(id);
    return this.withAlbumPhotoUrls(album);
  }

  // Protected: Update album
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UpdateAlbumDto) {
    const album = await this.albums.update(id, data);
    return this.withAlbumPhotoUrls(album);
  }

  // Protected: Delete album
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.albums.delete(id);
  }
}
