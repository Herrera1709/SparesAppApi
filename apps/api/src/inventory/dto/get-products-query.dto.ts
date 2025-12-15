import { IsOptional, IsString, IsBoolean, MaxLength, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class GetProductsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'search no puede exceder 200 caracteres' })
  @SanitizeString()
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'category no puede exceder 100 caracteres' })
  @SanitizeString()
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'brand no puede exceder 100 caracteres' })
  @SanitizeString()
  brand?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string; // ID del vehículo seleccionado

  @IsOptional()
  @IsUUID()
  vehicleVariantId?: string; // ID de la variante del vehículo (opcional)

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  includeUniversal?: boolean; // Incluir repuestos universales

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1; // Página actual (por defecto 1)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20; // Productos por página (por defecto 20, máximo 100)
}

