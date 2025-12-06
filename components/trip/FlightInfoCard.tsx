import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/i18n';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { apiGet, apiPut } from '@/helpers/api';
import { ShadowColors } from '@/constants/Colors';

interface FlightInfo {
  flight_id: string;
  fromIata?: string;
  fromName?: string;
  toIata?: string;
  toName?: string;
  departureTime?: string;
  arrivalTime?: string;
  flightCode?: string;
  statusLabel?: string;
  statusVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
  airlineName?: string;
  gate?: string;
}

interface FlightInfoCardProps {
  tripId: number;
  flightInfo?: FlightInfo | null;
  onRefresh?: () => Promise<void>;
  onEdit?: () => void;
  readOnly?: boolean;
}

export default function FlightInfoCard({
  tripId,
  flightInfo,
  onRefresh,
  onEdit,
  readOnly = false,
}: FlightInfoCardProps) {
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const styles = getStyles(AppColors);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (!flightInfo) return null;

  const {
    flightCode,
    fromIata,
    fromName,
    toIata,
    toName,
    departureTime,
    arrivalTime,
    statusLabel,
    statusVariant = 'muted',
    gate,
  } = flightInfo;

  // Get status styles using AppColors
  const getStatusStyle = (variant: string) => {
    const opacity = 0.16;
    const opacityMuted = 0.18;
    // Helper to convert hex to rgba
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    switch (variant) {
      case 'primary':
        return { bg: hexToRgba(AppColors.primary, opacity), color: AppColors.primary };
      case 'success':
        return { bg: hexToRgba(AppColors.success, opacity), color: AppColors.success };
      case 'warning':
        return { bg: 'rgba(255, 152, 0, 0.16)', color: '#FF9800' };
      case 'danger':
      case 'error':
        return { bg: hexToRgba(AppColors.error, opacity), color: AppColors.error };
      case 'info':
        return { bg: hexToRgba(AppColors.primary, opacity), color: AppColors.primary };
      default:
        return { bg: hexToRgba(AppColors.textSecondary, opacityMuted), color: AppColors.textSecondary };
    }
  };

  const statusStyle = getStatusStyle(statusVariant);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (err) {
      console.error('Error refreshing flight:', err);
      Alert.alert(t('common.error'), t('tripDetails.refreshError') || 'Error al actualizar el vuelo');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemove = () => {
    if (readOnly || removing) return;
    Alert.alert(
      t('tripDetails.removeFlightTitle') || 'Eliminar vuelo',
      t('tripDetails.removeFlightConfirm') || '¿Estás seguro que quieres eliminar este vuelo?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await apiPut(`/flights/${flightInfo.flight_id}`, {
                trip_id: null,
              });
              Alert.alert(t('common.success'), t('tripDetails.flightDisassociated') || 'Vuelo eliminado');
              if (onRefresh) await onRefresh();
            } catch (err: any) {
              console.error('Error removing flight:', err);
              Alert.alert(t('common.error'), err?.message || t('tripDetails.disassociateFlightError'));
            } finally {
              setRemoving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header: Flight title + code + status */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.flightLabel}>{t('tripDetails.flight')}</Text>
          {flightCode && <Text style={styles.flightCode}>{flightCode}</Text>}
        </View>
        {statusLabel && (
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusLabel}</Text>
          </View>
        )}
      </View>

      {/* Main row: Origin -> Destination */}
      <View style={styles.routeRow}>
        {/* Origin */}
        <View style={styles.airportSection}>
          <Text style={styles.airportLabel}>{t('addTrip.origin') || 'ORIGEN'}</Text>
          <View style={styles.airportInfo}>
            <Text style={styles.airportCode}>{fromIata || '—'}</Text>
            {fromName ? (
              <Text style={styles.airportName} numberOfLines={2}>
                {fromName}
              </Text>
            ) : null}
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{departureTime || 'Hora —'}</Text>
            {gate && (
              <Text style={styles.gateText}>
                {t('addTrip.gate') || 'Gate'} {gate}
              </Text>
            )}
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <View style={styles.arrowLine} />
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-forward" size={20} color={AppColors.textSecondary} />
          </View>
        </View>

        {/* Destination */}
        <View style={[styles.airportSection, styles.airportSectionRight]}>
          <Text style={styles.airportLabel}>{t('addTrip.destination') || 'DESTINO'}</Text>
          <View style={[styles.airportInfo, { alignItems: 'flex-end' }]}>
            <Text style={styles.airportCode}>{toIata || '—'}</Text>
            {toName ? (
              <Text style={[styles.airportName, { textAlign: 'right' }]} numberOfLines={2}>
                {toName}
              </Text>
            ) : null}
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{arrivalTime || 'Hora —'}</Text>
          </View>
        </View>
      </View>

      {/* Actions: Refresh + Remove/Edit */}
      {!readOnly && (onRefresh || onEdit) && (
        <View style={styles.actions}>
          {onRefresh && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={AppColors.textSecondary} />
              ) : (
                <Ionicons name="refresh" size={20} color={AppColors.textSecondary} />
              )}
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={onEdit}
            >
              <MaterialIcons name="edit" size={18} color={AppColors.error} />
              <Text style={styles.removeButtonText}>{t('common.edit')}</Text>
            </TouchableOpacity>
          )}
          {!onEdit && (
            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={handleRemove}
              disabled={removing}
            >
              {removing ? (
                <ActivityIndicator size="small" color={AppColors.error} />
              ) : (
                <>
                  <MaterialIcons name="delete-outline" size={18} color={AppColors.error} />
                  <Text style={styles.removeButtonText}>{t('tripDetails.removeFlight') || 'Eliminar vuelo'}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  container: {
    backgroundColor: AppColors.backgroundPrimary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    width: '100%',
    alignSelf: 'stretch',
    shadowColor: ShadowColors.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flightLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: AppColors.textSecondary,
  },
  flightCode: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  airportSection: {
    flex: 1,
    minWidth: 0,
  },
  airportSectionRight: {
    alignItems: 'flex-end',
  },
  airportLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: AppColors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  airportInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 3,
    marginBottom: 6,
  },
  airportCode: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.text,
    lineHeight: 28,
  },
  airportName: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.text,
  },
  gateText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  arrowContainer: {
    flexShrink: 0,
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    paddingTop: 15,
  },
  arrowLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: AppColors.borderLight,
    borderRadius: 1,
  },
  arrowCircle: {
    backgroundColor: AppColors.backgroundPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  removeButton: {
    borderColor: AppColors.error + '50',
    paddingHorizontal: 8,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.error,
  },
});

