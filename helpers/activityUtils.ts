/**
 * Activity-related utility functions
 */

import { Activity } from '@/types';
import { formatDate, formatTime } from './dateUtils';
import { safeParseImages } from './imageUtils';

/**
 * Normalizes a date string to a Date object
 * Handles ISO date strings and date-only strings
 */
export function normalizeDate(d: string): Date | null {
  if (!d) return null;
  const date = d.split('T')[0].split('-');
  const yy = Number(date[0]);
  const mm = Number(date[1]) - 1;
  const dd = Number(date[2]);
  return new Date(yy, mm, dd);
}

/**
 * Extracts the city name from a destination string
 * Example: "Madrid, Spain" -> "madrid"
 */
export function getTripCity(dest: string): string {
  if (!dest) return '';
  return dest.toString().split(',')[0].toLowerCase().trim();
}

/**
 * Maps places array to Activity array
 * Used in trip-details.tsx and trip-history-details.tsx
 */
export function mapPlacesToActivities(
  places: any[],
  t: (key: string, params?: any) => string,
  includePlaceObject: boolean = true
): Activity[] {
  const mapped: Activity[] = (places || []).map((p: any, idx: number) => {
    const loc = p.location || {};
    const title = loc.titulo ?? p.location?.titulo ?? t('addTrip.placeNumber', { number: p.fk_location ?? p.id ?? idx + 1 });

    // Build sortable timestamp from date + start_hour
    let ts = Number.NaN;
    if (p.date) {
      const base = (typeof p.date === 'string' && p.date.includes('T')) ? p.date : `${p.date}T00:00:00`;
      const start = p.start_hour ? `${base.split('T')[0]}T${p.start_hour}:00` : base;
      const d = new Date(start);
      ts = d.getTime();
    }

    const dateStr = `${formatDate(p.date)} ${formatTime(p.start_hour)}${p.end_hour ? ` - ${formatTime(p.end_hour)}` : ''}`.trim();

    // Get images if not including place object (for trip-history-details)
    let img: string | null = null;
    if (!includePlaceObject) {
      let images: string[] = [];
      if (loc.imagenes) {
        images = safeParseImages(loc.imagenes);
      } else if (loc.images) {
        images = safeParseImages(loc.images);
      } else if (p.images) {
        images = safeParseImages(p.images);
      }
      img = images.length > 0 ? images[0] : null;
    }

    return {
      key: String(p.id ?? idx),
      title,
      img: includePlaceObject ? null : img, // Image will be extracted in ActivityCard from place object if includePlaceObject is true
      dateStr,
      sortTs: isNaN(ts) ? undefined : ts,
      place: includePlaceObject ? p : undefined, // Store raw place object for image extraction
    };
  });

  // Sort by timestamp
  return mapped.slice().sort((a, b) => {
    const aa = a.sortTs ?? Number.MAX_SAFE_INTEGER;
    const bb = b.sortTs ?? Number.MAX_SAFE_INTEGER;
    return aa - bb;
  });
}

