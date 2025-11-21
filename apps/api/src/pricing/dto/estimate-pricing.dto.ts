import { IsNumber, IsNotEmpty, IsEnum, IsOptional, Min, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductCategory {
  KTM = 'KTM',
  MOTO = 'MOTO',
  AUTO = 'AUTO',
  ELECTRONICS = 'ELECTRONICS',
  CLOTHING = 'CLOTHING',
  OTHER = 'OTHER',
}

export class ProductDimensionsDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  weight?: number; // en kg

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  length?: number; // en cm

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  width?: number; // en cm

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  height?: number; // en cm
}

export class EstimatePricingDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  itemPrice: number;

  @IsEnum(ProductCategory)
  @IsOptional()
  category?: ProductCategory;

  @ValidateNested()
  @Type(() => ProductDimensionsDto)
  @IsOptional()
  dimensions?: ProductDimensionsDto;

  @IsString()
  @IsOptional()
  originCountry?: string; // País de origen (ej: 'US', 'CN', 'UK')
}

