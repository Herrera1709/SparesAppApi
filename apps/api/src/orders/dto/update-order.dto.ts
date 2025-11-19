import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  itemName?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  itemPrice?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  shippingCost?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  taxes?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  serviceFee?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  totalPrice?: number;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  addressId?: string;
}

