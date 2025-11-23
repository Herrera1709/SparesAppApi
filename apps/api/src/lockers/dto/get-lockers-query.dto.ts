import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetLockersQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeInactive?: boolean;
}

