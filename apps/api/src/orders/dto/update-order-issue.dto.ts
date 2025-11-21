import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderIssueDto {
  @IsBoolean()
  @IsOptional()
  hasIssue?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'La descripción de incidencia no puede exceder 1000 caracteres' })
  issueDescription?: string;
}

