import { IsString, MinLength, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'El token es requerido' })
  @MaxLength(500)
  @SanitizeString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  password: string;
}

