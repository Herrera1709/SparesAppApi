import { CatalogAvailabilityKind } from '@prisma/client';

/**
 * Mapea texto de disponibilidad de PA-API a enum interno (heurística).
 */
export function mapAmazonAvailabilityText(text: string | null | undefined): CatalogAvailabilityKind {
  if (!text || !text.trim()) {
    return CatalogAvailabilityKind.UNKNOWN;
  }
  const t = text.toLowerCase();
  if (t.includes('out of stock') || t.includes('no disponible') || t.includes('unavailable')) {
    return CatalogAvailabilityKind.OUT_OF_STOCK;
  }
  if (t.includes('only') && t.includes('left')) {
    return CatalogAvailabilityKind.LOW_STOCK;
  }
  if (t.includes('in stock') || t.includes('disponible')) {
    return CatalogAvailabilityKind.IN_STOCK;
  }
  return CatalogAvailabilityKind.UNKNOWN;
}
