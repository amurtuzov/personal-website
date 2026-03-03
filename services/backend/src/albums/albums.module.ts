import { Module } from '@nestjs/common';
import { AlbumsService } from './albums.service';
import { AlbumsController } from './albums.controller';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [AuthModule, QueueModule, S3Module],
  providers: [AlbumsService],
  controllers: [AlbumsController],
  exports: [AlbumsService],
})
export class AlbumsModule {}
