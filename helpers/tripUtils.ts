/**
 * Trip-related utility functions
 */

import { Trip, TripStatus } from '@/types';
import { parseDateSafe } from './dateUtils';

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

