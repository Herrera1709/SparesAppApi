import { IsString, IsOptional, IsEmail, MaxLength, MinLength, Matches } from 'class-validator';
import { SanitizeEmail, SanitizeString } from '../../common/security/input-sanitizer';

export class CreateConversationDto {
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @SanitizeString()
  guestName?: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
  @SanitizeEmail()
  guestEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres' })
  @Matches(/^[0-9+\-\s()]+$/, { message: 'Formato de teléfono inválido' })
  guestPhone?: string;

  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'El asunto debe tener al menos 3 caracteres' })
  @MaxLength(200, { message: 'El asunto no puede exceder 200 caracteres' })
  @SanitizeString()
  subject?: string;

  @IsString()
  @MinLength(1, { message: 'El mensaje inicial debe tener al menos 1 carácter' })
  @MaxLength(1000, { message: 'El mensaje inicial no puede exceder 1000 caracteres' })
  @SanitizeString()
  initialMessage: string;
}

