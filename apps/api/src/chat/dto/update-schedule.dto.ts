import { IsInt, IsBoolean, IsString, IsOptional, Min, Max, Matches, MaxLength } from 'class-validator';

export class UpdateScheduleDto {
  @IsInt()
  @Min(0, { message: 'El día de la semana debe ser entre 0 y 6' })
  @Max(6, { message: 'El día de la semana debe ser entre 0 y 6' })
  dayOfWeek: number;

  @IsBoolean()
  isActive: boolean;

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Formato de hora inválido (debe ser HH:mm)' })
  startTime: string; // HH:mm

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Formato de hora inválido (debe ser HH:mm)' })
  endTime: string; // HH:mm

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'La zona horaria no puede exceder 50 caracteres' })
  timezone?: string;
}

