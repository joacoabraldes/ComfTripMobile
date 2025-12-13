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
import { useCommonStyles } from '@/constants/Styles';
import { useTranslation } from '@/i18n';
import InputField from '@/components/forms/InputField';
import { useAppColors } from '@/hooks/useAppColors';
import { getResponsiveValues } from '@/helpers/responsive';
import TextButton from '@/components/buttons/TextButton';

export default function RecoverPasswordScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const CommonStyles = useCommonStyles();
  const styles = getStyles(AppColors);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

    const [errorCode, setErrorCode]=useState<string | null>(null)
    const [errorEmail, setErrorEmail]=useState<string | null>(null)
    const [errorPassword, setErrorPassword]=useState<string | null>(null)
    const [errorConfirmPassword, setErrorConfirmPassword]=useState<string | null>(null)
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  const codeRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // measurements
  const responsive = getResponsiveValues(width, height);
  const horizontalPadding = responsive.padding.horizontal;
  const topIllustrationHeight = responsive.heights.illustration || 120;
  const titleFontSize = responsive.fontSizes.title;
  const subtitleFontSize = responsive.fontSizes.subtitle;
  const inputHeight = responsive.heights.input;
  const btnHeight = responsive.heights.button;
  const btnRadius = responsive.borderRadius.button;

  // Validate email format function
  const validateEmail = (email: string) => {
    return EMAIL_REGEX.test(email);
  };

  // Validate email format
  const isEmailValid = useMemo(() => {
    if (!email.trim()) return false;
    return validateEmail(email);
  }, [email]);

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

  const handleSendCode = async () => {
    if (!email.trim()) {
        setErrorEmail("auth.recoverPassword.enterEmail")
      Alert.alert(t('auth.recoverPassword.attention'), t('auth.recoverPassword.enterEmail'));
      return;
    }

    if (!validateEmail(email)) {
        setErrorEmail("auth.recoverPassword.invalidEmail");
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
        setErrorCode('auth.recoverPassword.enterCode')
    }

      if (!email.trim()) {
          setErrorEmail("auth.recoverPassword.enterEmail")
      }else if (!validateEmail(email)) {
          setErrorEmail("auth.recoverPassword.invalidEmail");
      }

      if (!newPassword.trim().length) {
          setErrorPassword("auth.errors.passwordRequired")
      } else if (newPassword.trim().length < 6) {
          setErrorPassword('auth.recoverPassword.passwordTooShort')
      } else {
          setErrorPassword(null)
      }

    if(!confirmPassword.trim()){
        setErrorConfirmPassword("auth.errors.confirmPasswordRequired")
    }else if (newPassword !== confirmPassword) {
        setErrorConfirmPassword('auth.recoverPassword.passwordsDoNotMatch')
    }

    if(!isFormValid){
        Alert.alert(t('auth.recoverPassword.attention'), t('auth.recoverPassword.completeAllFields') || 'Por favor completa todos los campos');
        return
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
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingHorizontal: horizontalPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.topArea]}>
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
              onChangeText={(text)=>{setEmail(text)
                if(!text.trim()) setErrorEmail('auth.recoverPassword.enterEmail')
                  else if(!validateEmail(text)) setErrorEmail("auth.recoverPassword.invalidEmail");
                  else setErrorEmail(null)
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={{ height: inputHeight, marginTop: 24 }}
              returnKeyType="next"
              onSubmitEditing={() => codeRef.current?.focus()}
              messageError={errorEmail ? t(errorEmail) : null}

            />

            {/* Code input with send/resend button */}
            <View style={[styles.codeInputContainer, { marginTop: 12, height: inputHeight }]}>
              <TextInput
                ref={codeRef}
                style={[styles.codeInput, { height: inputHeight }]}
                placeholder={t('auth.recoverPassword.codePlaceholder') || 'Código de verificación'}
                placeholderTextColor={AppColors.textMuted}
                value={code}
                onChangeText={(text)=>{
                    setCode(text)
                    if (!text.trim()) {
                        setErrorCode('auth.recoverPassword.enterCode')
                    }else{
                        setErrorCode(null)
                    }
                }}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="next"
                onSubmitEditing={() => newPasswordRef.current?.focus()}

              />
              <TouchableOpacity
                style={[styles.resendButton, (resendCooldown > 0) && styles.resendButtonDisabled]}
                onPress={handleSendCode}
                disabled={resendCooldown > 0 || sendingCode }
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
            </View>{errorCode && (
              <Text style={styles.errorText}>{t(errorCode)}</Text>
          )}

            <InputField
              ref={newPasswordRef}
              placeholder={t('auth.recoverPassword.newPassword') || 'Nueva contraseña'}
              value={newPassword}
              onChangeText={(text) => {
                  setNewPassword(text)
                  if(!text) setErrorPassword("auth.errors.passwordRequired")
                  else if(text.trim().length<6) setErrorPassword('auth.recoverPassword.passwordTooShort')
                  else setErrorPassword(null)}}
              secureTextEntry={!showNewPassword}
              showPasswordToggle
              showPassword={showNewPassword}
              onTogglePassword={() => setShowNewPassword(!showNewPassword)}
              containerStyle={{ height: inputHeight, marginTop: 12 }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              messageError={errorPassword ? t(errorPassword) : null}
            />

            <InputField
              ref={confirmPasswordRef}
              placeholder={t('auth.recoverPassword.confirmPassword') || 'Confirmar contraseña'}
              value={confirmPassword}
              onChangeText={(text)=>{setConfirmPassword(text)
                if(!text) setErrorConfirmPassword("auth.errors.confirmPasswordRequired")
                  else if(text!==newPassword) setErrorConfirmPassword('auth.recoverPassword.passwordsDoNotMatch')
                  else setErrorConfirmPassword(null)
              }}
              secureTextEntry={!showConfirmPassword}
              showPasswordToggle
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              containerStyle={{ height: inputHeight, marginTop: 12 }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleResetPassword}
              messageError={errorConfirmPassword ? t(errorConfirmPassword) : null}
            />

            <PrimaryButton
              title={loading ? '' : (t('auth.recoverPassword.confirmButton') || 'Confirmar')}
              onPress={handleResetPassword}
              height={btnHeight}
              borderRadius={btnRadius}
              style={{ marginTop: 24 }}
              disabled={loading}
            >
              {loading && <ActivityIndicator />}
            </PrimaryButton>

            <View style={styles.backRow}>
              <TextButton
                title={t('auth.recoverPassword.backToLogin')}
                onPress={() => router.back()}
                textStyle={styles.backText}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    justifyContent: 'space-between',
  },
  topArea: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 40,
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
    errorText: {
        color: AppColors.error,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
});

