import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// SDK oficial CommonJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ProductAdvertisingAPIv1 = require('paapi5-nodejs-sdk');

export interface PaapiGetItemResult {
  asin: string;
  title: string | null;
  brand: string | null;
  detailPageUrl: string | null;
  primaryImageUrl: string | null;
  priceAmount: number | null;
  priceCurrency: string;
  availabilityDisplay: string | null;
  rawItem: Record<string, unknown>;
}

/**
 * Cliente fino sobre PA-API 5 (GetItems). Requiere credenciales de Associates aprobadas.
 *
 * AMAZON_PA_API_ACCESS_KEY, AMAZON_PA_API_SECRET_KEY, AMAZON_PARTNER_TAG
 * AMAZON_PA_API_HOST (default webservices.amazon.com)
 * AMAZON_PA_API_REGION (default us-east-1)
 */
@Injectable()
export class AmazonPaapiClient {
  private readonly logger = new Logger(AmazonPaapiClient.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!(this.getAccessKey() && this.getSecretKey() && this.getPartnerTag());
  }

  async getItemsByAsins(asins: string[]): Promise<{ items: PaapiGetItemResult[]; errors: string[] }> {
    if (!this.isConfigured()) {
      throw new Error(
        'Amazon PA-API no configurada. Define AMAZON_PA_API_ACCESS_KEY, AMAZON_PA_API_SECRET_KEY y AMAZON_PARTNER_TAG.',
      );
    }

    const api = this.createApi();
    const getItemsRequest = new ProductAdvertisingAPIv1.GetItemsRequest();
    getItemsRequest.PartnerTag = this.getPartnerTag();
    getItemsRequest.PartnerType = 'Associates';
    getItemsRequest.ItemIds = asins.map((a) => a.toUpperCase());
    getItemsRequest.Condition = 'New';
    getItemsRequest.Resources = [
      'Images.Primary.Large',
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'ItemInfo.Features',
      'ItemInfo.ContentInfo',
      'Offers.Listings.Price',
      'Offers.Listings.Availability',
      'Offers.Listings.Condition',
    ];

    const data = await new Promise<Record<string, unknown>>((resolve, reject) => {
      try {
        api.getItems(getItemsRequest, (err: Error | null, res: Record<string, unknown>) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(res || {});
        });
      } catch (e) {
        reject(e);
      }
    });

    const errors: string[] = [];
    const errList = (data as { Errors?: Array<{ Code?: string; Message?: string }> }).Errors;
    if (Array.isArray(errList)) {
      for (const e of errList) {
        errors.push(`${e.Code || 'Error'}: ${e.Message || ''}`);
      }
    }

    const itemsResult = (data as { ItemsResult?: { Items?: unknown[] } }).ItemsResult;
    const rawItems = itemsResult?.Items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return { items: [], errors };
    }

    const items: PaapiGetItemResult[] = [];
    for (const raw of rawItems) {
      const parsed = this.mapItem(raw as Record<string, unknown>);
      if (parsed) items.push(parsed);
    }

    return { items, errors };
  }

  /**
   * Búsqueda por palabras (SearchItems). Opcional para catálogo híbrido futuro.
   */
  async searchItems(keywords: string, itemCount = 10): Promise<{ items: PaapiGetItemResult[]; errors: string[] }> {
    if (!this.isConfigured()) {
      throw new Error('Amazon PA-API no configurada.');
    }
    const api = this.createApi();
    const req = new ProductAdvertisingAPIv1.SearchItemsRequest();
    req.PartnerTag = this.getPartnerTag();
    req.PartnerType = 'Associates';
    req.Keywords = keywords;
    req.SearchIndex = 'All';
    req.ItemCount = Math.min(Math.max(itemCount, 1), 10);
    req.Resources = [
      'Images.Primary.Medium',
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'Offers.Listings.Price',
      'Offers.Listings.Availability',
    ];

    const data = await new Promise<Record<string, unknown>>((resolve, reject) => {
      try {
        api.searchItems(req, (err: Error | null, res: Record<string, unknown>) => {
          if (err) reject(err);
          else resolve(res || {});
        });
      } catch (e) {
        reject(e);
      }
    });

    const errors: string[] = [];
    const errList = (data as { Errors?: Array<{ Code?: string; Message?: string }> }).Errors;
    if (Array.isArray(errList)) {
      for (const e of errList) {
        errors.push(`${e.Code || 'Error'}: ${e.Message || ''}`);
      }
    }

    const searchRes = (data as { SearchResult?: { Items?: unknown[] } }).SearchResult;
    const rawItems = searchRes?.Items;
    const items: PaapiGetItemResult[] = [];
    if (Array.isArray(rawItems)) {
      for (const raw of rawItems) {
        const parsed = this.mapItem(raw as Record<string, unknown>);
        if (parsed) items.push(parsed);
      }
    }
    return { items, errors };
  }

  private createApi(): InstanceType<typeof ProductAdvertisingAPIv1.DefaultApi> {
    const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
    defaultClient.accessKey = this.getAccessKey();
    defaultClient.secretKey = this.getSecretKey();
    defaultClient.host = this.config.get<string>('AMAZON_PA_API_HOST') || 'webservices.amazon.com';
    defaultClient.region = this.config.get<string>('AMAZON_PA_API_REGION') || 'us-east-1';
    return new ProductAdvertisingAPIv1.DefaultApi();
  }

  private getAccessKey(): string | undefined {
    return this.config.get<string>('AMAZON_PA_API_ACCESS_KEY');
  }

  private getSecretKey(): string | undefined {
    return this.config.get<string>('AMAZON_PA_API_SECRET_KEY');
  }

  private getPartnerTag(): string | undefined {
    return this.config.get<string>('AMAZON_PARTNER_TAG');
  }

  private mapItem(item: Record<string, unknown>): PaapiGetItemResult | null {
    const asin = (item.ASIN as string) || '';
    if (!asin) return null;

    const title =
      (item.ItemInfo as { Title?: { DisplayValue?: string } })?.Title?.DisplayValue ?? null;
    const brand =
      (item.ItemInfo as { ByLineInfo?: { Brand?: { DisplayValue?: string } } })?.ByLineInfo?.Brand?.DisplayValue ??
      null;

    const large =
      (item.Images as { Primary?: { Large?: { URL?: string } } })?.Primary?.Large?.URL ?? null;

    let priceAmount: number | null = null;
    let priceCurrency = 'USD';
    const listings = (item.Offers as { Listings?: Array<{ Price?: { Amount?: number; Currency?: string } }> })
      ?.Listings;
    if (Array.isArray(listings) && listings[0]?.Price) {
      const p = listings[0].Price;
      if (typeof p.Amount === 'number') priceAmount = p.Amount;
      if (p.Currency) priceCurrency = p.Currency;
    }

    let availabilityDisplay: string | null = null;
    if (Array.isArray(listings) && listings[0]) {
      const av = (listings[0] as { Availability?: { Message?: string } }).Availability;
      if (av?.Message) availabilityDisplay = av.Message;
    }

    const detailPageUrl = (item.DetailPageURL as string) || null;

    return {
      asin: asin.toUpperCase(),
      title,
      brand,
      detailPageUrl,
      primaryImageUrl: large,
      priceAmount,
      priceCurrency,
      availabilityDisplay,
      rawItem: item as Record<string, unknown>,
    };
  }
}
