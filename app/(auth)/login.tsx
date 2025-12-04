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
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonStyles } from '@/constants/Styles';
import { useTranslation } from '@/i18n';
import InputField from '@/components/forms/InputField';
import { getResponsiveValues } from '@/helpers/responsive';
import TextButton from '@/components/buttons/TextButton';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/hooks/useAppColors';

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { t, language, setLanguage } = useTranslation();
  const AppColors = useAppColors();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = React.useRef<TextInput>(null);

  // measurements
  const responsive = getResponsiveValues(width, height);
  const horizontalPadding = responsive.padding.horizontal;
  const topIllustrationHeight = responsive.heights.illustration || 120;
  const titleFontSize = responsive.fontSizes.title;
  const inputHeight = responsive.heights.input;
  const btnHeight = responsive.heights.button;
  const btnRadius = responsive.borderRadius.button;

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
        {/* Language Selector Button - Top Right */}
        <View style={styles.languageButtonContainer}>
          <TouchableOpacity
            onPress={() => setShowLanguageModal(true)}
            style={styles.languageButtonTop}
          >
            <Ionicons name="globe-outline" size={24} color={AppColors.text} />
          </TouchableOpacity>
        </View>

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
              <TextButton
                title={t('auth.login.forgotPassword')}
                onPress={() => router.push('/recover-password')}
                textStyle={styles.forgotText}
              />
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
              <TextButton
                title={t('auth.login.registerNow')}
                onPress={() => router.push('/register')}
                textStyle={styles.registerLink}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowLanguageModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('profile.selectLanguage')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={AppColors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalOptions}>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  language === 'es' && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setLanguage('es');
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  language === 'es' && styles.modalOptionTextSelected,
                ]}>
                  {t('profile.spanish')}
                </Text>
                {language === 'es' && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  language === 'en' && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setLanguage('en');
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  language === 'en' && styles.modalOptionTextSelected,
                ]}>
                  {t('profile.english')}
                </Text>
                {language === 'en' && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  forgotText: { fontSize: 13 },

  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  already: { color: AppColors.text, fontSize: 13, fontWeight: '500' },
  registerLink: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
  languageButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 100,
  },
  languageButtonTop: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: AppColors.backgroundPrimary,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
  },
  modalTitle: {
    color: AppColors.text,
    fontWeight: '700',
    fontSize: 18,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOptions: {
    padding: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: AppColors.backgroundTertiary,
  },
  modalOptionSelected: {
    backgroundColor: AppColors.primaryLight,
  },
  modalOptionText: {
    color: AppColors.text,
    fontWeight: '500',
    fontSize: 16,
  },
  modalOptionTextSelected: {
    color: AppColors.primary,
    fontWeight: '600',
  },
});