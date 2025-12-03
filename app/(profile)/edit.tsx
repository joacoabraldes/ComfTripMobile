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
        const phone = user.phone || "";
        if (phone) {
          // Try to extract country code (assuming format like +1234567890 or +52 1234567890)
          const phoneMatch = phone.match(/^(\+\d{1,4})\s*(.+)$/);
          if (phoneMatch) {
            setPhoneCode(phoneMatch[1]);
            setPhoneNumber(phoneMatch[2]);
          } else if (phone.startsWith('+')) {
            // If it starts with + but no space, try to extract first 1-4 digits as code
            const codeMatch = phone.match(/^(\+\d{1,4})/);
            if (codeMatch) {
              setPhoneCode(codeMatch[1]);
              setPhoneNumber(phone.substring(codeMatch[1].length));
            } else {
              setPhoneCode('+1');
              setPhoneNumber(phone);
            }
          } else {
            setPhoneCode('+1');
            setPhoneNumber(phone);
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
