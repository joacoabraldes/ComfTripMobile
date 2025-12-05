/**
 * Location-related utility functions
 */

/**
 * Safely converts a value to a number, returning null if invalid
 */
export function toNumber(n: any): number | null {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

/**
 * Extracts coordinates from a place object
 * Handles various field name variations (latitude/latitud/lat, longitude/longitud/lng)
 */
export function extractCoords(p?: any): { lat: number; lng: number } | null {
  const loc = p?.location as any;
  if (!loc) return null;

  const lat = toNumber(loc.latitude ?? loc.latitud ?? loc.lat);
  const lng = toNumber(loc.longitude ?? loc.longitud ?? loc.lng);

  if (lat == null || lng == null) return null;
  return { lat, lng };
}

