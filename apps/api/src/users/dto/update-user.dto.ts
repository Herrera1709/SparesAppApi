import { IsString, IsOptional, IsEmail, MaxLength, MinLength, Matches } from 'class-validator';
import { SanitizeEmail, SanitizeString } from '../../common/security/input-sanitizer';

export class UpdateUserDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
  @SanitizeEmail()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'El nombre debe tener al menos 1 carácter' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @SanitizeString()
  firstName?: string;

  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'El apellido debe tener al menos 1 carácter' })
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres' })
  @SanitizeString()
  lastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres' })
  @Matches(/^[0-9+\-\s()]+$/, { message: 'Formato de teléfono inválido' })
  phone?: string;
}

