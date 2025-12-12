import { Module } from '@nestjs/common';
import { FitmentController } from './fitment.controller';
import { FitmentService } from './fitment.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FitmentController],
  providers: [FitmentService],
  exports: [FitmentService],
})
export class FitmentModule {}

