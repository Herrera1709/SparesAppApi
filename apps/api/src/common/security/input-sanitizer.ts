import { Transform } from 'class-transformer';

/**
 * Sanitiza strings eliminando caracteres peligrosos y normalizando
 */
export function SanitizeString() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    // Eliminar caracteres de control y caracteres peligrosos
    return value
      .replace(/[\x00-\x1F\x7F]/g, '') // Caracteres de control
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Scripts
      .replace(/javascript:/gi, '') // JavaScript protocol
      .replace(/on\w+\s*=/gi, '') // Event handlers
      .trim();
  });
}

/**
 * Sanitiza emails
 */
export function SanitizeEmail() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    // Solo permitir caracteres válidos para email
    return value.toLowerCase().trim().replace(/[^a-z0-9@._-]/gi, '');
  });
}

/**
 * Sanitiza URLs
 */
export function SanitizeUrl() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    // Validar que sea una URL válida y segura
    try {
      const url = new URL(value);
      // Solo permitir http y https
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Protocolo no permitido');
      }
      return url.toString();
    } catch {
      return value; // Dejar que la validación de DTO maneje el error
    }
  });
}

/**
 * Sanitiza números
 */
export function SanitizeNumber() {
  return Transform(({ value }) => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return value;
    
    // Solo números, puntos y signos negativos
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? value : num;
  });
}

