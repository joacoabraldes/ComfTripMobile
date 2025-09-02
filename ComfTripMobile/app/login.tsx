// HomeScreen.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ImageBackground,
} from 'react-native';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const maxContentWidth = Math.min(width * 0.95, 420);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Background - full screen and behind everything */}
      <ImageBackground
        source={{ uri: 'https://placehold.co/412x892' }}
        style={styles.backgroundCard}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* you can also use a solid color if you prefer:
            <View style={[styles.backgroundCard, {backgroundColor: '#E1D2AB'}]} />
        */}
      </ImageBackground>

      <KeyboardAvoidingView
        style={styles.kv}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { width: maxContentWidth }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Decorative circle & profile image */}
          <View style={styles.imageWrap}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.profileImage}
              resizeMode="cover"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Iniciar Sesion</Text>

          {/* Inputs + button */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nombre de Usuario o Mail"
              placeholderTextColor="#B3B3B3"
              returnKeyType="next"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#B3B3B3"
              secureTextEntry
              returnKeyType="done"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity style={styles.forgotWrap}>
              <Text style={styles.forgotText}>¿Olvido su contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={() => console.log('Ingresar')}>
              <Text style={styles.primaryButtonText}>Ingresar</Text>
            </TouchableOpacity>
          </View>

          {/* Footer: register */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>¿No estas registrado?</Text>
            <TouchableOpacity>
              <Text style={styles.registerLink}>Registrarse</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },

  /* Background that fills the whole screen and sits behind the rest of the UI.
     It is intentionally absolute so it doesn't affect layout of the responsive content.
  */
  backgroundCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // keep the original look: background color, shadow, border-like outline
    backgroundColor: '#E1D2AB',
    // shadow (iOS) and elevation (Android)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    overflow: 'hidden',
  },
  backgroundImage: {
    // if you want rounded corners on the image itself (not recommended full-screen),
    // add borderRadius here. For full-screen it is usually 0.
    borderRadius: 0,
  },

  kv: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 24,
    // ensure content sits visually above the background
    zIndex: 1,
  },

  // small decorative top row inside content area
  topDecorative: {
    width: '100%',
    paddingHorizontal: 16,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  timeText: {
    color: '#1D1B20',
    fontSize: 14,
    fontWeight: '500',
  },
  topIconsPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconPlaceholder: {
    width: 18,
    height: 18,
    backgroundColor: 'transparent',
  },
  iconFaint: {
    width: 18,
    height: 14,
    backgroundColor: '#1D1B20',
    opacity: 0.1,
    borderRadius: 2,
  },

  imageWrap: {
    width: '62%',
    aspectRatio: 1,
    borderRadius: 9999,
    overflow: 'hidden',
    marginTop: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },

  title: {
    marginTop: 80,
    fontSize: 28,
    lineHeight: 36,
    color: '#000',
    fontWeight: '400',
    alignSelf: 'flex-start',
    paddingLeft: 20,
  },

  form: {
    width: '100%',
    marginTop: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  input: {
    width: '92%',
    minHeight: 56,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D9D9D9',
    paddingHorizontal: 12,
    marginVertical: 8,
    fontSize: 16,
    color: '#000',
  },

  forgotWrap: {
    width: '92%',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  forgotText: {
    color: '#000',
    textDecorationLine: 'underline',
    fontSize: 14,
  },

  primaryButton: {
    width: '92%',
    height: 54,
    borderRadius: 8,
    backgroundColor: '#94835A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#F5F5F5',
    fontSize: 18,
    fontWeight: '500',
  },

  footerRow: {
    width: '92%',
    marginTop: 18,
    marginBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: '#000',
    fontSize: 16,
  },
  registerLink: {
    color: '#0967B2',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
