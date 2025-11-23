import { IsUrl, IsNotEmpty } from 'class-validator';
import { SanitizeUrl } from '../../common/security/input-sanitizer';

export class ExtractProductDto {
  @IsUrl({}, { message: 'La URL debe ser válida' })
  @IsNotEmpty({ message: 'La URL es requerida' })
  @SanitizeUrl()
  url: string;
}

