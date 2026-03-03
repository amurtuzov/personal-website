import {
  Body,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PhotosService } from './photos.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { S3Service } from '../s3/s3.service';
import {
  CreateBulkPhotosDto,
  CreatePhotoDto,
  PresignedUploadRequestDto,
  UpdatePhotoDto as UpdatePhotoDtoClass,
} from './dto/photos.dto';
import { Throttle } from '@nestjs/throttler';
import { PaginationQueryDto } from '../common/pagination.dto';

@Controller('api')
export class PhotosController {
  constructor(
    private photos: PhotosService,
    private s3: S3Service
  ) {}

  private withPhotoUrls<T extends { thumbKey?: string | null; webKey?: string | null }>(photo: T) {
    return {
      ...photo,
      thumbUrl: photo.thumbKey ? this.s3.getPublicUrl(photo.thumbKey) : null,
      webUrl: photo.webKey ? this.s3.getPublicUrl(photo.webKey) : null,
    };
  }

  // Public: Get all public photos
  @Get('photos')
  async getAll(@Query() query: PaginationQueryDto) {
    const result = await this.photos.findAll(false, query);
    return {
      ...result,
      items: result.items.map((photo) => this.withPhotoUrls(photo)),
    };
  }

  // Public: Get photo by ID
  @Get('photos/:id')
  async getById(@Param('id') id: string) {
    const photo = await this.photos.findById(id, false);
    return this.withPhotoUrls(photo);
  }

  // Protected: Sign single upload URL
  @UseGuards(JwtAuthGuard)
  @Throttle({ upload: { limit: 5, ttl: 60 } })
  @Post('sign-upload')
  async signUpload(@Body() body: PresignedUploadRequestDto) {
    return this.s3.createPresignedUpload(body);
  }

  // Protected: Sign multiple upload URLs (bulk)
  @UseGuards(JwtAuthGuard)
  @Throttle({ upload: { limit: 5, ttl: 60 } })
  @Post('sign-bulk-upload')
  async signBulkUpload(@Body() body: { files: PresignedUploadRequestDto[] }) {
    if (!body.files || !Array.isArray(body.files)) {
      return { error: 'Invalid request: files array required' };
    }

    if (body.files.length > 100) {
      return { error: 'Maximum 100 files per request' };
    }

    return this.s3.createBulkPresignedUploads(body.files);
  }

  // Protected: Create single photo after upload
  @UseGuards(JwtAuthGuard)
  @Post('photos')
  async create(@Body() body: CreatePhotoDto, @Req() req: any) {
    const userId = req.user?.id || null;
    return this.photos.createPhotoAndQueue({ ...body, userId });
  }

  // Protected: Create multiple photos after bulk upload
  @UseGuards(JwtAuthGuard)
  @Post('photos/bulk')
  async createBulk(@Body() body: CreateBulkPhotosDto, @Req() req: any) {
    const userId = req.user?.id || null;
    return this.photos.createBulkPhotosAndQueue(body, userId);
  }

  // Protected: Update photo
  @UseGuards(JwtAuthGuard)
  @Put('photos/:id')
  async update(@Param('id') id: string, @Body() data: UpdatePhotoDtoClass) {
    return this.photos.update(id, data);
  }

  // Protected: Delete photo
  @UseGuards(JwtAuthGuard)
  @Delete('photos/:id')
  async delete(@Param('id') id: string) {
    return this.photos.delete(id);
  }

  // Protected: Bulk delete photos
  @UseGuards(JwtAuthGuard)
  @Post('photos/bulk-delete')
  async bulkDelete(@Body() body: { ids: string[] }) {
    return this.photos.bulkDelete(body.ids);
  }

  // Protected: Reprocess photo (regenerate variants)
  @UseGuards(JwtAuthGuard)
  @Post('photos/:id/reprocess')
  async reprocess(@Param('id') id: string) {
    return this.photos.reprocessPhoto(id);
  }

  // Public: Get public photos by album (paginated)
  @Get('albums/:albumId/photos')
  async getByAlbum(@Param('albumId') albumId: string, @Query() query: PaginationQueryDto) {
    const result = await this.photos.findByAlbum(albumId, query, false);
    return {
      ...result,
      items: result.items.map((photo) => this.withPhotoUrls(photo)),
    };
  }

  // Protected: Get all photos (public + private)
  @UseGuards(JwtAuthGuard)
  @Get('admin/photos')
  async getAllAdmin(@Query() query: PaginationQueryDto) {
    const result = await this.photos.findAll(true, query);
    return {
      ...result,
      items: result.items.map((photo) => this.withPhotoUrls(photo)),
    };
  }

  // Protected: Get photo by ID (includes private)
  @UseGuards(JwtAuthGuard)
  @Get('admin/photos/:id')
  async getByIdAdmin(@Param('id') id: string) {
    const photo = await this.photos.findById(id, true);
    return this.withPhotoUrls(photo);
  }
}
