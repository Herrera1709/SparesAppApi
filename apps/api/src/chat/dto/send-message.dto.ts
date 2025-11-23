import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'El contenido del mensaje debe tener al menos 1 carácter' })
  @MaxLength(2000, { message: 'El contenido del mensaje no puede exceder 2000 caracteres' })
  @SanitizeString()
  content: string;
}

