import { IsEmail, IsString, MinLength, IsOptional, Matches, MaxLength } from 'class-validator';
import { SanitizeEmail, SanitizeString } from '../../common/security/input-sanitizer';

export class RegisterDto {
  @IsEmail({}, { message: 'Email inválido' })
  @SanitizeEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @SanitizeString()
  firstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @SanitizeString()
  lastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]+$/, { message: 'Formato de teléfono inválido' })
  phone?: string;
}

