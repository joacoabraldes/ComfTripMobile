/**
 * ReviewForm component - Allows users to add/edit reviews for completed trips
 */
import { apiGet, apiPost, apiPut } from '@/helpers/api';
import { useTranslation } from '@/i18n';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ShadowColors } from '@/constants/Colors';
import { useAppColors } from '@/hooks/useAppColors';

interface ReviewFormProps {
  tripId: number;
  existingReview?: {
    id: number;
    rating?: number | null;
    title?: string | null;
    comment?: string | null;
  } | null;
  onSaved?: () => void;
}

export default function ReviewForm({ tripId, existingReview, onSaved }: ReviewFormProps) {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [title, setTitle] = useState<string>(existingReview?.title || '');
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Load existing review if available
    if (!existingReview) {
      loadReview();
    } else {
      setRating(existingReview.rating || 0);
      setTitle(existingReview.title || '');
      setComment(existingReview.comment || '');
    }
  }, [tripId]);

  const loadReview = async () => {
    try {
      setLoading(true);
      const res = await apiGet(`/trips/${tripId}/review`);
      const data = res?.data || res;
      if (data && data.id) {
        setRating(data.rating || 0);
        setTitle(data.title || '');
        setComment(data.comment || '');
      }
    } catch (err: any) {
      // Review doesn't exist yet, that's okay
      if (err?.status !== 404) {
        console.error('Error loading review:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (rating === 0) {
      Alert.alert(t('common.error'), t('review.ratingRequired'));
      return;
    }

    if (title.trim().length === 0) {
      Alert.alert(t('common.error'), t('review.titleRequired'));
      return;
    }

    setSaving(true);
    try {
      const reviewData = {
        rating,
        title: title.trim(),
        comment: comment.trim() || null,
      };

      // Check if review exists by trying to get it first
      let reviewExists = false;
      if (existingReview?.id) {
        reviewExists = true;
      } else {
        try {
          await apiGet(`/trips/${tripId}/review`);
          reviewExists = true;
        } catch (err: any) {
          if (err?.status === 404) {
            reviewExists = false;
          } else {
            throw err;
          }
        }
      }

      if (reviewExists) {
        await apiPut(`/trips/${tripId}/review`, reviewData);
      } else {
        await apiPost(`/trips/${tripId}/review`, reviewData);
      }

      Alert.alert(
        t('common.success'),
        reviewExists ? t('review.updateSuccess') : t('review.saveSuccess')
      );
      onSaved?.();
    } catch (err: any) {
      console.error('Error saving review:', err);
      const message = err?.message || t('review.saveError');
      Alert.alert(t('common.error'), message);
    } finally {
      setSaving(false);
    }
  };

  const getRatingText = (ratingValue: number): string => {
    const ratingMap: Record<number, string> = {
      5: t('review.ratings.excellent'),
      4: t('review.ratings.veryGood'),
      3: t('review.ratings.good'),
      2: t('review.ratings.fair'),
      1: t('review.ratings.poor'),
    };
    return ratingMap[ratingValue] || '';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={AppColors.primary} />
        <Text style={styles.loadingText}>{t('review.loadingReview')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('review.title')}</Text>
      
      <View style={styles.ratingContainer}>
        <Text style={styles.label}>{t('review.rating')} *</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
              disabled={saving}
            >
              <MaterialIcons
                name={star <= rating ? 'star' : 'star-border'}
                size={32}
                color={star <= rating ? '#FFD700' : AppColors.textDisabled}
              />
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <Text style={styles.ratingText}>{getRatingText(rating)}</Text>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t('review.titleLabel')} *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t('review.placeholder.title')}
          placeholderTextColor={AppColors.textMutedDark}
          maxLength={100}
          editable={!saving}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t('review.commentLabel')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={comment}
          onChangeText={setComment}
          placeholder={t('review.placeholder.comment')}
          placeholderTextColor={AppColors.textMutedDark}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={1000}
          editable={!saving}
        />
        <Text style={styles.charCount}>{comment.length}/1000</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={AppColors.white} />
        ) : (
          <Text style={styles.saveButtonText}>
            {existingReview ? t('review.updateButton') : t('review.saveButton')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  container: {
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
  loadingText: {
    marginTop: 8,
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.text,
    marginBottom: 20,
  },
  ratingContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    color: AppColors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    color: AppColors.textTertiary,
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: AppColors.backgroundTertiary,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: AppColors.text,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: AppColors.textMutedDark,
    textAlign: 'right',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

