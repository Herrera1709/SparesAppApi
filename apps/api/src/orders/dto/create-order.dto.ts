import { IsString, IsOptional, IsNumber, Min, IsInt, IsUrl, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsString()
  @IsUrl({}, { message: 'El link externo debe ser una URL válida (ej: https://www.amazon.com/...)' })
  externalLink: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'El nombre del artículo no puede exceder 200 caracteres' })
  itemName?: string;

  @IsString()
  @IsOptional()
  addressId?: string;

  @IsString()
  @IsOptional()
  lockerId?: string;

  @IsInt()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notes?: string;
}

