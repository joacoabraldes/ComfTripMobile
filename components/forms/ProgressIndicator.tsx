import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppColors } from '@/constants/Colors';
import { useTranslation } from '@/i18n';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

export default function ProgressIndicator({ currentStep, totalSteps, stepLabels }: ProgressIndicatorProps) {
  const { t } = useTranslation();
  
  const defaultLabels = stepLabels || [
    t('auth.register.step1') || 'Información',
    t('auth.register.step2') || 'Preferencias',
  ];

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber <= currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <View key={stepNumber} style={styles.stepContainer}>
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isCurrent && styles.stepCircleCurrent,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    isActive && styles.stepNumberActive,
                  ]}
                >
                  {stepNumber}
                </Text>
              </View>
              {index < totalSteps - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    stepNumber < currentStep && styles.stepLineActive,
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.labelsContainer}>
        {defaultLabels.map((label, index) => (
          <Text
            key={index}
            style={[
              styles.stepLabel,
              index + 1 === currentStep && styles.stepLabelActive,
              index + 1 < currentStep && styles.stepLabelCompleted,
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.backgroundTertiary,
    borderWidth: 2,
    borderColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  stepCircleCurrent: {
    borderWidth: 3,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  stepNumberActive: {
    color: AppColors.white,
  },
  stepLine: {
    width: 100,
    height: 2,
    backgroundColor: AppColors.border,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: AppColors.primary,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  stepLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: AppColors.primary,
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: AppColors.text,
  },
});

