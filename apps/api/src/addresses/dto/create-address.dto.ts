import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'El alias debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El alias no puede exceder 50 caracteres' })
  alias: string; // "Casa", "Trabajo", etc.

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'La dirección debe tener al menos 5 caracteres' })
  @MaxLength(200, { message: 'La dirección no puede exceder 200 caracteres' })
  street: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Las referencias no pueden exceder 200 caracteres' })
  references?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'La provincia no puede exceder 100 caracteres' })
  province: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'El cantón no puede exceder 100 caracteres' })
  canton: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'El distrito no puede exceder 100 caracteres' })
  district: string;

  @IsString()
  @IsOptional()
  @MaxLength(10, { message: 'El código postal no puede exceder 10 caracteres' })
  postalCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'El país no puede exceder 100 caracteres' })
  country?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
