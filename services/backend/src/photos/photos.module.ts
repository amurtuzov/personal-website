import { Module } from '@nestjs/common';
import { PhotosService } from './photos.service';
import { PhotosController } from './photos.controller';
import { S3Module } from '../s3/s3.module';
import { QueueModule } from '../queue/queue.module';
import {AuthModule} from '../auth/auth.module'

@Module({
  imports: [AuthModule, S3Module, QueueModule],
  providers: [PhotosService],
  controllers: [PhotosController],
  exports: [PhotosService],
})
export class PhotosModule {}