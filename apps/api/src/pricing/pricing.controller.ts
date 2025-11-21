import { Controller, Post, Body } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { EstimatePricingDto } from './dto/estimate-pricing.dto';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('estimate')
  estimate(@Body() estimatePricingDto: EstimatePricingDto) {
    return this.pricingService.estimatePricing(estimatePricingDto);
  }
}

