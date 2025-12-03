import PrimaryButton from '@/components/buttons/PrimaryButton';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonStyles } from '@/constants/Styles';
import { useTranslation } from '@/i18n';
import { AppColors } from '@/constants/Colors';
import InputField from '@/components/forms/InputField';

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

  // Validate form
  const isFormValid = identifier.trim().length > 0 && password.trim().length > 0;

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
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { fontSize: titleFontSize }]}>{t('auth.login.title')}</Text>
            </View>

            <InputField
              placeholder={t('auth.login.email')}
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={{ height: inputHeight, marginTop: 16 }}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <InputField
              ref={passwordRef}
              placeholder={t('auth.login.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              containerStyle={{ height: inputHeight, marginTop: 16 }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleNext}
            />

            <View style={styles.forgotWrap}>
              <Text style={styles.forgotText} onPress={() => router.push('/recover-password')}>
                {t('auth.login.forgotPassword')}
              </Text>
            </View>

            <PrimaryButton
              title={t('auth.login.loginButton')}
              onPress={handleNext}
              height={btnHeight}
              borderRadius={btnRadius}
              style={{ marginTop: 24 }}
              disabled={!isFormValid || loading}
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
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 24,
    minHeight: 40,
  },
  title: { 
    color: AppColors.text, 
    fontSize: 24, 
    fontWeight: '800', 
    textAlign: 'center',
    textAlignVertical: 'center',
  },

  form: { paddingBottom: 60 },

  forgotWrap: { alignSelf: 'flex-end', marginTop: 10 },
  forgotText: { color: AppColors.primary, fontSize: 13 },

  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  already: { color: AppColors.text, fontSize: 13, fontWeight: '500' },
  registerLink: { color: AppColors.primary, fontSize: 13, fontWeight: '700', marginLeft: 6 },
});