import { IsUrl, IsOptional, IsNotEmpty } from 'class-validator';
import { SanitizeUrl } from '../../common/security/input-sanitizer';

export class ValidateUrlQueryDto {
  @IsUrl({}, { message: 'La URL debe ser válida' })
  @IsNotEmpty({ message: 'La URL es requerida' })
  @IsOptional() // Para permitir que sea opcional en la query
  @SanitizeUrl()
  url?: string;
}

