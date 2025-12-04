/**
 * ReviewForm component - Allows users to add/edit reviews for completed trips
 */
import { apiGet, apiPost, apiPut } from '@/helpers/api';
import { useTranslation } from '@/i18n';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

      if (existingReview) {
        await apiPut(`/trips/${tripId}/review`, reviewData);
      } else {
        await apiPost(`/trips/${tripId}/review`, reviewData);
      }

      Alert.alert(
        t('common.success'),
        existingReview ? t('review.updateSuccess') : t('review.saveSuccess')
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
        <ActivityIndicator size="small" color="#FF3951" />
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
                color={star <= rating ? '#FFD700' : '#CCC'}
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
          placeholderTextColor="#999"
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
          placeholderTextColor="#999"
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
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.saveButtonText}>
            {existingReview ? t('review.updateButton') : t('review.saveButton')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  loadingText: {
    marginTop: 8,
    color: '#777',
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 20,
  },
  ratingContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    color: '#333',
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
    color: '#757575',
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#111',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#FF3951',
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
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

