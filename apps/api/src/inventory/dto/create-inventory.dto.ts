import { IsString, IsOptional, IsNumber, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryDto {
  @IsString()
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
  location?: string;

  @IsString()
  @IsOptional()
  warehouse?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

