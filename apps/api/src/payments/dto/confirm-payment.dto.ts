import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'La referencia SINPE no puede exceder 100 caracteres' })
  sinpeReference?: string;
}

