import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TicketStatus, TicketCategory } from '@prisma/client';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class UpdateTicketDto {
  @IsEnum(TicketStatus, { message: 'Estado inválido' })
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketCategory, { message: 'Categoría inválida' })
  @IsOptional()
  category?: TicketCategory;

  @IsString()
  @IsOptional()
  @MinLength(5, { message: 'El título debe tener al menos 5 caracteres' })
  @MaxLength(200, { message: 'El título no puede exceder 200 caracteres' })
  @SanitizeString()
  title?: string;

  @IsString()
  @IsOptional()
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres' })
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  @SanitizeString()
  description?: string;
}

