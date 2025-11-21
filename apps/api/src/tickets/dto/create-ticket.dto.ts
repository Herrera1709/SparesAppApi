import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { TicketCategory } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;
}

