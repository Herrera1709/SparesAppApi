import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class CreateLockerDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'El nombre del casillero debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre del casillero no puede exceder 100 caracteres' })
  @SanitizeString()
  name: string; // "Miami – USA"

  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'El país no puede exceder 100 caracteres' })
  @SanitizeString()
  country: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'La ciudad no puede exceder 100 caracteres' })
  @SanitizeString()
  city: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'La dirección debe tener al menos 10 caracteres' })
  @MaxLength(300, { message: 'La dirección no puede exceder 300 caracteres' })
  @SanitizeString()
  address: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'El código del casillero debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El código del casillero no puede exceder 50 caracteres' })
  @SanitizeString()
  lockerCode: string; // Código/formato del casillero

  @IsString()
  @IsNotEmpty()
  @MinLength(20, { message: 'Las instrucciones deben tener al menos 20 caracteres' })
  @MaxLength(1000, { message: 'Las instrucciones no pueden exceder 1000 caracteres' })
  @SanitizeString()
  instructions: string; // Instrucciones de uso

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

