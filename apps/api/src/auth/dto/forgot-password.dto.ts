import { IsEmail } from 'class-validator';
import { SanitizeEmail } from '../../common/security/input-sanitizer';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  @SanitizeEmail()
  email: string;
}

