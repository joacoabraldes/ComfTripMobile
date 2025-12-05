/**
 * Trip-related utility functions
 */

import { Trip, TripStatus } from '@/types';
import { parseDateSafe } from './dateUtils';
import { safeParseImages } from './imageUtils';

/**
 * Determines the status of a trip based on start and end dates
 * Returns: 'upcoming' | 'current' | 'past'
 */
export function getTripStatus(startDate?: string | null, endDate?: string | null): TripStatus {
  if (!startDate || !endDate) return 'upcoming';
  
  try {
    const now = new Date();
    const start = parseDateSafe(startDate);
    const end = parseDateSafe(endDate);
    
    if (start > now) return 'upcoming';
    if (start <= now && end >= now) return 'current';
    return 'past';
  } catch {
    return 'upcoming';
  }
}

/**
 * Checks if a trip is completed (past)
 */
export function isTripCompleted(trip: Trip): boolean {
  return getTripStatus(trip.start_date, trip.end_date) === 'past';
}

/**
 * Checks if a trip is currently ongoing
 */
export function isTripCurrent(trip: Trip): boolean {
  return getTripStatus(trip.start_date, trip.end_date) === 'current';
}

/**
 * Checks if a trip is upcoming
 */
export function isTripUpcoming(trip: Trip): boolean {
  return getTripStatus(trip.start_date, trip.end_date) === 'upcoming';
}

/**
 * Gets the numeric status value for sorting (2 = upcoming, 1 = current, 0 = past)
 */
export function getTripStatusValue(startDate?: string | null, endDate?: string | null): number {
  const status = getTripStatus(startDate, endDate);
  switch (status) {
    case 'upcoming': return 2;
    case 'current': return 1;
    case 'past': return 0;
    default: return 0;
  }
}

/**
 * Sorts trips by status: upcoming > current > past
 */
export function sortTripsByStatus(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    const aStatus = getTripStatusValue(a.start_date, a.end_date);
    const bStatus = getTripStatusValue(b.start_date, b.end_date);
    return bStatus - aStatus;
  });
}

/**
 * Sort option type for trips
 */
export type SortOption = 'date' | 'name';
export type SortOrder = 'asc' | 'desc';

/**
 * Sorts trips by the specified option and order
 * Used in trips.tsx and trip-history.tsx
 */
export function sortTripsByOption(trips: Trip[], sortOption: SortOption, sortOrder: SortOrder): Trip[] {
  const sorted = [...trips];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    if (sortOption === 'date') {
      const aDate = new Date(a.start_date || '').getTime();
      const bDate = new Date(b.start_date || '').getTime();
      comparison = aDate - bDate;
    } else if (sortOption === 'name') {
      const aName = (a.destination || '').toLowerCase();
      const bName = (b.destination || '').toLowerCase();
      comparison = aName.localeCompare(bName);
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

/**
 * Normalizes trip data from API response
 * Used in trip-details.tsx and trip-history-details.tsx
 */
export function normalizeTripData(
  data: any,
  tripId: number,
  params: { destination?: string; start_date?: string; end_date?: string; flag_url?: string },
  t: (key: string) => string
): Trip {
  return {
    id: data.id || tripId,
    user_id: data.user_id || 0,
    destination: data.destination || params.destination || t('tripSummary.destination'),
    start_date: data.start_date || params.start_date || '',
    end_date: data.end_date || params.end_date || '',
    flag_url: data.flag_url || params.flag_url || null,
    notes: data.notes || null,
    budget: data.budget || null,
    created_at: data.created_at || null,
    places: Array.isArray(data?.places) ? data.places : (Array.isArray(data?.data?.places) ? data.data.places : []),
  };
}

/**
 * Gets the first place image from a trip
 * Used for enriching trips with images in trips.tsx and trip-history.tsx
 */
export function getTripFirstPlaceImage(trip: Trip): string | null {
  const places = trip.places || [];
  if (places.length > 0 && places[0]?.location?.imagenes) {
    const images = safeParseImages(places[0].location.imagenes);
    if (images.length > 0 && typeof images[0] === 'string') {
      return images[0];
    }
  }
  return null;
}

