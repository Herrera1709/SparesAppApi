import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class HybridSearchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  q!: string;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}
