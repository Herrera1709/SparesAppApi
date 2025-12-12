import { IsUUID, IsOptional, IsInt, IsString, IsBoolean, Min, Max } from 'class-validator';

export class CreateFitmentDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  vehicleVariantId?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearFrom?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearTo?: number;

  @IsOptional()
  @IsString()
  position?: string; // delantero, trasero, etc.

  @IsOptional()
  @IsString()
  side?: string; // izquierdo, derecho, ambos

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

