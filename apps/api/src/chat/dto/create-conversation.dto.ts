import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  guestName?: string;

  @IsEmail()
  @IsOptional()
  guestEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  guestPhone?: string;

  @IsString()
  @MaxLength(1000)
  initialMessage: string;
}

