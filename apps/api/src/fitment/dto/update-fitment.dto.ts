import { PartialType } from '@nestjs/mapped-types';
import { CreateFitmentDto } from './create-fitment.dto';

export class UpdateFitmentDto extends PartialType(CreateFitmentDto) {}

