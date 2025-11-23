import { IsEnum, IsNotEmpty } from 'class-validator';
import { ChatStatus } from '@prisma/client';

export class UpdateConversationStatusDto {
  @IsEnum(ChatStatus, { message: 'El estado debe ser un ChatStatus válido' })
  @IsNotEmpty({ message: 'El estado es requerido' })
  status: ChatStatus;
}

