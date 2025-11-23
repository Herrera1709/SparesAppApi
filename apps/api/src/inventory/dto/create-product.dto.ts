import { IsString, IsOptional, IsNumber, Min, IsBoolean, MaxLength, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MaxLength(100)
  sku: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  price?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  barcode?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}

