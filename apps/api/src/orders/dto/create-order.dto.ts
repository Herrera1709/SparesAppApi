import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsString()
  externalLink: string;

  @IsString()
  @IsOptional()
  itemName?: string;

  @IsString()
  @IsOptional()
  addressId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

