import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { useAppColors } from '@/hooks/useAppColors';
import { ShadowColors } from '@/constants/Colors';
import ReviewForm from './ReviewForm';
import { useTripReview } from '@/hooks/useTripReview';
import { Trip } from '@/types';

interface ReviewSectionProps {
  tripId: number;
  trip: Trip | null;
}

/**
 * Component that displays and manages trip review for completed trips
 */
export default function ReviewSection({ tripId, trip }: ReviewSectionProps) {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);

  const { review, reloadReview } = useTripReview({ tripId, trip });

  const handleReviewSaved = async () => {
    setShowReviewForm(false);
    await reloadReview();
  };

  if (!Number.isFinite(tripId) || tripId <= 0) {
    return null;
  }

  return (
    <>
      {!showReviewForm ? (
        <View style={styles.reviewSection}>
          <View style={styles.reviewSectionHeader}>
            <Text style={styles.sectionTitle}>{t('review.title')}</Text>
            <TouchableOpacity
              style={styles.editReviewButton}
              onPress={() => setShowReviewForm(true)}
            >
              <MaterialIcons
                name={review ? 'edit' : 'add-circle-outline'}
                size={20}
                color={AppColors.primary}
              />
              <Text style={styles.editReviewButtonText}>
                {review ? t('common.edit') : t('common.add')}
              </Text>
            </TouchableOpacity>
          </View>
          {review ? (
            <View style={styles.reviewDisplay}>
              <View style={styles.reviewRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialIcons
                    key={star}
                    name={star <= (review.rating || 0) ? 'star' : 'star-border'}
                    size={20}
                    color={star <= (review.rating || 0) ? '#FFD700' : AppColors.textDisabled}
                  />
                ))}
                <Text style={styles.reviewRatingText}>
                  {review.rating || 0}/5
                </Text>
              </View>
              {review.title && (
                <Text style={styles.reviewTitle}>{review.title}</Text>
              )}
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.noReviewText}>
              {t('review.noReview')}
            </Text>
          )}
        </View>
      ) : (
        <ReviewForm
          tripId={tripId}
          existingReview={review}
          onSaved={handleReviewSaved}
        />
      )}
    </>
  );
}

const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  reviewSection: {
    width: '100%',
    backgroundColor: AppColors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: ShadowColors.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.text,
  },
  editReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editReviewButtonText: {
    color: AppColors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  reviewDisplay: {
    marginTop: 8,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  reviewRatingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 15,
    color: AppColors.textSecondary,
    lineHeight: 22,
  },
  noReviewText: {
    fontSize: 14,
    color: AppColors.textMutedDark,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

