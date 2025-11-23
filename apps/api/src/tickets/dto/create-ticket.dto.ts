import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength, MinLength, Matches } from 'class-validator';
import { TicketCategory } from '@prisma/client';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'orderId debe ser un UUID válido'
  })
  orderId: string;

  @IsEnum(TicketCategory, { message: 'Categoría inválida' })
  category: TicketCategory;

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'El título debe tener al menos 5 caracteres' })
  @MaxLength(200, { message: 'El título no puede exceder 200 caracteres' })
  @SanitizeString()
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres' })
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  @SanitizeString()
  description: string;
}

