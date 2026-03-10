import { IsEmail, IsISO8601, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class ContactMessageDto {
  @IsString()
  @Length(1, 120)
  @Matches(/\S/, { message: 'name must contain at least one non-whitespace character' })
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(1, 5000)
  @Matches(/\S/, { message: 'message must contain at least one non-whitespace character' })
  message!: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  @Matches(/\S/, { message: 'subject must contain at least one non-whitespace character' })
  subject?: string;

  // Honeypot field: should stay empty in real forms.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsISO8601()
  formStartedAt!: string;
}
