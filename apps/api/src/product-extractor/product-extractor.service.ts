import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { SSRFProtectionService } from '../common/security/ssrf-protection.service';

// Nota: Para producción, considerar usar APIs oficiales de Amazon/eBay
// Este servicio usa scraping básico que puede no ser confiable a largo plazo

export interface ProductInfo {
  title?: string;
  price?: number;
  currency?: string;
  images?: string[];
  description?: string;
  availability?: string;
  dimensions?: {
    weight?: number; // en kg
    length?: number; // en cm
    width?: number; // en cm
    height?: number; // en cm
  };
  provider: 'AMAZON' | 'EBAY' | 'OTHER';
  rawData?: any;
}

@Injectable()
export class ProductExtractorService {
  private readonly logger = new Logger(ProductExtractorService.name);

  constructor(private ssrfProtection: SSRFProtectionService) {}

  /**
   * Extrae información de un producto desde una URL
   */
  async extractProductInfo(url: string): Promise<ProductInfo> {
    try {
      // ============================================
      // SEGURIDAD: Validar URL contra SSRF
      // ============================================
      let validation;
      try {
        validation = this.ssrfProtection.validateUrl(url);
      } catch (error) {
        this.logger.error(`Error validando URL: ${error.message}`);
        throw new BadRequestException('Error al validar la URL. Por favor, verifica que sea una URL válida.');
      }

      if (!validation.isValid) {
        this.logger.warn(`[Security] Intento de SSRF bloqueado: ${url} - ${validation.error}`);
        throw new BadRequestException(validation.error || 'URL no permitida');
      }

      const sanitizedUrl = validation.sanitizedUrl || url;

      // Detectar proveedor
      const provider = this.detectProvider(sanitizedUrl);
      
      let result: ProductInfo;
      if (provider === 'AMAZON') {
        result = await this.extractFromAmazon(sanitizedUrl);
      } else if (provider === 'EBAY') {
        result = await this.extractFromEbay(sanitizedUrl);
      } else {
        result = await this.extractGeneric(sanitizedUrl);
      }

      // Si no se pudo extraer información, retornar un objeto básico en lugar de fallar
      if (!result.title && !result.price) {
        this.logger.warn(`No se pudo extraer información completa del producto: ${url}`);
        return {
          provider,
          title: undefined,
          price: undefined,
        };
      }

      return result;
    } catch (error) {
      // Si ya es un BadRequestException, re-lanzarlo
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`Error extrayendo información del producto: ${error.message}`, error.stack);
      // No exponer detalles del error interno
      throw new BadRequestException('No se pudo extraer información del producto. Verifica que la URL sea válida y accesible.');
    }
  }

  /**
   * Detecta el proveedor basado en la URL
   */
  private detectProvider(url: string): 'AMAZON' | 'EBAY' | 'OTHER' {
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('amazon.com') || lowerUrl.includes('amazon.')) {
      return 'AMAZON';
    } else if (lowerUrl.includes('ebay.com') || lowerUrl.includes('ebay.')) {
      return 'EBAY';
    }
    
    return 'OTHER';
  }

  /**
   * Extrae información de Amazon
   */
  private async extractFromAmazon(url: string): Promise<ProductInfo> {
    try {
      // ============================================
      // SEGURIDAD: Validar URL nuevamente antes de hacer request
      // ============================================
      const validation = this.ssrfProtection.validateUrl(url);
      if (!validation.isValid) {
        throw new BadRequestException(validation.error || 'URL no permitida');
      }

      const response = await axios.get(validation.sanitizedUrl || url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 10000,
        maxRedirects: 5, // Limitar redirects
        validateStatus: (status) => status >= 200 && status < 400, // Solo 2xx y 3xx
      });

      const $ = cheerio.load(response.data);
      const productInfo: ProductInfo = {
        provider: 'AMAZON',
      };

      // Título
      productInfo.title = $('#productTitle').text().trim() || 
                         $('h1.a-size-large').text().trim() ||
                         $('span#productTitle').text().trim() ||
                         $('h1').first().text().trim();

      // Precio
      const priceText = $('#priceblock_ourprice').text() || 
                       $('#priceblock_dealprice').text() ||
                       $('.a-price .a-offscreen').first().text() ||
                       $('span.a-price-whole').first().text();
      
      if (priceText) {
        const priceMatch = priceText.replace(/[^0-9.,]/g, '').replace(',', '');
        productInfo.price = parseFloat(priceMatch);
        productInfo.currency = priceText.includes('$') ? 'USD' : 'USD';
      }

      // Imágenes
      const images: string[] = [];
      $('#landingImage').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) images.push(src);
      });
      $('img[data-a-image-name="landingImage"]').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !images.includes(src)) images.push(src);
      });
      productInfo.images = images.slice(0, 5); // Máximo 5 imágenes

      // Descripción
      productInfo.description = $('#feature-bullets ul').text().trim() ||
                               $('#productDescription').text().trim() ||
                               $('div#productDescription_feature_div').text().trim();

      // Disponibilidad
      productInfo.availability = $('#availability span').text().trim() ||
                                $('div#availability span').text().trim() ||
                                'Disponible';

      // Dimensiones y peso (si están disponibles)
      const technicalDetails = $('#productDetails_techSpec_section_1, #productDetails_detailBullets_sections1').text();
      const weightMatch = technicalDetails.match(/(\d+\.?\d*)\s*(?:kg|pounds?|lbs?)/i);
      if (weightMatch) {
        let weight = parseFloat(weightMatch[1]);
        if (technicalDetails.toLowerCase().includes('pound') || technicalDetails.toLowerCase().includes('lb')) {
          weight = weight * 0.453592; // Convertir libras a kg
        }
        productInfo.dimensions = { weight };
      }

      return productInfo;
    } catch (error) {
      this.logger.warn(`Error extrayendo de Amazon: ${error.message}`);
      return { provider: 'AMAZON' };
    }
  }

  /**
   * Extrae información de eBay
   */
  private async extractFromEbay(url: string): Promise<ProductInfo> {
    try {
      // ============================================
      // SEGURIDAD: Validar URL contra SSRF
      // ============================================
      const validation = this.ssrfProtection.validateUrl(url);
      if (!validation.isValid) {
        throw new BadRequestException(validation.error || 'URL no permitida');
      }

      const response = await axios.get(validation.sanitizedUrl || url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const $ = cheerio.load(response.data);
      const productInfo: ProductInfo = {
        provider: 'EBAY',
      };

      // Título
      productInfo.title = $('#x-item-title-label').text().trim() ||
                         $('h1.it-ttl').text().trim() ||
                         $('h1[itemprop="name"]').text().trim() ||
                         $('h1').first().text().trim();

      // Precio
      const priceText = $('#prcIsum').text() || 
                       $('.notranslate').first().text() ||
                       $('[itemprop="price"]').text();
      
      if (priceText) {
        const priceMatch = priceText.replace(/[^0-9.,]/g, '').replace(',', '');
        productInfo.price = parseFloat(priceMatch);
        productInfo.currency = 'USD';
      }

      // Imágenes
      const images: string[] = [];
      $('#icImg').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) images.push(src);
      });
      $('img[itemprop="image"]').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !images.includes(src)) images.push(src);
      });
      productInfo.images = images.slice(0, 5);

      // Descripción
      productInfo.description = $('#desc_wrapper_ctr').text().trim() ||
                               $('div[itemprop="description"]').text().trim();

      // Disponibilidad
      productInfo.availability = $('.qtySel').length > 0 ? 'Disponible' : 'Verificar disponibilidad';

      return productInfo;
    } catch (error) {
      this.logger.warn(`Error extrayendo de eBay: ${error.message}`);
      return { provider: 'EBAY' };
    }
  }

  /**
   * Extrae información genérica de cualquier URL
   */
  private async extractGeneric(url: string): Promise<ProductInfo> {
    try {
      // ============================================
      // SEGURIDAD: Validar URL contra SSRF
      // ============================================
      const validation = this.ssrfProtection.validateUrl(url);
      if (!validation.isValid) {
        throw new BadRequestException(validation.error || 'URL no permitida');
      }

      const response = await axios.get(validation.sanitizedUrl || url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const $ = cheerio.load(response.data);
      const productInfo: ProductInfo = {
        provider: 'OTHER',
      };

      // Intentar extraer título (Open Graph o meta tags)
      productInfo.title = $('meta[property="og:title"]').attr('content') ||
                         $('title').text().trim() ||
                         $('h1').first().text().trim();

      // Precio (Open Graph)
      const priceText = $('meta[property="product:price:amount"]').attr('content');
      if (priceText) {
        productInfo.price = parseFloat(priceText);
        productInfo.currency = $('meta[property="product:price:currency"]').attr('content') || 'USD';
      }

      // Imágenes (Open Graph)
      const images: string[] = [];
      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr('content');
        if (src) images.push(src);
      });
      productInfo.images = images.slice(0, 5);

      // Descripción
      productInfo.description = $('meta[property="og:description"]').attr('content') ||
                               $('meta[name="description"]').attr('content');

      return productInfo;
    } catch (error) {
      this.logger.warn(`Error extrayendo información genérica: ${error.message}`);
      return { provider: 'OTHER' };
    }
  }

  /**
   * Valida si una URL es válida para extracción
   */
  isValidProductUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    const validation = this.ssrfProtection.validateUrl(url);
    return validation.isValid;
  }
}

