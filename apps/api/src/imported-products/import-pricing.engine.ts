import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';

export interface ImportPricingInput {
  /** Precio base del artículo en USD (Amazon lista) */
  basePriceUsd: number;
}

export interface ImportPricingBreakdown {
  basePriceUsd: number;
  shippingUsd: number;
  importTaxUsd: number;
  marginUsd: number;
  finalPriceUsd: number;
  exchangeRate: number;
  finalPriceLocal: number;
  localCurrency: string;
  /** Valores aplicados (auditoría / UI) */
  config: Record<string, number | string>;
}

/**
 * Motor de precios para productos importados. Reglas vía variables de entorno (extensible).
 *
 * Env sugeridas:
 * - PRICING_IMPORT_SHIPPING_USD (fijo en USD, default 8)
 * - PRICING_IMPORT_TAX_PERCENT (sobre base+envío, default 13)
 * - PRICING_IMPORT_MARGIN_PERCENT (sobre base, default 12)
 * - PRICING_USD_TO_CRC (tipo de cambio, default 520)
 * - PRICING_LOCAL_CURRENCY (default CRC)
 */
@Injectable()
export class ImportPricingEngine {
  constructor(private readonly config: ConfigService) {}

  calculate(input: ImportPricingInput): ImportPricingBreakdown {
    const base = this.decimal(input.basePriceUsd);
    const shippingUsd = this.num('PRICING_IMPORT_SHIPPING_USD', 8);
    const taxPercent = this.num('PRICING_IMPORT_TAX_PERCENT', 13);
    const marginPercent = this.num('PRICING_IMPORT_MARGIN_PERCENT', 12);
    const fx = this.num('PRICING_USD_TO_CRC', 520);
    const localCurrency = this.config.get<string>('PRICING_LOCAL_CURRENCY') || 'CRC';

    const ship = new Decimal(shippingUsd);
    const taxableBase = base.plus(ship);
    const taxRate = new Decimal(taxPercent).div(100);
    const importTaxUsd = taxableBase.mul(taxRate);
    const marginRate = new Decimal(marginPercent).div(100);
    const marginUsd = base.mul(marginRate);
    const finalUsd = base.plus(ship).plus(importTaxUsd).plus(marginUsd);

    const finalPriceLocal = finalUsd.mul(new Decimal(fx));

    return {
      basePriceUsd: base.toNumber(),
      shippingUsd: ship.toNumber(),
      importTaxUsd: this.round2(importTaxUsd),
      marginUsd: this.round2(marginUsd),
      finalPriceUsd: this.round2(finalUsd),
      exchangeRate: fx,
      finalPriceLocal: this.round2Local(finalPriceLocal),
      localCurrency,
      config: {
        PRICING_IMPORT_SHIPPING_USD: shippingUsd,
        PRICING_IMPORT_TAX_PERCENT: taxPercent,
        PRICING_IMPORT_MARGIN_PERCENT: marginPercent,
        PRICING_USD_TO_CRC: fx,
        PRICING_LOCAL_CURRENCY: localCurrency,
      },
    };
  }

  private num(key: string, def: number): number {
    const v = this.config.get<string>(key);
    if (v === undefined || v === '') return def;
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }

  private decimal(n: number): Decimal {
    return new Decimal(Number.isFinite(n) ? n : 0);
  }

  private round2(d: Decimal): number {
    return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  private round2Local(d: Decimal): number {
    return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }
}
