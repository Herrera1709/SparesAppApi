import { IsOptional, IsString, IsEnum, IsUUID, IsDateString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { InventoryMovementType } from '@prisma/client';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class GetMovementsQueryDto {
  @IsOptional()
  @IsUUID(4, { message: 'inventoryId debe ser un UUID válido' })
  inventoryId?: string;

  @IsOptional()
  @IsUUID(4, { message: 'productId debe ser un UUID válido' })
  productId?: string;

  @IsOptional()
  @IsEnum(InventoryMovementType, { message: 'type debe ser un InventoryMovementType válido' })
  type?: InventoryMovementType;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'referenceId no puede exceder 100 caracteres' })
  @SanitizeString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'referenceType no puede exceder 50 caracteres' })
  @SanitizeString()
  referenceType?: string;

  @IsOptional()
  @IsDateString({}, { message: 'startDate debe ser una fecha válida en formato ISO' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate debe ser una fecha válida en formato ISO' })
  endDate?: string;
}

