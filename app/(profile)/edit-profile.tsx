// moved from EditProfileScreen.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import PrimaryButton from "@/components/buttons/PrimaryButton";
import SecondaryLayout from "@/components/layouts/SecondaryLayout";
import { apiGet, apiPut, tokenStorage } from "@/helpers/api";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { useTranslation } from '@/i18n';
import { useCommonStyles } from '@/constants/Styles';
import { useAppColors } from '@/hooks/useAppColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import PhoneField from '@/components/forms/PhoneField';
import NationalityField from '@/components/forms/NationalityField';
import countries from 'world-countries';
import { useSnackbar } from '@/contexts/SnackbarContext';

export const options = {
  headerShown: false,
};

function parseJwt(token: string | null) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let s = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    let decoded = null;
    if (typeof atob !== "undefined") {
      decoded = atob(s);
    } else {
      // @ts-ignore
      const Buffer = require("buffer").Buffer;
      decoded = Buffer.from(s, "base64").toString("utf8");
    }
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

// Format for display: DD/MM/YYYY
function formatDateForDisplay(d?: Date | null) {
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Convert Date to ISO date YYYY-MM-DD for API
function dateToISODate(d?: Date | null) {
  if (!d) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const AppColors = useAppColors();
  const CommonStyles = useCommonStyles();
  const styles = getStyles(AppColors);
  const { showSuccess, showError } = useSnackbar();
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === 'dark' ? AppColors.white : AppColors.textMutedDark;
  // Get userId from token as in profile.tsx
  const [userId, setUserId] = useState<string | number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nationality, setNationality] = useState<string | null>(null);
  // birthdate state now as Date | null (for picker) and display string
  const [birthdateDate, setBirthdateDate] = useState<Date | null>(null);
  const [birthdateDisplay, setBirthdateDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // DateTimePicker visibility (for Android modal / iOS inline)
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    (async () => {
      setInitialLoading(true);
      try {
        const token = await tokenStorage.getToken();
        if (!token) throw new Error("No token");
        const payload = parseJwt(token);
        const id = payload?.id ?? payload?.userId ?? payload?.sub ?? null;
        setUserId(id);
        if (!id) throw new Error("No userId in token");
        const res = await apiGet(`/users/${id}`);
        const user = res.data?.user ?? res.data ?? res;

        setName(user.name || "");
        setEmail(user.email || "");
        
        // Parse phone number to extract code and number
        // Phone can be stored as: "+1234567890", "+52 1234567890", "+52-1234567890", etc.
        const phone = user.phone || "";
        if (phone) {
          // Get valid country codes from world-countries
          const validCodes = new Set<string>();
          try {
            if (Array.isArray(countries)) {
              countries.forEach((country: any) => {
                if (country.idd && country.idd.root) {
                  const root = country.idd.root.replace(/^\+/, '');
                  if (country.idd.suffixes && Array.isArray(country.idd.suffixes) && country.idd.suffixes.length > 0) {
                    const firstSuffix = country.idd.suffixes[0];
                    validCodes.add(`+${root}${firstSuffix}`);
                  } else if (root) {
                    validCodes.add(`+${root}`);
                  }
                }
              });
            }
          } catch (e) {
            console.warn('Error extracting country codes:', e);
          }
          
          // Add common fallback codes
          validCodes.add('+1');
          validCodes.add('+52');
          validCodes.add('+54');
          validCodes.add('+55');
          validCodes.add('+56');
          validCodes.add('+57');
          
          // Remove common separators (spaces, dashes, parentheses)
          const cleaned = phone.replace(/[\s\-\(\)]/g, '');
          
          // Try to match country codes starting from longest to shortest
          // This ensures we match +54 before +5411
          let matched = false;
          if (cleaned.startsWith('+')) {
            // Try codes from longest to shortest (up to 4 digits after +)
            for (let codeLen = 4; codeLen >= 1; codeLen--) {
              const potentialCode = cleaned.substring(0, codeLen + 1); // +1, +52, +123, +1234
              const potentialNumber = cleaned.substring(codeLen + 1);
              
              // Check if this is a valid country code
              if (validCodes.has(potentialCode) && potentialNumber.length >= 4) {
                setPhoneCode(potentialCode);
                setPhoneNumber(potentialNumber);
                matched = true;
                break;
              }
            }
          }
          
          // If no valid code found, try patterns with separators
          if (!matched) {
            const codePatterns = [
              /^(\+\d{1,4})\s+(.+)/,   // +52 1234567890
              /^(\+\d{1,4})-(.+)/,     // +52-1234567890
            ];
            
            for (const pattern of codePatterns) {
              const match = phone.match(pattern);
              if (match) {
                const code = match[1];
                const number = match[2].replace(/[\s\-\(\)]/g, '');
                if (validCodes.has(code) && number.length >= 4) {
                  setPhoneCode(code);
                  setPhoneNumber(number);
                  matched = true;
                  break;
                }
              }
            }
          }
          
          // Fallback: if still no match, use default code
          if (!matched) {
            if (cleaned.startsWith('+')) {
              // Try to extract first 1-3 digits as code (fallback)
              const fallbackMatch = cleaned.match(/^(\+\d{1,3})(\d{4,})/);
              if (fallbackMatch) {
                setPhoneCode(fallbackMatch[1]);
                setPhoneNumber(fallbackMatch[2]);
              } else {
                setPhoneCode('+1');
                setPhoneNumber(cleaned.replace(/^\+/, ''));
              }
            } else {
              setPhoneCode('+1');
              setPhoneNumber(cleaned);
            }
          }
        } else {
          setPhoneCode('+1');
          setPhoneNumber("");
        }
        
        setNationality(user.nationality || null);

        // parse birthdate into Date if possible
        const raw = user.birthdate || "";
        let parsed: Date | null = null;
        if (raw) {
          // try to parse several common formats (ISO or date-only)
          const tryDate = (val: any) => {
            try {
              const d = new Date(val);
              if (!isNaN(d.getTime())) return d;
              return null;
            } catch {
              return null;
            }
          };
          parsed = tryDate(raw) ?? null;
        }
        setBirthdateDate(parsed);
        setBirthdateDisplay(parsed ? formatDateForDisplay(parsed) : raw || "");
      } catch (err) {
        // fallback: leave fields empty
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  // Handler from the DateTimePicker
  function onChangeDate(event: any, selected?: Date | undefined) {
    // selected is undefined when user cancels on Android
    if (selected) {
      setBirthdateDate(selected);
      setBirthdateDisplay(formatDateForDisplay(selected));
    }
    // On Android the picker is modal: hide after selection/cancel
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      const token = await tokenStorage.getToken();
      if (!token) throw new Error("No token");
      if (!userId) throw new Error("No userId");
      const res = await apiPut(`/users/${userId}`, {
        name,
        email,
        phone: `${phoneCode}${phoneNumber}`,
        nationality: nationality || "",
        // send ISO date (YYYY-MM-DD) if we have one, otherwise empty string
        birthdate: birthdateDate ? dateToISODate(birthdateDate) : birthdateDisplay || "",
      });
      showSuccess(res.data?.message || t('profile.profileUpdated'));
      // go back; profile screen listens for focus and will reload
      router.back();
    } catch (err: any) {
      showError(err?.message || t('profile.updateError'));
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <SecondaryLayout title={t('profile.editProfile')}>
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF3951" />
            <Text style={CommonStyles.loadingText}>{t('profile.loading')}</Text>
        </View>
      </SecondaryLayout>
    );
  }

  return (
    <SecondaryLayout title={t('profile.editProfile')}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

        <TextInput style={[CommonStyles.input, { color: AppColors.text }]} placeholder={t('profile.name')} value={name} onChangeText={setName} placeholderTextColor={placeholderColor} />
        <TextInput style={[CommonStyles.input, { color: AppColors.text }]} placeholder={t('profile.email')} value={email} onChangeText={setEmail} placeholderTextColor={placeholderColor} />
        
        <View style={{ marginBottom: 12 }}>
          <PhoneField
            code={phoneCode}
            value={phoneNumber}
            onCodeChange={setPhoneCode}
            onNumberChange={setPhoneNumber}
            placeholder={t('profile.phone')}
          />
        </View>

        <View style={{ marginBottom: 12 }}>
          <NationalityField
            value={nationality}
            onValueChange={setNationality}
            placeholder={t('profile.selectNationality')}
          />
        </View>

        {/* Birthdate field: tap to open native picker */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowPicker(true)}
          style={[CommonStyles.input, styles.dateInput, { backgroundColor: AppColors.backgroundInput }]}
        >
          <Text style={[styles.dateText, !birthdateDisplay && styles.placeholderText]}>
            {birthdateDisplay || t('profile.birthdate')}
          </Text>
        </TouchableOpacity>

        {/* DateTimePicker: rendered conditionally */}
        {showPicker && (
          <DateTimePicker
            value={birthdateDate ?? new Date()}
            mode="date"
            display={Platform.select({ ios: "spinner", android: "calendar" })}
            maximumDate={new Date()} // birthdate can't be in the future
            onChange={onChangeDate}
          />
        )}

        <PrimaryButton title={loading ? t('common.loading') : t('common.save')} onPress={handleSave} style={{ marginTop: 24 }} disabled={loading} />
      </ScrollView>
    </SecondaryLayout>
  );
}

// Create dynamic styles function
const getStyles = (AppColors: ReturnType<typeof useAppColors>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dateInput: {
    // make the TouchableOpacity look like the other inputs
    justifyContent: "center",
  },
  dateText: {
    fontSize: 16,
    color: AppColors.text,
  },
  placeholderText: {
    color: AppColors.textMutedDark,
  },
});
