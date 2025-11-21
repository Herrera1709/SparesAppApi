import { IsNumber, Min, Max } from 'class-validator';

export class UpdateTtlDto {
  @IsNumber()
  @Min(1, { message: 'El TTL mínimo es 1 minuto' })
  @Max(60, { message: 'El TTL máximo es 60 minutos' })
  ttlMinutes: number;
}

