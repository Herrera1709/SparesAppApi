import { IsOptional, IsEnum, IsUUID, IsDateString, IsBoolean, IsString, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { OrderStatus } from '@prisma/client';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class GetOrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'El estado debe ser un OrderStatus válido' })
  status?: OrderStatus;

  @IsOptional()
  @IsUUID(4, { message: 'userId debe ser un UUID válido' })
  userId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'startDate debe ser una fecha válida en formato ISO' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate debe ser una fecha válida en formato ISO' })
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  hasIssue?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'tags no puede exceder 500 caracteres' })
  @SanitizeString()
  tags?: string; // Tags separados por comas, se procesarán en el controlador
}

