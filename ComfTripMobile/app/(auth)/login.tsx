import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MapSvg } from '@/components/icons/MapSvg';
import { ArrowIcon } from '@/components/icons/ArrowIcon';
import PrimaryButton from '@/components/buttons/PrimaryButton';
import { useRouter } from 'expo-router';
import { apiPost, tokenStorage } from '@/helpers/api';

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // measurements
  const horizontalPadding = Math.round(width * 0.06);
  const topIllustrationHeight = Math.round(Math.max(120, Math.min(220, height * 0.22)));
  const titleFontSize = Math.round(Math.max(20, Math.min(28, width * 0.07)));
  const inputHeight = Math.round(Math.max(44, Math.min(56, width * 0.12)));
  const btnHeight = Math.round(Math.max(44, Math.min(60, width * 0.14)));
  const btnRadius = Math.round(btnHeight * 0.22);

  const handleNext = async () => {
    if (!email || !password) {
      Alert.alert('Atención', 'Por favor complete los campos');
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost('/auth/login', { email, password });
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
      <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.topArea, { marginTop: 70 }]}>
          <View style={{ alignItems: 'center', height: topIllustrationHeight }}>
            <MapSvg width={Math.round(width * 0.52)} height={Math.round(topIllustrationHeight * 0.9)} />
          </View>
        </View>

        <View style={styles.form}>
          <Text style={[styles.title, { fontSize: titleFontSize, marginBottom: 24 }]}>Iniciar Sesión</Text>

          <View style={[styles.inputBox, { height: inputHeight }]}>
            <TextInput
              placeholder="Ingrese su email"
              placeholderTextColor="rgba(0,0,0,0.5)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.textInput}
            />
          </View>

          <View style={[styles.inputBox, { height: inputHeight, marginTop: 16 }]}>
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="rgba(0,0,0,0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.textInput}
            />
          </View>

          <View style={styles.forgotWrap}>
            <Text style={styles.forgotText}>¿Olvidó su contraseña?</Text>
          </View>

          <PrimaryButton
            title= 'Ingresar'
            onPress={handleNext}
            height={btnHeight}
            borderRadius={btnRadius}
            rightIcon={<ArrowIcon color="#FFFFFF" />}
            style={{ marginTop: 24 }}
          >
            {loading && <ActivityIndicator />}
          </PrimaryButton>

          <View style={styles.registerRow}>
            <Text style={styles.already}>New Member? </Text>
            <Text style={styles.registerLink} onPress={() => router.push('/register')}>
              Register now
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FCFCFC' },
  container: { flex: 1, paddingTop: Platform.OS === 'android' ? 8 : 0, justifyContent: 'space-between' },

  topArea: { alignItems: 'center' },
  title: { color: '#252525', fontSize: 24, fontWeight: '800', marginTop: 100 },

  form: { paddingBottom: 60 },

  inputBox: {
    width: '100%',
    backgroundColor: 'rgba(196,196,196,0.2)',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  textInput: { fontSize: 14, color: '#252525', padding: 0 },

  forgotWrap: { alignSelf: 'flex-end', marginTop: 10 },
  forgotText: { color: '#FF3951', fontSize: 13 },

  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  already: { color: '#252525', fontSize: 13, fontWeight: '500' },
  registerLink: { color: '#FF3951', fontSize: 13, fontWeight: '700', marginLeft: 6 },
});
