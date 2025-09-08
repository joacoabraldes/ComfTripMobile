import React from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  useWindowDimensions,
  Text,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapSvg from '@/components/icons/MapSvg';
import PrimaryButton from '@/components/buttons/PrimaryButton';
import { ArrowIcon } from '@/components/icons/ArrowIcon';

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = insets?.bottom ?? 0;
  const topInset = insets?.top ?? 0;
  const router = useRouter();

  // Estimated tab bar height (adjust if your tab bar is taller)
  const TABBAR_HEIGHT = 64;


  // measurements
  const horizontalPadding = Math.round(Math.max(16, Math.min(32, width * 0.06)));
  const contentMaxWidth = Math.round(width - horizontalPadding * 2);
  const baseSvgWidth = 321;
  const baseSvgHeight = 251;
  const svgAspect = baseSvgHeight / baseSvgWidth;
  const btnWidth = Math.round(Math.max(240, Math.min(320, width * 0.83)));
  const btnHeight = Math.round(Math.max(44, Math.min(64, width * 0.13)));
  const btnRadius = 8;
  const ctaBottomBase = 20 + bottomInset + TABBAR_HEIGHT;
  const ctaBottom = ctaBottomBase + 20;

  const contentTop = topInset + 24;
  const contentBottom = height - (ctaBottom + 40);
  const availableContentHeight = Math.max(260, contentBottom - contentTop);
  const maxSvgHeightFromWidth = Math.round(
    Math.min(
      baseSvgHeight,
      Math.min(321, Math.round(contentMaxWidth * 0.95)) * svgAspect
    )
  );
  const svgMaxHeight = Math.min(maxSvgHeightFromWidth, Math.round(availableContentHeight * 0.55));
  const svgMaxWidth = Math.round(svgMaxHeight / svgAspect);

  const copyFontSize = Math.round(Math.max(14, Math.min(20, width * 0.048)));
  const contentPaddingBottom = btnHeight + bottomInset + TABBAR_HEIGHT + 32;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View
          style={[
            styles.centerArea,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: contentPaddingBottom,
              minHeight: availableContentHeight + 40,
            },
          ]}
        >
          <View style={[styles.centeredContent, { height: availableContentHeight }]}>
            <View style={styles.svgWrapper}>
              <MapSvg width={svgMaxWidth} height={svgMaxHeight} />
            </View>

            <View style={styles.copyWrapper}>
              <Text
                style={[
                  styles.copyText,
                  {
                    fontSize: copyFontSize,
                    lineHeight: Math.round(copyFontSize * 1.15),
                  },
                ]}
              >
                No tienes ningún viaje activo actualmente{"\n"}
                ¡Planea tu siguiente viaje!
              </Text>
            </View>
          </View>
        </View>

        {/* PrimaryButton positioned above tab bar and raised by RAISE_UP */}
        <View style={[styles.buttonWrapper, { bottom: ctaBottom }]}>
          <PrimaryButton
            title="Nuevo Viaje"
            onPress={() => router.push('/add-trip')}
            height={btnHeight}
            borderRadius={btnRadius}
            rightIcon={<ArrowIcon color="#FFFFFF" />}
            style={{ width: btnWidth }}
            activeOpacity={0.95}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FCFCFC' },
  root: { flex: 1, backgroundColor: '#FCFCFC' },

  centerArea: {
    width: '100%',
    alignItems: 'center',
  },

  centeredContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  svgWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },

  copyWrapper: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  copyText: {
    textAlign: 'center',
    color: 'rgba(0,0,0,0.60)',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto', default: 'System' }),
    fontWeight: '500' as any,
    letterSpacing: 0.18,
  },

  buttonWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  ctaIconWrap: {
    position: 'absolute',
    right: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: 16,
    height: 16,
  },
  ctaIcon: {
    width: 9.33,
    height: 9.33,
    borderColor: '#F5F5F5',
  },
});
