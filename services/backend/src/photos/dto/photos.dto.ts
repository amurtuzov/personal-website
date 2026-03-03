import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';

export class PresignedUploadRequestDto {
  @IsString()
  filename!: string;

  @IsString()
  contentType!: string;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsString()
  takenAt?: string;
}

export class CreatePhotoDto {
  @IsOptional()
  @IsString()
  albumId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  s3Key!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  takenAt?: Date;

  @IsOptional()
  isPublic?: boolean;
}

export class CreateBulkPhotosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePhotoDto)
  @ArrayMaxSize(100)
  photos!: CreatePhotoDto[];

  @IsOptional()
  @IsString()
  albumId?: string;
}

export class UpdatePhotoDto {
  @IsOptional()
  @IsString()
  albumId?: string | null;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  takenAt?: Date;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
