import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Servicio para prevenir SSRF (Server-Side Request Forgery)
 * Previene que se hagan requests a URLs internas o peligrosas
 */
@Injectable()
export class SSRFProtectionService {
  // IPs privadas y locales que NO deben ser accesibles
  private readonly BLOCKED_IPS = [
    '127.0.0.1',
    'localhost',
    '0.0.0.0',
    '::1',
    '::ffff:127.0.0.1',
  ];

  // Rangos de IPs privadas
  private readonly PRIVATE_IP_RANGES = [
    /^10\./,           // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,     // 192.168.0.0/16
    /^169\.254\./,     // Link-local
    /^fc00:/,          // IPv6 private
    /^fe80:/,          // IPv6 link-local
  ];

  // Protocolos permitidos
  private readonly ALLOWED_PROTOCOLS = ['http:', 'https:'];

  // Dominios permitidos (whitelist)
  private readonly ALLOWED_DOMAINS = [
    'amazon.com',
    'amazon.co.uk',
    'amazon.de',
    'amazon.fr',
    'amazon.es',
    'amazon.it',
    'amazon.ca',
    'amazon.com.mx',
    'ebay.com',
    'ebay.co.uk',
    'ebay.de',
    'ebay.fr',
    'ebay.es',
    'ebay.it',
    'ebay.ca',
    'aliexpress.com',
    'shein.com',
    'walmart.com',
    'bestbuy.com',
    'target.com',
  ];

  /**
   * Valida y sanitiza una URL para prevenir SSRF
   */
  validateUrl(url: string): { isValid: boolean; sanitizedUrl?: string; error?: string } {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'URL inválida' };
    }

    // Limitar longitud
    if (url.length > 2048) {
      return { isValid: false, error: 'URL demasiado larga' };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { isValid: false, error: 'URL mal formada' };
    }

    // Validar protocolo
    if (!this.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return { isValid: false, error: 'Protocolo no permitido. Solo HTTP y HTTPS están permitidos' };
    }

    // Validar hostname
    const hostname = parsedUrl.hostname.toLowerCase();

    // Bloquear IPs privadas y locales
    if (this.BLOCKED_IPS.includes(hostname)) {
      return { isValid: false, error: 'Acceso a localhost no permitido' };
    }

    // Bloquear rangos de IPs privadas
    for (const range of this.PRIVATE_IP_RANGES) {
      if (range.test(hostname)) {
        return { isValid: false, error: 'Acceso a IPs privadas no permitido' };
      }
    }

    // Validar que sea una IP válida (si es IP, debe ser pública)
    if (this.isIPAddress(hostname)) {
      if (this.isPrivateIP(hostname)) {
        return { isValid: false, error: 'Acceso a IPs privadas no permitido' };
      }
    }

    // Validar dominio (whitelist)
    const isAllowedDomain = this.ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isAllowedDomain) {
      return { isValid: false, error: 'Dominio no permitido. Solo tiendas autorizadas están permitidas' };
    }

    // Eliminar fragmentos y credenciales
    parsedUrl.hash = '';
    parsedUrl.username = '';
    parsedUrl.password = '';

    return { isValid: true, sanitizedUrl: parsedUrl.toString() };
  }

  /**
   * Verifica si un string es una dirección IP
   */
  private isIPAddress(hostname: string): boolean {
    // IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(hostname)) {
      return true;
    }

    // IPv6 (simplificado)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv6Regex.test(hostname);
  }

  /**
   * Verifica si una IP es privada
   */
  private isPrivateIP(ip: string): boolean {
    // Verificar IPs bloqueadas
    if (this.BLOCKED_IPS.includes(ip)) {
      return true;
    }

    // Verificar rangos privados
    for (const range of this.PRIVATE_IP_RANGES) {
      if (range.test(ip)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sanitiza una URL eliminando parámetros peligrosos
   */
  sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      
      // Eliminar parámetros peligrosos
      const dangerousParams = ['redirect', 'return', 'callback', 'next', 'url', 'link'];
      dangerousParams.forEach(param => {
        parsed.searchParams.delete(param);
      });

      // Eliminar credenciales
      parsed.username = '';
      parsed.password = '';
      parsed.hash = '';

      return parsed.toString();
    } catch {
      return url; // Si falla, retornar original (será rechazado por validateUrl)
    }
  }
}

