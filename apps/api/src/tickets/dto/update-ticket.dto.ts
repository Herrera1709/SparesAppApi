import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TicketStatus, TicketCategory } from '@prisma/client';

export class UpdateTicketDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}

