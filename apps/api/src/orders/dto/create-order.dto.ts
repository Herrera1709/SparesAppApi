import { IsString, IsOptional, IsNumber, Min, IsInt, IsUrl, MaxLength, MinLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { SanitizeUrl, SanitizeString } from '../../common/security/input-sanitizer';

export class CreateOrderDto {
  @IsString()
  @IsUrl({}, { message: 'El link externo debe ser una URL válida (ej: https://www.amazon.com/...)' })
  @MinLength(10, { message: 'La URL debe tener al menos 10 caracteres' })
  @MaxLength(2048, { message: 'La URL no puede exceder 2048 caracteres' })
  @SanitizeUrl()
  externalLink: string;

  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'El nombre del artículo debe tener al menos 1 carácter' })
  @MaxLength(200, { message: 'El nombre del artículo no puede exceder 200 caracteres' })
  @SanitizeString()
  itemName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'addressId debe ser un UUID válido'
  })
  addressId?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'lockerId debe ser un UUID válido'
  })
  lockerId?: string;

  @IsInt()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Type(() => Number)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  @SanitizeString()
  notes?: string;
}

