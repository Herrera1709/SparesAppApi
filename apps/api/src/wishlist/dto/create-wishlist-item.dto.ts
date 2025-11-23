import { IsString, IsNotEmpty, IsOptional, IsUrl, MaxLength, MinLength } from 'class-validator';
import { SanitizeUrl, SanitizeString } from '../../common/security/input-sanitizer';

export class CreateWishlistItemDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'El link debe ser una URL válida' })
  @MinLength(10, { message: 'La URL debe tener al menos 10 caracteres' })
  @MaxLength(2048, { message: 'La URL no puede exceder 2048 caracteres' })
  @SanitizeUrl()
  externalLink: string;

  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'El título debe tener al menos 1 carácter' })
  @MaxLength(200, { message: 'El título no puede exceder 200 caracteres' })
  @SanitizeString()
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  @SanitizeString()
  notes?: string;
}

