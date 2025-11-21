import { IsString, IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateWishlistItemDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'El link debe ser una URL válida' })
  externalLink: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'El título no puede exceder 200 caracteres' })
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notes?: string;
}

