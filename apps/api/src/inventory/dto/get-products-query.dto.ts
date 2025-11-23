import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
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
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  isActive?: boolean;
}

