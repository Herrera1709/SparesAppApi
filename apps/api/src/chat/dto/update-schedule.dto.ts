import { IsInt, IsBoolean, IsString, IsOptional, Min, Max } from 'class-validator';

export class UpdateScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsBoolean()
  isActive: boolean;

  @IsString()
  startTime: string; // HH:mm

  @IsString()
  endTime: string; // HH:mm

  @IsString()
  @IsOptional()
  timezone?: string;
}

