import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ChatStatus } from '@prisma/client';

export class GetAdminConversationsQueryDto {
  @IsOptional()
  @IsEnum(ChatStatus, { message: 'El estado debe ser un ChatStatus válido' })
  status?: ChatStatus;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  unassigned?: boolean;
}

