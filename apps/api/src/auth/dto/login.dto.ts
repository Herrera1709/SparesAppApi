import { IsEmail, IsString, MaxLength } from 'class-validator';
import { SanitizeEmail } from '../../common/security/input-sanitizer';

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  @SanitizeEmail()
  email: string;

  @IsString()
  @MaxLength(128, { message: 'Contraseña demasiado larga' })
  password: string;
}

