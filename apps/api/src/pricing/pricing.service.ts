import { Injectable } from '@nestjs/common';
import { EstimatePricingDto, ProductCategory } from './dto/estimate-pricing.dto';

@Injectable()
export class PricingService {
  // Reglas de cálculo basadas en categoría
  private readonly categoryRules = {
    [ProductCategory.KTM]: {
      shippingMultiplier: 0.15, // 15% del precio del artículo
      taxRate: 0.13, // 13% de impuestos
      serviceFeeMultiplier: 0.10, // 10% de servicio
    },
    [ProductCategory.MOTO]: {
      shippingMultiplier: 0.18,
      taxRate: 0.13,
      serviceFeeMultiplier: 0.12,
    },
    [ProductCategory.AUTO]: {
      shippingMultiplier: 0.20,
      taxRate: 0.13,
      serviceFeeMultiplier: 0.15,
    },
    [ProductCategory.ELECTRONICS]: {
      shippingMultiplier: 0.12,
      taxRate: 0.13,
      serviceFeeMultiplier: 0.08,
    },
    [ProductCategory.CLOTHING]: {
      shippingMultiplier: 0.10,
      taxRate: 0.13,
      serviceFeeMultiplier: 0.08,
    },
    [ProductCategory.OTHER]: {
      shippingMultiplier: 0.15,
      taxRate: 0.13,
      serviceFeeMultiplier: 0.10,
    },
  };

  estimatePricing(dto: EstimatePricingDto) {
    const category = dto.category || ProductCategory.OTHER;
    const rules = this.categoryRules[category];

    const itemPrice = dto.itemPrice;
    const estimatedShipping = itemPrice * rules.shippingMultiplier;
    const estimatedTaxes = (itemPrice + estimatedShipping) * rules.taxRate;
    const estimatedServiceFee = itemPrice * rules.serviceFeeMultiplier;
    const estimatedTotal = itemPrice + estimatedShipping + estimatedTaxes + estimatedServiceFee;

    return {
      itemPrice: Number(itemPrice.toFixed(2)),
      estimatedShipping: Number(estimatedShipping.toFixed(2)),
      estimatedTaxes: Number(estimatedTaxes.toFixed(2)),
      estimatedServiceFee: Number(estimatedServiceFee.toFixed(2)),
      estimatedTotal: Number(estimatedTotal.toFixed(2)),
      category,
      disclaimer: 'Este es un estimado basado en la categoría del producto. La cotización final puede variar según el peso, dimensiones y origen del artículo.',
    };
  }
}

