import { IsString, IsOptional, IsNumber, Min, IsInt, MaxLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class CreateInventoryDto {
  @IsString()
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  quantity?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minQuantity?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxQuantity?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @SanitizeString()
  location?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @SanitizeString()
  warehouse?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @SanitizeString()
  notes?: string;
}

