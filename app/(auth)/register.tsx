import PrimaryButton from '@/components/buttons/PrimaryButton';
import { ArrowIcon } from '@/components/icons/ArrowIcon';
import { MapSvg } from '@/components/icons/MapSvg';
import { apiPost, tokenStorage } from '@/helpers/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import countryRegionData from "country-region-data";
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

export default function RegisterScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  // measurements
  const horizontalPadding = Math.round(width * 0.06);
  const topIllustrationHeight = Math.round(Math.max(120, Math.min(220, height * 0.22)));
  const titleFontSize = Math.round(Math.max(20, Math.min(28, width * 0.07)));
  const inputHeight = Math.round(Math.max(44, Math.min(56, width * 0.12)));
  const btnHeight = Math.round(Math.max(44, Math.min(60, width * 0.14)));
  const btnRadius = Math.round(btnHeight * 0.22);

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
  const countryNames = React.useMemo(() => {
    try {
      if (!countryRegionData || !Array.isArray(countryRegionData)) {
        console.warn('countryRegionData not available, using fallback');
        return ['Argentina', 'Brasil', 'Chile', 'Colombia', 'México', 'Perú', 'España', 'Estados Unidos', 'Francia', 'Italia', 'Alemania', 'Reino Unido'];
      }
      // countryRegionData is an array of [countryName, countryShortCode, regions]
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

  const handleNext = async () => {
    if (!name || !email || !password) {
      Alert.alert(t('auth.register.attention'), t('auth.register.completeFields'));
      return;
    }
    if (!accepted) {
      Alert.alert(t('auth.register.attention'), t('auth.register.acceptTerms'));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        email,
        password,
        password_hash: password,
        nationality: nationality|| "",
        birthdate: birthdate || null,
      };

      const res = await apiPost('/auth/register', payload);
      const data = res.data ?? res;

      const token = data?.token || data?.accessToken || data?.jwt || data?.data?.token || null;

      if (token) await tokenStorage.setToken(token);
      else console.warn('No token found in register response, storing full response', data);

      router.replace('/interests');
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
        keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingHorizontal: horizontalPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.topArea, { marginTop: 60 }]}>
            <View style={{ alignItems: 'center', height: topIllustrationHeight }}>
              <MapSvg width={Math.round(width * 2)} height={Math.round(topIllustrationHeight * 1.4)} />
            </View>
          </View>

          <View style={styles.form}>
            <Text style={[styles.title, { fontSize: titleFontSize, marginBottom: 18}]}>{t('auth.register.title')}</Text>

            <View style={[styles.inputBox, { height: inputHeight }]}>
              <TextInput
                ref={nameRef}
                placeholder={t('auth.register.name')}
                placeholderTextColor="rgba(0,0,0,0.5)"
                value={name}
                onChangeText={setName}
                style={styles.textInput}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                onFocus={() => setOpen(false)}
                blurOnSubmit={false}
              />
            </View>

            <View style={[styles.inputBox, { height: inputHeight, marginTop: 12 }]}>
              <TextInput
                ref={emailRef}
                placeholder={t('auth.register.email')}
                placeholderTextColor="rgba(0,0,0,0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setOpen(false)}
                blurOnSubmit={false}
              />
            </View>

            <View style={[styles.inputBox, { height: inputHeight, marginTop: 12 }]}>
              <TextInput
                ref={passwordRef}
                placeholder={t('auth.register.password')}
                placeholderTextColor="rgba(0,0,0,0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
                returnKeyType="next"
                onSubmitEditing={() => setOpen(true)}
                onFocus={() => setOpen(false)}
                blurOnSubmit={false}
              />
            </View>

            {/* Nationality dropdown */}
            <View style={[styles.inputBox, { marginTop: 12, flexDirection: "row", alignItems: "center", backgroundColor: open ? "white" : 'rgba(196,196,196,0.2)', borderWidth: open ? 2 : 0, borderColor: '#FF3951' }]}>
              <TextInput
                style={[styles.textInput, { flex: 1, borderWidth: 0, outline: "none", color: nationality ? "#252525" : "rgba(0,0,0,0.5)" }]}
                placeholder={nationality ? nationality : t('auth.register.selectNationality')}
                value={search}
                onChangeText={setSearch}
                onFocus={() => setOpen(true)}
                returnKeyType="done"
                onSubmitEditing={() => setOpen(false)}
              />
              <TouchableOpacity
                style={{ padding: 12 }}
                onPress={() => setOpen(!open)}
              >
                <Text style={{ fontSize: 16, transform: [{ rotate: open ? "0deg" : "180deg" }] }}>
                  ▲
                </Text>
              </TouchableOpacity>
            </View>

            {open && (
              <View style={styles.dropdown}>
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  renderItem={({ item }) => {
                    const isSelected = nationality === item;
                    return (
                      <TouchableOpacity
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
                  }}
                />
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowDatePicker(true)}
              style={[styles.inputBox, { height: inputHeight, marginTop: 12, justifyContent: 'center' }]}
            >
              <Text style={[styles.textInput, { color: birthdate ? "#252525" : "rgba(0,0,0,0.5)" }]}>
                {birthdate || t('auth.register.selectBirthdate')}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={birthdate ? new Date(birthdate) : new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={onDateChange}
              />
            )}

            <View style={[styles.termsRow, { minHeight: 40 }]}>
              <TouchableOpacity
                onPress={() => setAccepted(!accepted)}
                style={[styles.checkbox, { width: 22, height: 22, borderRadius: 5, marginRight: 14 }]}
                accessibilityRole="button"
              >
                {accepted && <View style={[styles.checkboxTick, { borderRadius: 4 }]} />}
              </TouchableOpacity>

              <Text style={[styles.termsText, { fontSize: 14, lineHeight: 20 }]}>
                <Text>{t('auth.register.termsText')}</Text>
                <Text style={[styles.link, { fontSize: 14 }]}>{t('auth.register.termsLink')}</Text>
                <Text>{t('auth.register.termsEnd')}</Text>
              </Text>
            </View>

            <PrimaryButton
              title={loading ? '' : t('auth.register.registerButton')}
              onPress={handleNext}
              height={btnHeight}
              borderRadius={btnRadius}
              style={{ marginTop: 20 }}
            >
              {loading && <ActivityIndicator />}
            </PrimaryButton>

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
  container: { flexGrow: 1, paddingTop: Platform.OS === 'android' ? 8 : 0, justifyContent: 'space-between' },
  topArea: { alignItems: 'center', marginTop: Platform.OS === 'ios' ? 60 : 40 },
  title: { color: '#252525', fontWeight: '800' },
  form: { paddingBottom: 60 },

  inputBox: { 
    width: '100%',
    backgroundColor: 'rgba(196,196,196,0.2)',
    borderRadius: 10,
    justifyContent: 'center' 
  },
  textInput: { 
    fontSize: 16, 
    color: '#252525', 
    paddingHorizontal: 22, 
    paddingVertical: 0,
    height: '100%',
    borderRadius: 10,
    textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
    minHeight: 24,
  },

  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, width: '100%' },
  checkbox: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: '#CBCBCB', marginRight: 8 },
  checkboxTick: { flex: 1, backgroundColor: '#FF3951', borderRadius: 2 },
  termsText: { fontSize: 9, color: '#252525', flexWrap: 'wrap', flex: 1 },
  link: { color: '#FF3951' },

  nextBtn: { width: '100%', backgroundColor: '#FF3951',
    borderRadius: 10, justifyContent: 'center',
    alignItems: 'center', flexDirection: 'row' },
  nextText: { color: '#FCFCFC', fontSize: 20, fontWeight: '600' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18, alignItems: 'center' },

  already: { color: '#252525', fontSize: 13, fontWeight: '500' },
  loginLink: { color: '#FF3951', fontSize: 13, fontWeight: '700', marginLeft: 6 },

  dropdown: { 
    left: 0, 
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10 
  },

  item: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff" 
  },
  itemHover: { backgroundColor: "#f0f0f0" },
  itemSelected: { backgroundColor: "#FF395120" }, // Light red background for selected item
  itemText: {
    fontSize: 16,
    color: '#252525',
  },
});
