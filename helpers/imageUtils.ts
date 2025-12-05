/**
 * Helper function to safely parse images from various formats
 * Based on backend structure where images are stored in 'imagenes' column as JSON
 * Accepts:
 * - null/undefined
 * - array of strings
 * - array of objects [{ url }, { src }, etc.]
 * - JSON-stringified array or string (PostgreSQL returns JSON as string sometimes)
 * - comma-separated string
 * - object with .url or .urls
 */
export function safeParseImages(im: any): string[] {
  if (!im) return [];
  
  // If it's already an array, process it
  if (Array.isArray(im)) {
    return im
      .map((it) => {
        if (!it) return null;
        if (typeof it === 'string') return it.trim();
        if (typeof it === 'object' && it !== null) {
          // Try common image URL properties
          return it.url ?? it.src ?? it.image ?? it.uri ?? null;
        }
        return String(it).trim();
      })
      .filter(Boolean) as string[];
  }
  
  // If it's a string, try to parse as JSON first (PostgreSQL JSON columns)
  if (typeof im === 'string') {
    const trimmed = im.trim();
    if (!trimmed) return [];
    
    // Try JSON.parse first (PostgreSQL returns JSON as string)
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((it) => {
            if (typeof it === 'string') return it.trim();
            if (typeof it === 'object' && it !== null) {
              return it.url ?? it.src ?? it.image ?? it.uri ?? String(it).trim();
            }
            return String(it).trim();
          })
          .filter(Boolean);
      }
      // If parsed is a single object or string
      if (typeof parsed === 'object' && parsed !== null) {
        const url = parsed.url ?? parsed.src ?? parsed.image ?? parsed.uri;
        return url ? [String(url).trim()] : [];
      }
      return [String(parsed).trim()];
    } catch (e) {
      // Not valid JSON, try comma-separated
      if (trimmed.includes(',')) {
        return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      }
      // Single URL string
      return [trimmed];
    }
  }
  
  // If it's an object (not array), try to extract URLs
  if (typeof im === 'object' && im !== null) {
    if (Array.isArray((im as any).urls)) {
      return (im as any).urls.map((u: any) => String(u).trim()).filter(Boolean);
    }
    if ((im as any).url) return [String((im as any).url).trim()];
    if ((im as any).src) return [String((im as any).src).trim()];
    if ((im as any).image) return [String((im as any).image).trim()];
    if ((im as any).uri) return [String((im as any).uri).trim()];
  }
  
  return [];
}

/**
 * Get the first image from a place object
 * Based on backend structure: place.location.imagenes (from PostgreSQL JSON column)
 * Tries: loc.imagenes, loc.images, then p.images (like web version)
 */
export function getPlaceImage(place: any): string | null {
  if (!place) return null;
  
  const loc = place.location || {};
  
  // Backend returns images in 'imagenes' field (from PostgreSQL JSON column)
  // It can be: string (JSON), array, or null
  let images: string[] = [];
  
  if (loc.imagenes !== undefined && loc.imagenes !== null) {
    images = safeParseImages(loc.imagenes);
  } else if (loc.images !== undefined && loc.images !== null) {
    // Fallback to 'images' (normalized field from location.controller)
    images = safeParseImages(loc.images);
  } else if (place.images !== undefined && place.images !== null) {
    // Fallback to place.images (if directly on place object)
    images = safeParseImages(place.images);
  }
  
  // Return first valid image URL, or null
  const firstImg = images.length > 0 ? images[0] : null;
  return firstImg && typeof firstImg === 'string' && firstImg.trim().length > 0 ? firstImg.trim() : null;
}

