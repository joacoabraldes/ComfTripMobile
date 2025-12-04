/**
 * TripSummary component - Displays a summary of a completed trip
 */
import { Trip } from '@/types';
import { formatDateRange } from '@/helpers/dateUtils';
import { useTranslation } from '@/i18n';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShadowColors } from '@/constants/Colors';
import { useAppColors } from '@/hooks/useAppColors';

interface TripSummaryProps {
  trip: Trip;
}

export default function TripSummary({ trip }: TripSummaryProps) {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const activitiesCount = trip.places?.length || 0;
  const hasBudget = trip.budget != null && trip.budget > 0;
  const hasNotes = trip.notes != null && trip.notes.trim().length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('tripSummary.title')}</Text>
      
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t('tripSummary.destination')}</Text>
          <Text style={styles.summaryValue}>{trip.destination || '-'}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t('tripSummary.dates')}</Text>
          <Text style={styles.summaryValue}>{formatDateRange(trip.start_date, trip.end_date)}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{t('tripSummary.activities')}</Text>
          <Text style={styles.summaryValue}>
            {activitiesCount} {activitiesCount === 1 ? t('tripSummary.activity') : t('tripSummary.activitiesPlural')}
          </Text>
        </View>
        
        {hasBudget && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('tripSummary.budget')}</Text>
            <Text style={styles.summaryValue}>${trip.budget?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        )}
      </View>
      
      {hasNotes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>{t('tripSummary.notes')}</Text>
          <Text style={styles.notesText}>{trip.notes}</Text>
        </View>
      )}
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: AppColors.textTertiary,
    marginBottom: 4,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    color: AppColors.text,
    fontWeight: '700',
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  notesLabel: {
    fontSize: 13,
    color: AppColors.textTertiary,
    marginBottom: 8,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 15,
    color: AppColors.text,
    lineHeight: 22,
  },
});

