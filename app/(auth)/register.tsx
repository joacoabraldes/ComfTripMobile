import PrimaryButton from '@/components/buttons/PrimaryButton';
import { MapSvg } from '@/components/icons/MapSvg';
import { apiPost, tokenStorage } from '@/helpers/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import countryRegionData from "country-region-data";
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [birthdate, setBirthdate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refs for input navigation
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // measurements
  const horizontalPadding = Math.round(width * 0.06);
  const titleFontSize = Math.round(Math.max(24, Math.min(32, width * 0.08)));
  const subtitleFontSize = Math.round(Math.max(14, Math.min(16, width * 0.04)));
  const inputHeight = Math.round(Math.max(44, Math.min(56, width * 0.12)));
  const btnHeight = Math.round(Math.max(44, Math.min(60, width * 0.14)));
  const btnRadius = Math.round(btnHeight * 0.22);

  // Validate form
  const isFormValid = useMemo(() => {
    return (
      name.trim().length > 0 &&
      email.trim().length > 0 &&
      phoneNumber.trim().length > 0 &&
      password.trim().length > 0 &&
      confirmPassword.trim().length > 0 &&
      password === confirmPassword &&
      accepted
    );
  }, [name, email, phoneNumber, password, confirmPassword, accepted]);

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const onDateChange = (_event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setBirthdate(formatDate(selected));
  };

  // Safe country names extraction with fallback
  const countryNames = useMemo(() => {
    try {
      if (!countryRegionData || !Array.isArray(countryRegionData)) {
        console.warn('countryRegionData not available, using fallback');
        return ['Argentina', 'Brasil', 'Chile', 'Colombia', 'México', 'Perú', 'España', 'Estados Unidos', 'Francia', 'Italia', 'Alemania', 'Reino Unido'];
      }
      return countryRegionData
        .map(countryArr => Array.isArray(countryArr) ? countryArr[0] : countryArr)
        .filter(Boolean)
        .sort();
    } catch (error) {
      console.error('Error processing country data:', error);
      return ['Argentina', 'Brasil', 'Chile', 'Colombia', 'México', 'Perú', 'España', 'Estados Unidos'];
    }
  }, []);

  const filteredCountries = countryNames.filter((c) =>
    typeof c === 'string' && c.toLowerCase().includes(search.toLowerCase())
  );

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
            setBirthdate(formData.birthdate || '');
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
      if (!name || !email || !phoneNumber || !password || !confirmPassword) {
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

    setLoading(true);
    try {
      const payload = {
        name,
        email,
        phone: `${phoneCode}${phoneNumber}`,
        password,
        password_hash: password,
        nationality: nationality || "",
        birthdate: birthdate || null,
      };

      const res = await apiPost('/auth/register', payload);
      const data = res.data ?? res;

      const token = data?.token || data?.accessToken || data?.jwt || data?.data?.token || null;

      if (token) await tokenStorage.setToken(token);
      else console.warn('No token found in register response, storing full response', data);

      // Save form data before navigating to interests
      await saveFormData();

      router.push('/interests');
    } catch (err: any) {
      console.error('Register error', err);
      const msg = (err && err.message) || (err && err.error) || JSON.stringify(err) || t('auth.register.registerFailed');
      Alert.alert(t('auth.register.registerFailed'), msg);
    } finally {
      setLoading(false);
    }
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
              onFocus={() => setOpen(false)}
              blurOnSubmit={false}
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
              onFocus={() => setOpen(false)}
              blurOnSubmit={false}
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
            <View style={[styles.inputBox, { marginTop: 12, flexDirection: "row", alignItems: "center", backgroundColor: open ? AppColors.backgroundPrimary : AppColors.backgroundInputMuted, borderWidth: open ? 2 : 0, borderColor: AppColors.primary, height: inputHeight }]}>
              <TextInput
                style={[styles.textInput, { flex: 1, borderWidth: 0, outline: "none", color: nationality ? AppColors.text : AppColors.textMuted }]}
                placeholder={nationality ? nationality : t('auth.register.selectNationality')}
                value={search}
                onChangeText={setSearch}
                onFocus={() => setOpen(true)}
                returnKeyType="done"
                onSubmitEditing={() => setOpen(false)}
                placeholderTextColor={AppColors.textMuted}
              />
              <TouchableOpacity
                style={{ padding: 12 }}
                onPress={() => setOpen(!open)}
              >
                <Text style={{ fontSize: 16, transform: [{ rotate: open ? "0deg" : "180deg" }], color: AppColors.textSecondary }}>
                  ▲
                </Text>
              </TouchableOpacity>
            </View>

            {open && (
              <View style={styles.dropdown}>
                <ScrollView
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  style={{ maxHeight: 200 }}
                >
                  {filteredCountries.map((item, index) => {
                    const isSelected = nationality === item;
                    return (
                      <TouchableOpacity
                        key={`${item}-${index}`}
                        style={[styles.item, isSelected && styles.itemSelected]}
                        onPress={() => {
                          setNationality(item);
                          setSearch("");
                          setOpen(false);
                        }}
                      >
                        <Text style={styles.itemText}>{item}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
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
              onFocus={() => setOpen(false)}
              blurOnSubmit={false}
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
              onSubmitEditing={() => setOpen(false)}
              onFocus={() => setOpen(false)}
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
              <Text style={styles.loginLink} onPress={() => router.push('/login')}>
                {t('auth.register.loginLink')}
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
  inputBox: {
    width: '100%',
    backgroundColor: AppColors.backgroundInputMuted,
    borderRadius: 10,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    color: AppColors.text,
    paddingHorizontal: 22,
    paddingVertical: 0,
    height: '100%',
    borderRadius: 10,
    textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
    minHeight: 24,
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
    color: AppColors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  dropdown: {
    left: 0,
    right: 0,
    backgroundColor: AppColors.backgroundPrimary,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.backgroundPrimary,
  },
  itemHover: {
    backgroundColor: AppColors.backgroundHover,
  },
  itemSelected: {
    backgroundColor: AppColors.primaryLight,
  },
  itemText: {
    fontSize: 16,
    color: AppColors.text,
  },
});
