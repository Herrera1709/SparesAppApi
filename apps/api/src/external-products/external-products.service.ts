import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ExternalProductItem {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  source: 'ebay' | 'amazon';
}

export interface ExternalSearchResult {
  source: 'ebay' | 'amazon';
  items: ExternalProductItem[];
  totalCount: number;
  /** true si se usó eBay Sandbox (catálogo de prueba limitado, no el eBay real) */
  ebaySandbox?: boolean;
}

@Injectable()
export class ExternalProductsService {
  private readonly logger = new Logger(ExternalProductsService.name);
  private readonly ebayAppId: string | undefined;
  private readonly ebaySandbox: boolean;

  constructor(private config: ConfigService) {
    // Aceptar EBAY_APP_ID o EBAY_CLIENT_ID (el portal de eBay muestra "App ID (Client ID)")
    this.ebayAppId = this.config.get<string>('EBAY_APP_ID') || this.config.get<string>('EBAY_CLIENT_ID');
    // Si el App ID es de Sandbox (contiene SBX), usar la URL de Sandbox
    const forceSandbox = this.config.get<string>('EBAY_SANDBOX') === 'true';
    this.ebaySandbox = forceSandbox || (!!this.ebayAppId && this.ebayAppId.toUpperCase().includes('SBX'));
  }

  async search(query: string, source: 'ebay' | 'amazon', limit: number = 20): Promise<ExternalSearchResult> {
    if (source === 'ebay') {
      return this.searchEbay(query, limit);
    }
    if (source === 'amazon') {
      return this.searchAmazon(query, limit);
    }
    return { source, items: [], totalCount: 0 };
  }

  /**
   * Productos destacados de eBay: varias búsquedas populares combinadas.
   * Útil para mostrar en la landing sin depender del inventario interno.
   */
  async getFeaturedEbay(limit: number = 24): Promise<ExternalSearchResult> {
    if (!this.ebayAppId) {
      return { source: 'ebay', items: [], totalCount: 0, ebaySandbox: false };
    }
    const keywordsList = ['laptop', 'wireless earbuds', 'smartwatch', 'tablet'];
    const perSearch = Math.ceil(limit / keywordsList.length);
    const allItems: ExternalProductItem[] = [];
    const seenIds = new Set<string>();

    for (const kw of keywordsList) {
      try {
        const res = await this.searchEbay(kw, perSearch);
        for (const item of res.items) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            allItems.push(item);
          }
        }
      } catch {
        // ignorar fallos en una búsqueda
      }
    }

    return {
      source: 'ebay',
      items: allItems.slice(0, limit),
      totalCount: allItems.length,
      ebaySandbox: this.ebaySandbox,
    };
  }

  private async searchEbay(keywords: string, limit: number): Promise<ExternalSearchResult> {
    if (!this.ebayAppId) {
      this.logger.warn('EBAY_APP_ID o EBAY_CLIENT_ID no configurado. Añade una en .env');
      return { source: 'ebay', items: [], totalCount: 0, ebaySandbox: false };
    }

    // Sandbox: svcs.sandbox.ebay.com | Producción: svcs.ebay.com
    const baseUrl = this.ebaySandbox
      ? 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'
      : 'https://svcs.ebay.com/services/search/FindingService/v1';
    const url = baseUrl;
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findItemsByKeywords',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': this.ebayAppId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      keywords: keywords.trim(),
      'paginationInput.entriesPerPage': String(Math.min(limit, 100)),
      'outputSelector': 'PictureURLSuperSize',
    });

    try {
      const { data } = await axios.get(`${url}?${params.toString()}`, {
        timeout: 10000,
        headers: { Accept: 'application/json' },
      });

      const items: ExternalProductItem[] = [];
      const res = data?.findItemsByKeywordsResponse?.[0];
      if (!res || res.ack?.[0] !== 'Success') {
        const errMsg = res?.errorMessage?.[0]?.error?.[0]?.message?.[0] || res?.ack?.[0] || 'Sin respuesta';
        this.logger.warn(`eBay API: ${errMsg}`);
        return { source: 'ebay', items: [], totalCount: 0, ebaySandbox: this.ebaySandbox };
      }

      const searchResult = res.searchResult?.[0];
      const count = parseInt(searchResult?.['@count'] || '0', 10);
      const rawItems = searchResult?.item || [];

      for (const it of Array.isArray(rawItems) ? rawItems : [rawItems]) {
        const itemId = it.itemId?.[0] || '';
        const title = it.title?.[0] || 'Sin título';
        const viewItemURL = it.viewItemURL?.[0] || '';
        // galleryURL puede venir en distintos formatos; forzar HTTPS para evitar mixed content
        let imageUrl: string | null = it.galleryURL?.[0] || it.pictureURLSuperSize?.[0] || it.pictureURLLarge?.[0] || null;
        if (imageUrl && imageUrl.startsWith('http://')) {
          imageUrl = 'https://' + imageUrl.slice(7);
        }
        const sellingStatus = it.sellingStatus?.[0];
        const currentPrice = sellingStatus?.currentPrice?.[0];
        const value = currentPrice?.['__value__'] ?? currentPrice;
        const price = parseFloat(value) || 0;
        const currency = currentPrice?.['@currencyId'] || 'USD';

        items.push({
          id: itemId,
          title,
          url: viewItemURL,
          imageUrl,
          price,
          currency,
          source: 'ebay',
        });
      }

      return {
        source: 'ebay',
        items,
        totalCount: count,
        ebaySandbox: this.ebaySandbox,
      };
    } catch (err: any) {
      this.logger.error(`eBay search error: ${err.message}`);
      return { source: 'ebay', items: [], totalCount: 0, ebaySandbox: this.ebaySandbox };
    }
  }

  private async searchAmazon(_keywords: string, _limit: number): Promise<ExternalSearchResult> {
    // Amazon requiere PA-API (Product Advertising API) con credenciales de Associates.
    // Sin configurar, devolvemos vacío. Ver README para añadir AMAZON_* en .env.
    this.logger.debug('Amazon search no configurado (requiere PA-API)');
    return { source: 'amazon', items: [], totalCount: 0 };
  }
}
