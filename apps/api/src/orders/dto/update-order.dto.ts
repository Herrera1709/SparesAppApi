import { IsString, IsOptional, IsNumber, IsEnum, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'El nombre del artículo no puede exceder 200 caracteres' })
  itemName?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'El precio del artículo no puede ser negativo' })
  @IsOptional()
  itemPrice?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'El costo de envío no puede ser negativo' })
  @IsOptional()
  shippingCost?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'Los impuestos no pueden ser negativos' })
  @IsOptional()
  taxes?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'La tarifa de servicio no puede ser negativa' })
  @IsOptional()
  serviceFee?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'El precio total no puede ser negativo' })
  @IsOptional()
  totalPrice?: number;

  @IsEnum(OrderStatus, { message: 'El estado debe ser un valor válido del enum OrderStatus' })
  @IsOptional()
  status?: OrderStatus;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'El número de tracking no puede exceder 100 caracteres' })
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notes?: string;

  @IsString()
  @IsOptional()
  addressId?: string;

  @IsString()
  @IsOptional()
  lockerId?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  estimatedDeliveryMinDays?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  estimatedDeliveryMaxDays?: number;

  @IsOptional()
  hasIssue?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'La descripción de incidencia no puede exceder 1000 caracteres' })
  issueDescription?: string;

  @IsOptional()
  tags?: string[];
}

