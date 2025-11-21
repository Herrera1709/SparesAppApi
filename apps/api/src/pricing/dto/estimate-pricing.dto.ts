import { IsNumber, IsNotEmpty, IsEnum, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductCategory {
  KTM = 'KTM',
  MOTO = 'MOTO',
  AUTO = 'AUTO',
  ELECTRONICS = 'ELECTRONICS',
  CLOTHING = 'CLOTHING',
  OTHER = 'OTHER',
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
}

