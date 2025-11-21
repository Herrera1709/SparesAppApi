import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateSinpePaymentDto {
  @IsString()
  @IsOptional()
  @IsEnum(['USD', 'CRC'])
  currency?: string;
}

