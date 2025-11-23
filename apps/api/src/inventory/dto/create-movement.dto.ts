import { IsString, IsOptional, IsNumber, IsInt, IsEnum, Min, MaxLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryMovementType } from '@prisma/client';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class CreateMovementDto {
  @IsString()
  @IsUUID()
  inventoryId: string;

  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  @SanitizeString()
  reason?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @SanitizeString()
  referenceId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @SanitizeString()
  referenceType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @SanitizeString()
  notes?: string;
}

