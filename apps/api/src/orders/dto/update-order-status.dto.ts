import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'El estado debe ser un valor válido del enum OrderStatus' })
  status: OrderStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'El número de tracking no puede exceder 100 caracteres' })
  trackingNumber?: string;
}

