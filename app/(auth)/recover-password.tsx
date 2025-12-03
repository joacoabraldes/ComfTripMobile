import PrimaryButton from '@/components/buttons/PrimaryButton';
import { MapSvg } from '@/components/icons/MapSvg';
import { apiPost } from '@/helpers/api';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonStyles } from '@/constants/Styles';
import { useTranslation } from '@/i18n';
import { AppColors } from '@/constants/Colors';
import InputField from '@/components/forms/InputField';

export default function RecoverPasswordScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const codeRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // measurements
  const horizontalPadding = Math.round(width * 0.06);
  const topIllustrationHeight = Math.round(Math.max(120, Math.min(220, height * 0.22)));
  const titleFontSize = Math.round(Math.max(20, Math.min(28, width * 0.07)));
  const subtitleFontSize = Math.round(Math.max(14, Math.min(16, width * 0.04)));
  const inputHeight = Math.round(Math.max(44, Math.min(56, width * 0.12)));
  const btnHeight = Math.round(Math.max(44, Math.min(60, width * 0.14)));
  const btnRadius = Math.round(btnHeight * 0.22);

  // Validate form - all fields must be filled and passwords must match
  const isFormValid = useMemo(() => {
    return (
      email.trim().length > 0 &&
      code.trim().length > 0 &&
      newPassword.trim().length >= 6 &&
      confirmPassword.trim().length >= 6 &&
      newPassword === confirmPassword
    );
  }, [email, code, newPassword, confirmPassword]);

  // Timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert(t('auth.recoverPassword.attention'), t('auth.recoverPassword.enterEmail'));
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert(t('auth.recoverPassword.attention'), t('auth.recoverPassword.invalidEmail'));
      return;
    }

    if (resendCooldown > 0) return;

    setSendingCode(true);
    try {
      const res = await apiPost('/auth/forgot-password', { email: email.trim().toLowerCase() });
      const data = res.data ?? res;
      
      if (data?.message || data?.success || res.data !== undefined) {
        setResendCooldown(30); // 30 seconds cooldown
        // Focus on code input after sending
        setTimeout(() => codeRef.current?.focus(), 100);
      }
    } catch (err: any) {
      console.error('Send code error', err);
      const msg = (err && err.message) || (err && err.error) || JSON.stringify(err) || t('auth.recoverPassword.requestFailed');
      Alert.alert(t('auth.recoverPassword.error'), msg);
    } finally {
      setSendingCode(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim()) {
      Alert.alert(t('auth.recoverPassword.attention'), t('auth.recoverPassword.enterCode') || 'Por favor ingresa el código de verificación');
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert(t('auth.recoverPassword.attention'), t('auth.recoverPassword.completeAllFields') || 'Por favor completa todos los campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('auth.recoverPassword.attention'), t('auth.recoverPassword.passwordsDoNotMatch') || 'Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('auth.recoverPassword.attention'), t('auth.recoverPassword.passwordTooShort') || 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword: newPassword.trim(),
      });
      const data = res.data ?? res;
      
      if (data?.message || data?.success || res.data !== undefined) {
        Alert.alert(
          t('auth.recoverPassword.success') || 'Éxito',
          t('auth.recoverPassword.passwordResetSuccess') || 'Tu contraseña ha sido actualizada correctamente',
          [
            {
              text: t('auth.recoverPassword.backToLogin') || 'Volver al login',
              onPress: () => router.replace('/login'),
            },
          ]
        );
      }
    } catch (err: any) {
      console.error('Reset password error', err);
      const msg = (err && err.message) || (err && err.error) || JSON.stringify(err) || t('auth.recoverPassword.resetFailed') || 'Error al restablecer la contraseña';
      Alert.alert(t('auth.recoverPassword.error'), msg);
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
              <Text style={[styles.title, { fontSize: titleFontSize }]}>
                {t('auth.recoverPassword.title')}
              </Text>
              <Text style={[styles.subtitle, { fontSize: subtitleFontSize, marginTop: 12 }]}>
                {t('auth.recoverPassword.subtitle') || 'Ingresa tu email y te enviaremos un código de verificación'}
              </Text>
            </View>

            <InputField
              placeholder={t('auth.recoverPassword.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={{ height: inputHeight, marginTop: 24 }}
              returnKeyType="next"
              onSubmitEditing={() => codeRef.current?.focus()}
            />

            {/* Code input with send/resend button */}
            <View style={[styles.codeInputContainer, { marginTop: 12, height: inputHeight }]}>
              <TextInput
                ref={codeRef}
                style={[styles.codeInput, { height: inputHeight }]}
                placeholder={t('auth.recoverPassword.codePlaceholder') || 'Código de verificación'}
                placeholderTextColor={AppColors.textMuted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="next"
                onSubmitEditing={() => newPasswordRef.current?.focus()}
              />
              <TouchableOpacity
                style={[styles.resendButton, resendCooldown > 0 && styles.resendButtonDisabled]}
                onPress={handleSendCode}
                disabled={resendCooldown > 0 || sendingCode}
              >
                {sendingCode ? (
                  <ActivityIndicator size="small" color={AppColors.primary} />
                ) : (
                  <Text style={[styles.resendButtonText, resendCooldown > 0 && styles.resendButtonTextDisabled]}>
                    {resendCooldown > 0 
                      ? (t('auth.recoverPassword.resendIn') || 'Reenviar ({seconds}s)').replace('{seconds}', resendCooldown.toString())
                      : t('auth.recoverPassword.sendButton') || 'Enviar'
                    }
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <InputField
              ref={newPasswordRef}
              placeholder={t('auth.recoverPassword.newPassword') || 'Nueva contraseña'}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              showPasswordToggle
              showPassword={showNewPassword}
              onTogglePassword={() => setShowNewPassword(!showNewPassword)}
              containerStyle={{ height: inputHeight, marginTop: 12 }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />

            <InputField
              ref={confirmPasswordRef}
              placeholder={t('auth.recoverPassword.confirmPassword') || 'Confirmar contraseña'}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              showPasswordToggle
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              containerStyle={{ height: inputHeight, marginTop: 12 }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleResetPassword}
            />

            <PrimaryButton
              title={loading ? '' : (t('auth.recoverPassword.confirmButton') || 'Confirmar')}
              onPress={handleResetPassword}
              height={btnHeight}
              borderRadius={btnRadius}
              style={{ marginTop: 24 }}
              disabled={!isFormValid || loading}
            >
              {loading && <ActivityIndicator />}
            </PrimaryButton>

            <View style={styles.backRow}>
              <Text style={styles.backText} onPress={() => router.back()}>
                {t('auth.recoverPassword.backToLogin')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    justifyContent: 'space-between',
  },
  topArea: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 60 : 40,
  },
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
  subtitle: {
    color: AppColors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    paddingBottom: 60,
  },
  backRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  backText: {
    color: AppColors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  codeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.backgroundInputMuted,
    borderRadius: 10,
    paddingRight: 12,
    overflow: 'hidden',
  },
  codeInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.text,
    paddingHorizontal: 22,
    textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
  },
  resendButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: AppColors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: AppColors.textSecondary,
  },
});

