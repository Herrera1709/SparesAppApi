import { IsString, IsIn, IsOptional, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @IsString()
  @MaxLength(200)
  q: string;

  @IsOptional()
  @IsIn(['ebay', 'amazon'])
  source?: 'ebay' | 'amazon' = 'ebay';

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
