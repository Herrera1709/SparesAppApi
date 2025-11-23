import { IsOptional, IsString, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class GetLogsQueryDto {
  @IsOptional()
  @IsUUID(4, { message: 'adminId debe ser un UUID válido' })
  adminId?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  entityType?: string;

  @IsOptional()
  @IsUUID(4, { message: 'entityId debe ser un UUID válido' })
  entityId?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  action?: string;

  @IsOptional()
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(1000, { message: 'limit no puede exceder 1000' })
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}

