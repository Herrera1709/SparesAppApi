/**
 * Detección de URLs de Amazon y extracción de ASIN.
 * Cubre formatos comunes (.com, .es, .co.uk, short links amzn.to no resueltos aquí).
 */

const AMAZON_HOST_REGEX =
  /^(?:www\.)?amazon\.(com|es|co\.uk|de|fr|it|nl|se|pl|com\.be|com\.mx|com\.br|ca|in|jp|ae|sg|com\.au|com\.tr)(?::\d+)?$/i;

/** Prefijos de host que indican Amazon */
export function isAmazonHostname(host: string): boolean {
  const h = host.trim().toLowerCase();
  return AMAZON_HOST_REGEX.test(h);
}

/**
 * Indica si el texto parece una URL de producto/listado de Amazon (http(s) + host amazon).
 */
export function isAmazonProductUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return false;
  }
  try {
    const u = new URL(trimmed);
    return isAmazonHostname(u.hostname);
  } catch {
    return false;
  }
}

const ASIN_STRICT = /^[A-Z0-9]{10}$/i;

/**
 * Intenta extraer un ASIN válido (10 caracteres alfanuméricos) desde la ruta o query.
 */
export function extractAmazonAsinFromUrl(urlString: string): string | null {
  let url: URL;
  try {
    url = new URL(urlString.trim());
  } catch {
    return null;
  }

  if (!isAmazonHostname(url.hostname)) {
    return null;
  }

  const path = url.pathname || '';

  // /dp/ASIN, /gp/product/ASIN, /exec/obidos/ASIN, /o/ASIN, /product/ASIN
  const pathPatterns = [
    /\/dp\/([A-Z0-9]{10})(?:\/|$|[?#])/i,
    /\/gp\/product\/([A-Z0-9]{10})(?:\/|$|[?#])/i,
    /\/exec\/obidos\/(?:ASIN\/)?([A-Z0-9]{10})(?:\/|$|[?#])/i,
    /\/o\/([A-Z0-9]{10})(?:\/|$|[?#])/i,
    /\/product\/([A-Z0-9]{10})(?:\/|$|[?#])/i,
    /\/d\/([A-Z0-9]{10})(?:\/|$|[?#])/i,
  ];

  for (const re of pathPatterns) {
    const m = path.match(re);
    if (m?.[1] && ASIN_STRICT.test(m[1])) {
      return m[1].toUpperCase();
    }
  }

  // Slug largo .../nombre-ASIN/ o termina en /dp/ASIN
  const dpTail = path.match(/\/dp\/([A-Z0-9]{10})\b/i);
  if (dpTail?.[1] && ASIN_STRICT.test(dpTail[1])) {
    return dpTail[1].toUpperCase();
  }

  // Query: asin=, field-keywords= (menos fiable)
  const asinParam = url.searchParams.get('asin') || url.searchParams.get('ASIN');
  if (asinParam && ASIN_STRICT.test(asinParam.trim())) {
    return asinParam.trim().toUpperCase();
  }

  // Último segmento de path de 10 chars (ej. URLs raras)
  const segments = path.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i].split('?')[0];
    if (seg && ASIN_STRICT.test(seg)) {
      return seg.toUpperCase();
    }
  }

  return null;
}

/**
 * Normaliza URL canónica de detalle (para guardar); no sigue redirects.
 */
export function buildAmazonDetailUrl(asin: string, marketplaceHost = 'www.amazon.com'): string {
  const host = marketplaceHost.replace(/^https?:\/\//i, '').split('/')[0];
  return `https://${host}/dp/${asin}`;
}
