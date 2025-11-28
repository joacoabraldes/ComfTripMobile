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
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonStyles } from '@/constants/Styles';
import { useTranslation } from '@/i18n';

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { t } = useTranslation();

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
      Alert.alert(t('auth.login.attention'), t('auth.login.completeFields'));
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
      const msg = (err && err.message) || (err && err.error) || JSON.stringify(err) || t('auth.login.loginFailed');
      Alert.alert(t('auth.login.loginFailed'), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea}>
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
            <Text style={[styles.title, { fontSize: titleFontSize, marginBottom: 24 }]}>{t('auth.login.title')}</Text>

            <View style={[styles.inputBox, { height: inputHeight, marginTop: 16 }]}>
              <TextInput
                placeholder={t('auth.login.email')}
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
                placeholder={t('auth.login.password')}
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
                accessibilityLabel={showPassword ? t('auth.login.hidePasswordLabel') : t('auth.login.showPasswordLabel')}
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeText}>{showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.forgotWrap}>
              <Text style={styles.forgotText}>{t('auth.login.forgotPassword')}</Text>
            </View>

            <PrimaryButton
              title={t('auth.login.loginButton')}
              onPress={handleNext}
              height={btnHeight}
              borderRadius={btnRadius}
              rightIcon={<ArrowIcon color="#FFFFFF" />}
              style={{ marginTop: 24 }}
            >
              {loading && <ActivityIndicator />}
            </PrimaryButton>

            <View style={styles.registerRow}>
              <Text style={styles.already}>{t('auth.login.notMember')}</Text>
              <Text style={styles.registerLink} onPress={() => router.push('/register')}>
                {t('auth.login.registerNow')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingTop: Platform.OS === 'android' ? 8 : 0, justifyContent: 'space-between' },
  topArea: { alignItems: 'center', marginTop: Platform.OS === 'ios' ? 60 : 40 },
  title: { color: '#252525', fontSize: 24, fontWeight: '800', marginTop: 40 },

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