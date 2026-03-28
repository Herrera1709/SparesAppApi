import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ImportAmazonUrlDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  url!: string;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}
