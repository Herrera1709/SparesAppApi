import { IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class CreateTicketMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'El mensaje debe tener al menos 1 carácter' })
  @MaxLength(2000, { message: 'El mensaje no puede exceder 2000 caracteres' })
  @SanitizeString()
  message: string;

  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;
}


