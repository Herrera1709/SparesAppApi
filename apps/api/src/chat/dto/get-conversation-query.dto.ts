import { IsOptional, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetConversationQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  recent?: boolean;
}

