import PrimaryButton from '@/components/buttons/PrimaryButton';
import { apiPost, tokenStorage } from '@/helpers/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useRef, useState, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import PhoneField from '@/components/forms/PhoneField';
import ProgressIndicator from '@/components/forms/ProgressIndicator';
import NationalityField from '@/components/forms/NationalityField';
import { getResponsiveValues } from '@/helpers/responsive';
import TextButton from '@/components/buttons/TextButton';

export default function RegisterScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCode, setPhoneCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [nationality, setNationality] = useState<string | null>(null);

  const [birthdate, setBirthdate] = useState('');
  const [birthdateDate, setBirthdateDate] = useState<Date | null>(null);
  const [birthdateDisplay, setBirthdateDisplay] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refs for input navigation
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // measurements
  const responsive = getResponsiveValues(width, height);
  const horizontalPadding = responsive.padding.horizontal;
  const titleFontSize = responsive.fontSizes.titleLarge;
  const subtitleFontSize = responsive.fontSizes.subtitle;
  const inputHeight = responsive.heights.input;
  const btnHeight = responsive.heights.button;
  const btnRadius = responsive.borderRadius.button;

  // Validate form
  const isFormValid = useMemo(() => {
    return (
      name.trim().length > 0 &&
      email.trim().length > 0 &&
      phoneNumber.trim().length > 0 &&
      birthdate.trim().length > 0 &&
      password.trim().length > 0 &&
      confirmPassword.trim().length > 0 &&
      password === confirmPassword &&
      accepted
    );
  }, [name, email, phoneNumber, birthdate, password, confirmPassword, accepted]);

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateForDisplay = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const onDateChange = (_event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) {
      setBirthdateDate(selected);
      setBirthdate(formatDate(selected));
      setBirthdateDisplay(formatDateForDisplay(selected));
    }
  };

  // Save form data to AsyncStorage before navigating
  const saveFormData = async () => {
    try {
      const formData = {
        name,
        email,
        phoneCode,
        phoneNumber,
        password,
        confirmPassword,
        nationality,
        birthdate,
        accepted,
      };
      await AsyncStorage.setItem('@register_form_data', JSON.stringify(formData));
    } catch (error) {
      console.warn('Error saving form data:', error);
    }
  };

  // Restore form data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadFormData = async () => {
        try {
          const savedData = await AsyncStorage.getItem('@register_form_data');
          if (savedData) {
            const formData = JSON.parse(savedData);
            setName(formData.name || '');
            setEmail(formData.email || '');
            setPhoneCode(formData.phoneCode || '+1');
            setPhoneNumber(formData.phoneNumber || '');
            setPassword(formData.password || '');
            setConfirmPassword(formData.confirmPassword || '');
            setNationality(formData.nationality || null);
            const savedBirthdate = formData.birthdate || '';
            setBirthdate(savedBirthdate);
            if (savedBirthdate) {
              try {
                const date = new Date(savedBirthdate);
                if (!isNaN(date.getTime())) {
                  setBirthdateDate(date);
                  setBirthdateDisplay(formatDateForDisplay(date));
                }
              } catch (e) {
                // Invalid date, leave empty
              }
            }
            setAccepted(formData.accepted || false);
          }
        } catch (error) {
          console.warn('Error loading form data:', error);
        }
      };
      loadFormData();
    }, [])
  );

  const handleNext = async () => {
    if (!isFormValid) {
      if (!name || !email || !phoneNumber || !birthdate || !password || !confirmPassword) {
        Alert.alert(t('auth.register.attention'), t('auth.register.completeFields'));
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert(t('auth.register.attention'), 'Las contraseñas no coinciden');
        return;
      }
      if (!accepted) {
        Alert.alert(t('auth.register.attention'), t('auth.register.acceptTerms'));
        return;
      }
    }

    // Save form data before navigating to interests (registration will happen in interests screen)
    await saveFormData();
    router.push('/interests');
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingHorizontal: horizontalPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { fontSize: titleFontSize }]}>{t('auth.register.title')}</Text>
            <Text style={[styles.subtitle, { fontSize: subtitleFontSize }]}>{t('auth.register.subtitle')}</Text>
          </View>

          {/* Progress Indicator */}
          <ProgressIndicator currentStep={1} totalSteps={2} />

          {/* Form */}
          <View style={styles.form}>
            <InputField
              ref={nameRef}
              placeholder={t('auth.register.namePlaceholder')}
              value={name}
              onChangeText={setName}
              containerStyle={{ height: inputHeight, marginTop: 16 }}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <InputField
              ref={emailRef}
              placeholder={t('auth.register.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={{ height: inputHeight, marginTop: 12 }}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <View style={{ marginTop: 12 }}>
              <PhoneField
                code={phoneCode}
                value={phoneNumber}
                onCodeChange={setPhoneCode}
                onNumberChange={setPhoneNumber}
                inputHeight={inputHeight}
                placeholder={t('auth.register.phoneNumber')}
              />
            </View>

            {/* Nationality dropdown */}
            <View style={{ marginTop: 12 }}>
              <NationalityField
                value={nationality}
                onValueChange={setNationality}
                inputHeight={inputHeight}
                placeholder={t('auth.register.selectNationality')}
              />
            </View>

            {/* Birthdate field: tap to open native picker */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowDatePicker(true)}
              style={[styles.dateInput, { height: inputHeight, marginTop: 12 }]}
            >
              <Text style={[styles.dateText, !birthdateDisplay && styles.datePlaceholder]}>
                {birthdateDisplay || t('auth.register.selectBirthdate') || 'Seleccionar fecha de nacimiento'}
              </Text>
            </TouchableOpacity>

            {/* DateTimePicker: rendered conditionally */}
            {showDatePicker && (
              <DateTimePicker
                value={birthdateDate ?? new Date()}
                mode="date"
                display={Platform.select({ ios: "spinner", android: "calendar" })}
                maximumDate={new Date()} // birthdate can't be in the future
                onChange={onDateChange}
              />
            )}

            <InputField
              ref={passwordRef}
              placeholder={t('auth.register.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              containerStyle={{ height: inputHeight, marginTop: 12 }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />

            <InputField
              ref={confirmPasswordRef}
              placeholder={t('auth.register.confirmPassword')}
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
            />

            <View style={[styles.termsRow, { marginTop: 12 }]}>
              <TouchableOpacity
                onPress={() => setAccepted(!accepted)}
                style={[styles.checkbox, { width: 22, height: 22, borderRadius: 5, marginRight: 14 }]}
                accessibilityRole="button"
              >
                {accepted && <View style={[styles.checkboxTick, { borderRadius: 4 }]} />}
              </TouchableOpacity>

              <Text style={[styles.termsText, { fontSize: 12, lineHeight: 18 }]}>
                <Text>{t('auth.register.termsText')}</Text>
                <Text style={[styles.link, { fontSize: 12 }]}>{t('auth.register.termsLink')}</Text>
                <Text>{t('auth.register.termsAnd')}</Text>
                <Text style={[styles.link, { fontSize: 12 }]}>{t('auth.register.privacyLink')}</Text>
                <Text>{t('auth.register.termsEnd')}</Text>
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <PrimaryButton
                title={loading ? '' : t('auth.register.nextButton')}
                onPress={handleNext}
                height={btnHeight}
                borderRadius={btnRadius}
                style={{ flex: 1, marginLeft: 'auto' }}
                disabled={!isFormValid || loading}
              >
                {loading && <ActivityIndicator />}
              </PrimaryButton>
            </View>

            <View style={styles.loginRow}>
              <Text style={styles.already}>{t('auth.register.alreadyMember')}</Text>
              <TextButton
                title={t('auth.register.loginLink')}
                onPress={() => router.push('/login')}
                textStyle={styles.loginLink}
              />
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
    paddingBottom: 60,
  },
  header: {
    marginTop: Platform.OS === 'ios' ? 40 : 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    color: AppColors.text,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  checkbox: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    marginTop: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxTick: {
    flex: 1,
    backgroundColor: AppColors.primary,
    borderRadius: 2,
    width: '100%',
    height: '100%',
  },
  termsText: {
    fontSize: 9,
    color: AppColors.text,
    flexWrap: 'wrap',
    flex: 1,
  },
  link: {
    color: AppColors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    alignItems: 'center',
  },
  already: {
    color: AppColors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  dateInput: {
    backgroundColor: AppColors.backgroundInputMuted,
    borderRadius: 10,
    paddingHorizontal: 22,
    justifyContent: 'center',
    borderWidth: 0,
  },
  dateText: {
    fontSize: 16,
    color: AppColors.text,
  },
  datePlaceholder: {
    color: AppColors.textMuted,
  },
});
