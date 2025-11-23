import { IsString, IsOptional, IsNumber, IsInt, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryMovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsString()
  inventoryId: string;

  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

