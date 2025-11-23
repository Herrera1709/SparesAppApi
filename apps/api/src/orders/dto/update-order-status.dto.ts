import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'El estado debe ser un valor válido del enum OrderStatus' })
  status: OrderStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  @SanitizeString()
  notes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'El número de tracking no puede exceder 100 caracteres' })
  @SanitizeString()
  trackingNumber?: string;
}

