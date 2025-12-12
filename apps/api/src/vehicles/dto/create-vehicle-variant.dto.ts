import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateVehicleVariantDto {
  @IsOptional()
  @IsString()
  trim?: string;

  @IsOptional()
  @IsString()
  engine?: string;

  @IsOptional()
  @IsString()
  transmission?: string;

  @IsOptional()
  @IsString()
  driveType?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

