import PrimaryButton from '@/components/buttons/PrimaryButton';
import { ArrowIcon } from '@/components/icons/ArrowIcon';
import { MapSvg } from '@/components/icons/MapSvg';
import { apiPost, tokenStorage } from '@/helpers/api';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();

  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = React.useRef<TextInput>(null);

  // measurements
  const horizontalPadding = Math.round(width * 0.06);
  const topIllustrationHeight = Math.round(Math.max(120, Math.min(220, height * 0.22)));
  const titleFontSize = Math.round(Math.max(20, Math.min(28, width * 0.07)));
  const inputHeight = Math.round(Math.max(44, Math.min(56, width * 0.12)));
  const btnHeight = Math.round(Math.max(44, Math.min(60, width * 0.14)));
  const btnRadius = Math.round(btnHeight * 0.22);

  const handleNext = async () => {
    if (!identifier || !password) {
      Alert.alert('Atención', 'Por favor complete los campos');
      return;
    }
    setLoading(true);
    try {
      // send identifier (can be username or email) per backend change
      const res = await apiPost('/auth/login', { identifier, password });
      const data = res.data ?? res;

      const token =
        data?.token || data?.accessToken || data?.jwt || data?.data?.token || null;

      if (token) {
        await tokenStorage.setToken(token);
      } else {
        console.warn('No token found in login response, storing full response for debugging', data);
      }

      router.replace('/home');
    } catch (err: any) {
      console.error('Login error', err);
      const msg = (err && err.message) || (err && err.error) || JSON.stringify(err) || 'Login failed';
      Alert.alert('Login failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingHorizontal: horizontalPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.topArea, { marginTop: 100 }]}>
            <View style={{ alignItems: 'center', height: topIllustrationHeight }}>
              <MapSvg width={Math.round(width * 2)} height={Math.round(topIllustrationHeight * 1.4)} />
            </View>
          </View>

          <View style={styles.form}>
            <Text style={[styles.title, { fontSize: titleFontSize, marginBottom: 24 }]}>Iniciar Sesión</Text>

            <View style={[styles.inputBox, { height: inputHeight, marginTop: 16 }]}>
              <TextInput
                placeholder="Email"
                placeholderTextColor="rgba(0,0,0,0.5)"
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={styles.textInput}
              />
            </View>

            <View style={[styles.inputBox, { height: inputHeight, marginTop: 16 }]}>
              <TextInput
                ref={passwordRef}
                placeholder="Contraseña"
                placeholderTextColor="rgba(0,0,0,0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleNext}
                style={[styles.textInput, { paddingRight: 60 }]}
              />
              <TouchableOpacity
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.forgotWrap}>
              <Text style={styles.forgotText}>¿Olvidó su contraseña?</Text>
            </View>

            <PrimaryButton
              title="Ingresar"
              onPress={handleNext}
              height={btnHeight}
              borderRadius={btnRadius}
              rightIcon={<ArrowIcon color="#FFFFFF" />}
              style={{ marginTop: 24 }}
            >
              {loading && <ActivityIndicator />}
            </PrimaryButton>

            <View style={styles.registerRow}>
              <Text style={styles.already}>¿No eres miembro? </Text>
              <Text style={styles.registerLink} onPress={() => router.push('/register')}>
                Regístrate ahora
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FCFCFC' },
  container: { flexGrow: 1, paddingTop: Platform.OS === 'android' ? 8 : 0, justifyContent: 'space-between' },
  topArea: { alignItems: 'center' },
  title: { color: '#252525', fontSize: 24, fontWeight: '800', marginTop: 100 },

  form: { paddingBottom: 60 },

  inputBox: {
    width: '100%',
    backgroundColor: 'rgba(196,196,196,0.2)',
    borderRadius: 10,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textInput: {
    fontSize: 16,
    lineHeight: 20,
    color: '#252525',
    paddingHorizontal: 22,
    paddingVertical: 0,
    height: '100%',
    textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
  },

  forgotWrap: { alignSelf: 'flex-end', marginTop: 10 },
  forgotText: { color: '#FF3951', fontSize: 13 },

  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  already: { color: '#252525', fontSize: 13, fontWeight: '500' },
  registerLink: { color: '#FF3951', fontSize: 13, fontWeight: '700', marginLeft: 6 },

  eyeButton: { position: 'absolute', right: 12, height: '100%', justifyContent: 'center' },
  eyeText: { color: '#FF3951', fontSize: 13, fontWeight: '700' },
});