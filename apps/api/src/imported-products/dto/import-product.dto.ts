import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * POST /api/import-product
 * Envía `url` o `input` (cualquiera con el enlace Amazon). El controlador exige al menos uno.
 */
export class ImportProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  input?: string;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}
