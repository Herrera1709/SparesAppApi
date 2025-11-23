import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class ConfirmPaymentDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'La referencia SINPE no puede exceder 100 caracteres' })
  @Matches(/^[0-9A-Z\s-]+$/, { message: 'La referencia SINPE solo puede contener números, letras, espacios y guiones' })
  @SanitizeString()
  sinpeReference?: string;
}

