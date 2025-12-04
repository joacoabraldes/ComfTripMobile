// moved from EditProfileScreen.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import PrimaryButton from "@/components/buttons/PrimaryButton";
import SecondaryLayout from "@/components/layouts/SecondaryLayout";
import { apiGet, apiPut, tokenStorage } from "@/helpers/api";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { useTranslation } from '@/i18n';
import { CommonStyles } from '@/constants/Styles';
import { AppColors } from '@/constants/Colors';
import PhoneField from '@/components/forms/PhoneField';
import NationalityField from '@/components/forms/NationalityField';

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
          // Remove common separators (spaces, dashes, parentheses)
          const cleaned = phone.replace(/[\s\-\(\)]/g, '');
          
          // Try to match country codes (1-4 digits after +)
          // Common codes: +1 (US/CA), +52 (MX), +54 (AR), +57 (CO), etc.
          const codePatterns = [
            /^(\+\d{1,4})(\d{4,})/,  // +1234567890 or +521234567890
            /^(\+\d{1,4})\s+(.+)/,   // +52 1234567890
            /^(\+\d{1,4})-(.+)/,     // +52-1234567890
          ];
          
          let matched = false;
          for (const pattern of codePatterns) {
            const match = phone.match(pattern);
            if (match) {
              const code = match[1];
              const number = match[2].replace(/[\s\-\(\)]/g, ''); // Clean the number part
              // Validate: code should be 1-4 digits, number should be at least 4 digits
              if (code.length >= 2 && code.length <= 5 && number.length >= 4) {
                setPhoneCode(code);
                setPhoneNumber(number);
                matched = true;
                break;
              }
            }
          }
          
          // If no pattern matched, try to extract from cleaned string
          if (!matched && cleaned.startsWith('+')) {
            // Try common country code lengths
            for (let codeLen = 2; codeLen <= 4; codeLen++) {
              const potentialCode = cleaned.substring(0, codeLen + 1); // +1, +52, +123, etc.
              const potentialNumber = cleaned.substring(codeLen + 1);
              // Validate potential code and number
              if (potentialNumber.length >= 4 && /^\+\d+$/.test(potentialCode)) {
                setPhoneCode(potentialCode);
                setPhoneNumber(potentialNumber);
                matched = true;
                break;
              }
            }
          }
          
          // Fallback: if still no match, use default code
          if (!matched) {
            if (cleaned.startsWith('+')) {
              // If it has + but we couldn't parse, try to extract first 1-3 digits as code
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
      Alert.alert(t('profile.profileUpdated'), res.data?.message || "");
      // go back; profile screen listens for focus and will reload
      router.back();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('profile.updateError'));
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <SecondaryLayout title={t('profile.editProfile')}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SecondaryLayout>
    );
  }

  return (
    <SecondaryLayout title={t('profile.editProfile')}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

        <TextInput style={CommonStyles.input} placeholder={t('profile.name')} value={name} onChangeText={setName} />
        <TextInput style={CommonStyles.input} placeholder={t('profile.email')} value={email} onChangeText={setEmail} />
        
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
          style={[CommonStyles.input, styles.dateInput]}
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

const styles = StyleSheet.create({
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
