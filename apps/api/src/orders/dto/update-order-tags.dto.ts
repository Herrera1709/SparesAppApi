import { IsArray, IsString, IsOptional, ArrayMaxSize, MaxLength } from 'class-validator';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class UpdateOrderTagsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, { message: 'Máximo 10 tags permitidos' })
  @MaxLength(50, { each: true, message: 'Cada tag no puede exceder 50 caracteres' })
  @IsOptional()
  tags?: string[];
}

