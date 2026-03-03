import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class ContactMessageDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(1, 5000)
  message!: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  subject?: string;

  // Honeypot field: should stay empty in real forms.
  @IsOptional()
  @IsString()
  website?: string;
}

