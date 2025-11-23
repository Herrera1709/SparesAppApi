import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PricingService } from './pricing.service';
import { EstimatePricingDto } from './dto/estimate-pricing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pricing')
@UseGuards(JwtAuthGuard) // Proteger endpoint de pricing
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests por minuto
  @Post('estimate')
  estimate(@Body() estimatePricingDto: EstimatePricingDto) {
    return this.pricingService.estimatePricing(estimatePricingDto);
  }
}

