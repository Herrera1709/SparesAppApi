import { Injectable } from '@nestjs/common';
import { EstimatePricingDto, ProductCategory } from './dto/estimate-pricing.dto';

@Injectable()
export class PricingService {
  // Reglas de cálculo basadas en categoría
  private readonly categoryRules = {
    [ProductCategory.KTM]: {
      baseShippingMultiplier: 0.15, // 15% del precio del artículo
      weightMultiplier: 8, // $8 por kg adicional
      taxRate: 0.13, // 13% de impuestos
      serviceFeeMultiplier: 0.10, // 10% de servicio
    },
    [ProductCategory.MOTO]: {
      baseShippingMultiplier: 0.18,
      weightMultiplier: 10,
      taxRate: 0.13,
      serviceFeeMultiplier: 0.12,
    },
    [ProductCategory.AUTO]: {
      baseShippingMultiplier: 0.20,
      weightMultiplier: 12,
      taxRate: 0.13,
      serviceFeeMultiplier: 0.15,
    },
    [ProductCategory.ELECTRONICS]: {
      baseShippingMultiplier: 0.12,
      weightMultiplier: 6,
      taxRate: 0.13,
      serviceFeeMultiplier: 0.08,
    },
    [ProductCategory.CLOTHING]: {
      baseShippingMultiplier: 0.10,
      weightMultiplier: 4,
      taxRate: 0.13,
      serviceFeeMultiplier: 0.08,
    },
    [ProductCategory.OTHER]: {
      baseShippingMultiplier: 0.15,
      weightMultiplier: 7,
      taxRate: 0.13,
      serviceFeeMultiplier: 0.10,
    },
  };

  // Multiplicadores por país de origen
  private readonly originMultipliers = {
    'US': 1.0,      // Estados Unidos - base
    'CN': 0.85,     // China - más económico
    'UK': 1.1,      // Reino Unido - ligeramente más caro
    'DE': 1.05,     // Alemania
    'JP': 1.15,     // Japón
    'MX': 0.9,      // México
    'DEFAULT': 1.0,
  };

  estimatePricing(dto: EstimatePricingDto) {
    const category = dto.category || ProductCategory.OTHER;
    const rules = this.categoryRules[category];

    const itemPrice = dto.itemPrice;
    
    // Calcular envío base
    let estimatedShipping = itemPrice * rules.baseShippingMultiplier;
    
    // Ajustar por peso si está disponible
    if (dto.dimensions?.weight && dto.dimensions.weight > 0) {
      const weightShipping = dto.dimensions.weight * rules.weightMultiplier;
      // Usar el mayor entre el cálculo por precio o por peso
      estimatedShipping = Math.max(estimatedShipping, weightShipping);
      
      // Ajuste por volumen si las dimensiones están disponibles
      if (dto.dimensions.length && dto.dimensions.width && dto.dimensions.height) {
        const volume = (dto.dimensions.length * dto.dimensions.width * dto.dimensions.height) / 1000000; // m³
        const volumetricWeight = volume * 200; // Factor de conversión volumétrica
        const volumetricShipping = volumetricWeight * rules.weightMultiplier;
        estimatedShipping = Math.max(estimatedShipping, volumetricShipping);
      }
    }
    
    // Ajustar por país de origen
    const originMultiplier = dto.originCountry 
      ? (this.originMultipliers[dto.originCountry.toUpperCase()] || this.originMultipliers['DEFAULT'])
      : this.originMultipliers['DEFAULT'];
    
    estimatedShipping = estimatedShipping * originMultiplier;
    
    // Calcular impuestos (sobre precio + envío)
    const estimatedTaxes = (itemPrice + estimatedShipping) * rules.taxRate;
    
    // Calcular tarifa de servicio
    const estimatedServiceFee = itemPrice * rules.serviceFeeMultiplier;
    
    // Total
    const estimatedTotal = itemPrice + estimatedShipping + estimatedTaxes + estimatedServiceFee;

    // Calcular días estimados de entrega
    const estimatedDays = this.calculateEstimatedDays(dto.originCountry, category);

    return {
      itemPrice: Number(itemPrice.toFixed(2)),
      estimatedShipping: Number(estimatedShipping.toFixed(2)),
      estimatedTaxes: Number(estimatedTaxes.toFixed(2)),
      estimatedServiceFee: Number(estimatedServiceFee.toFixed(2)),
      estimatedTotal: Number(estimatedTotal.toFixed(2)),
      category,
      estimatedDays: {
        min: estimatedDays.min,
        max: estimatedDays.max,
      },
      breakdown: {
        itemPrice: Number(itemPrice.toFixed(2)),
        shipping: {
          base: Number((itemPrice * rules.baseShippingMultiplier).toFixed(2)),
          weightAdjustment: dto.dimensions?.weight 
            ? Number((dto.dimensions.weight * rules.weightMultiplier).toFixed(2))
            : 0,
          originMultiplier: Number((originMultiplier * 100).toFixed(0)) + '%',
        },
        taxes: Number(estimatedTaxes.toFixed(2)),
        serviceFee: Number(estimatedServiceFee.toFixed(2)),
      },
      disclaimer: 'Este es un estimado basado en la categoría, peso, dimensiones y origen del producto. La cotización final puede variar y será confirmada por nuestro equipo.',
    };
  }

  private calculateEstimatedDays(originCountry?: string, category?: ProductCategory): { min: number; max: number } {
    // Días base según país
    const baseDays: Record<string, { min: number; max: number }> = {
      'US': { min: 7, max: 14 },
      'CN': { min: 14, max: 21 },
      'UK': { min: 10, max: 18 },
      'DE': { min: 12, max: 20 },
      'JP': { min: 10, max: 18 },
      'MX': { min: 5, max: 12 },
      'DEFAULT': { min: 10, max: 20 },
    };

    const days = originCountry 
      ? (baseDays[originCountry.toUpperCase()] || baseDays['DEFAULT'])
      : baseDays['DEFAULT'];

    // Ajustar por categoría (algunas categorías pueden tardar más en aduanas)
    if (category === ProductCategory.AUTO || category === ProductCategory.MOTO) {
      return { min: days.min + 3, max: days.max + 7 };
    }

    return days;
  }
}

