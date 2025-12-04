import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCommonStyles } from '@/constants/Styles';
import { useRouter } from 'expo-router';
import LogoSvg from '@/components/icons/LogoSvg';
import PrimaryButton from '@/components/buttons/PrimaryButton';
import { useTranslation } from '@/i18n';
import { getResponsiveValues, responsiveValue, responsiveSize } from '@/helpers/responsive';
import { useAppColors } from '@/hooks/useAppColors';

export default function StartScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const CommonStyles = useCommonStyles();
  const styles = getStyles(AppColors);

  // measurements
  const responsive = getResponsiveValues(width, height);
  const btnHeight = responsiveSize(width, 0.14, 40, 56);
  const btnRadius = Math.round(btnHeight * 0.22);

  const illustrationWidth = responsiveValue(width, 0.52);
  const illustrationAspect = 201 / 153;
  const illustrationHeight = Math.round(illustrationWidth / illustrationAspect);

  const titleFontSize = responsiveSize(width, 0.11, 28, 48);
  const labelFontSize = responsive.fontSizes.label;

  const horizontalPadding = responsive.padding.horizontal;
  const verticalPadding = responsive.spacing.vertical || 16;
  const bottomSpacing = responsive.spacing.bottom || 12;

  const topAreaMargin = responsiveValue(height, 0.2);

  return (
    <SafeAreaView style={CommonStyles.safeArea}>
      <View
        style={[
          styles.container,
          {
            paddingHorizontal: horizontalPadding,
            paddingVertical: verticalPadding,
            justifyContent: 'space-between',
          },
        ]}
      >
        <View style={[styles.topArea, { marginTop: topAreaMargin }]}>
          <LogoSvg width={illustrationWidth} height={illustrationHeight} />
          <Text style={[styles.brand, { fontSize: titleFontSize, marginTop: responsive.spacing.bottom || 12 }]}>ComfTrip</Text>
        </View>

        <View style={[styles.actionsWrap, { marginBottom: bottomSpacing }]}>
          <PrimaryButton
            title={t('auth.start.loginButton')}
            onPress={() => router.push('/login')}
            height={btnHeight}
            borderRadius={btnRadius}
            style={{ backgroundColor: AppColors.primary }}
            textStyle={{ fontSize: labelFontSize }}
          />

          <PrimaryButton
            title={t('auth.start.registerButton')}
            onPress={() => router.push('/register')}
            height={btnHeight}
            borderRadius={btnRadius}
            style={{
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: AppColors.primary,
              marginTop: responsiveSize(height, 0.012, 8, 12),
            }}
            textStyle={{ color: AppColors.primary, fontSize: labelFontSize }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },

  topArea: {
    alignItems: 'center',
  },

  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },

  brand: {
    color: AppColors.primary,
    fontWeight: '400',
    textAlign: 'center',
  },

  actionsWrap: {
    width: '100%',
  },

  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: AppColors.white,
    fontWeight: '600',
  },

  actionBtnOutline: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.primary,
    backgroundColor: 'transparent',
  },
  actionTextOutline: {
    color: AppColors.primary,
    fontWeight: '600',
  },

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
