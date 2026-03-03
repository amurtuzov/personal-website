import { IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateAlbumDto {
  @IsString()
  @Length(3, 64)
  slug!: string;

  @IsString()
  @Length(1, 120)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateAlbumDto {
  @IsOptional()
  @IsString()
  @Length(3, 64)
  slug?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsUUID()
  coverPhotoId?: string | null;
}
