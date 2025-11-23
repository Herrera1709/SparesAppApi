import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { TicketStatus } from '@prisma/client';

export class GetAdminTicketsQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus, { message: 'El estado debe ser un TicketStatus válido' })
  status?: TicketStatus;

  @IsOptional()
  @IsUUID(4, { message: 'orderId debe ser un UUID válido' })
  orderId?: string;

  @IsOptional()
  @IsUUID(4, { message: 'userId debe ser un UUID válido' })
  userId?: string;
}

