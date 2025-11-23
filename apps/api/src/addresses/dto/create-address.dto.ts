import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength, MinLength, Matches } from 'class-validator';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'El alias debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El alias no puede exceder 50 caracteres' })
  @SanitizeString()
  alias: string; // "Casa", "Trabajo", etc.

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'La dirección debe tener al menos 5 caracteres' })
  @MaxLength(200, { message: 'La dirección no puede exceder 200 caracteres' })
  @SanitizeString()
  street: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Las referencias no pueden exceder 200 caracteres' })
  @SanitizeString()
  references?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'La provincia no puede exceder 100 caracteres' })
  @SanitizeString()
  province: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'El cantón no puede exceder 100 caracteres' })
  @SanitizeString()
  canton: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'El distrito no puede exceder 100 caracteres' })
  @SanitizeString()
  district: string;

  @IsString()
  @IsOptional()
  @MaxLength(10, { message: 'El código postal no puede exceder 10 caracteres' })
  @Matches(/^[0-9A-Z\s-]*$/, { message: 'El código postal solo puede contener números, letras, espacios y guiones' })
  @SanitizeString()
  postalCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'El país no puede exceder 100 caracteres' })
  @SanitizeString()
  country?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
