import { IsString, IsOptional, IsNumber, Min, IsBoolean, MaxLength, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { SanitizeString, SanitizeUrl } from '../../common/security/input-sanitizer';

export class CreateProductDto {
  @IsString()
  @MaxLength(100)
  @SanitizeString()
  sku: string;

  @IsString()
  @MaxLength(200)
  @SanitizeString()
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  @SanitizeString()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @SanitizeString()
  category?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @SanitizeString()
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
  @SanitizeUrl()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @SanitizeString()
  barcode?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}

