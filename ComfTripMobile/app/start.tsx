import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LogoSvg } from '@/components/LogoSvg';
import { ArrowIcon } from '@/components/ArrowIcon';



export default function StartScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();

  // measurements
  const btnHeight = Math.round(Math.max(40, Math.min(56, width * 0.14)));
  const btnRadius = Math.round(btnHeight * 0.22);

  const illustrationWidth = Math.round(width * 0.52);
  const illustrationAspect = 201 / 153;
  const illustrationHeight = Math.round(illustrationWidth / illustrationAspect);

  const titleFontSize = Math.round(Math.max(28, Math.min(48, width * 0.11)));
  const labelFontSize = Math.round(Math.max(15, Math.min(20, width * 0.05)));

  const horizontalPadding = Math.round(width * 0.06);
  const verticalPadding = Math.round(Math.max(16, Math.min(48, height * 0.04)));
  const bottomSpacing = Math.round(Math.max(12, Math.min(40, height * 0.02)));

  const topAreaMargin = Math.round(height * 0.2);

  return (
    <SafeAreaView style={styles.safeArea}>
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
          <Text style={[styles.brand, { fontSize: titleFontSize, marginTop: Math.round(height * 0.02) }]}>ComfTrip</Text>
        </View>

        <View style={[styles.actionsWrap, { marginBottom: bottomSpacing }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.actionBtn,
              { backgroundColor: '#FF3951', height: btnHeight, borderRadius: btnRadius },
            ]}
            onPress={() => router.push('/login')}
            accessibilityRole="button"
            accessibilityLabel="Iniciar Sesion"
          >
            <View style={styles.btnRow}>
              <Text style={[styles.actionText, { fontSize: labelFontSize }]}>Iniciar Sesión</Text>
              <ArrowIcon color="#FFFFFF" style={{ marginLeft: 10 }} />
            </View>
          </TouchableOpacity>


          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.actionBtnOutline,
              {
                height: btnHeight,
                borderRadius: btnRadius,
                marginTop: Math.round(height * 0.012),
              },
            ]}
            onPress={() => router.push('/register')}
            accessibilityRole="button"
            accessibilityLabel="Registrarse"
          >
            <View style={styles.btnRow}>
              <Text style={[styles.actionTextOutline, { fontSize: labelFontSize }]}>Registrarse</Text>
              <ArrowIcon color="#FF3951" style={{ marginLeft: 10 }} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FCFCFC',
  },
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
    color: '#FF3951',
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
    color: '#FCFCFC',
    fontWeight: '600',
  },


  actionBtnOutline: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF3951',
    backgroundColor: 'transparent',
  },
  actionTextOutline: {
    color: '#FF3951',
    fontWeight: '600',
  },

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});