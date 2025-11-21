import { IsArray, IsString, IsOptional } from 'class-validator';

export class UpdateOrderTagsDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

