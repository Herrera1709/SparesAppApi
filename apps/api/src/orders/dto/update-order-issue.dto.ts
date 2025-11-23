import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { SanitizeString } from '../../common/security/input-sanitizer';

export class UpdateOrderIssueDto {
  @IsBoolean()
  @IsOptional()
  hasIssue?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'La descripción de incidencia no puede exceder 1000 caracteres' })
  @SanitizeString()
  issueDescription?: string;
}

