import { IsOptional, IsString, IsBoolean, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class GetInventoryQueryDto {
  @IsOptional()
  @IsUUID(4, { message: 'productId debe ser un UUID válido' })
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'location no puede exceder 100 caracteres' })
  @SanitizeString()
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'warehouse no puede exceder 100 caracteres' })
  @SanitizeString()
  warehouse?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  lowStock?: boolean;
}

