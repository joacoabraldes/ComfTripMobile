import { useState, useEffect } from 'react';
import { apiGet } from '@/helpers/api';
import { TripReview, Trip } from '@/types';
import { isTripCompleted } from '@/helpers/tripUtils';

interface UseTripReviewOptions {
  tripId: number;
  trip: Trip | null;
}

/**
 * Custom hook to manage trip review fetching and state
 */
export function useTripReview({ tripId, trip }: UseTripReviewOptions) {
  const [review, setReview] = useState<TripReview | null>(trip?.review || null);
  const [loadingReview, setLoadingReview] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    // If trip already has review, use it (from GET /trips/:id response)
    if (trip?.review) {
      setReview(trip.review);
      return;
    }

    // Load review for completed trips if not in trip object
    if (trip && isTripCompleted(trip) && Number.isFinite(tripId) && tripId > 0) {
      (async () => {
        setLoadingReview(true);
        try {
          const reviewRes = await apiGet(`/trips/${tripId}/review`);
          const reviewData = reviewRes?.data || reviewRes;
          if (mounted && reviewData && reviewData.id) {
            setReview(reviewData);
          } else if (mounted) {
            setReview(null);
          }
        } catch (err: any) {
          // Review doesn't exist yet, that's okay (404 or endpoint not found)
          const status = err?.status || (typeof err === 'string' && err.includes('Cannot GET') ? 404 : null);
          if (status !== 404 && status !== null && mounted) {
            // Only log non-404 errors
            console.error('Error loading review:', err?.message || err);
          }
          if (mounted) {
            setReview(null);
          }
        } finally {
          if (mounted) {
            setLoadingReview(false);
          }
        }
      })();
    } else if (mounted) {
      setReview(null);
    }

    return () => {
      mounted = false;
    };
  }, [tripId, trip]);

  const reloadReview = async () => {
    if (!trip || !isTripCompleted(trip) || !Number.isFinite(tripId) || tripId <= 0) {
      return;
    }

    setLoadingReview(true);
    try {
      const reviewRes = await apiGet(`/trips/${tripId}/review`);
      const reviewData = reviewRes?.data || reviewRes;
      if (reviewData && reviewData.id) {
        setReview(reviewData);
      } else {
        setReview(null);
      }
    } catch (err: any) {
      const status = err?.status || (typeof err === 'string' && err.includes('Cannot GET') ? 404 : null);
      if (status === 404 || status === null) {
        setReview(null);
      } else {
        console.error('Error reloading review:', err?.message || err);
      }
    } finally {
      setLoadingReview(false);
    }
  };

  return {
    review,
    loadingReview,
    reloadReview,
  };
}

