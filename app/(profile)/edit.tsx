// moved from EditProfileScreen.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import PrimaryButton from "@/components/buttons/PrimaryButton";
import BackButton from "@/components/BackButton";
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
  Platform, FlatList,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import countryRegionData from "country-region-data";
import { CommonStyles } from '@/constants/Styles';
import { useTranslation } from '@/i18n';

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
  const [phone, setPhone] = useState("");

  const [nationality, setNationality] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // birthdate state now as Date | null (for picker) and display string
  const [birthdateDate, setBirthdateDate] = useState<Date | null>(null);
  const [birthdateDisplay, setBirthdateDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // DateTimePicker visibility (for Android modal / iOS inline)
  const [showPicker, setShowPicker] = useState(false);

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
        setPhone(user.phone || "");
        setNationality(user.nationality || "");

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
        phone,
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
      <SafeAreaView style={CommonStyles.safeArea}>
        <View style={CommonStyles.containerWithBackButton}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={CommonStyles.safeArea}>
      <View style={CommonStyles.backButtonContainer}>
        <BackButton />
      </View>
      <View style={[CommonStyles.containerWithBackButton, { padding: 24, paddingTop: Platform.OS === 'ios' ? 80 : 60 }]}>
        <Text style={CommonStyles.pageTitle}>{t('profile.editProfile')}</Text>

        <TextInput style={CommonStyles.input} placeholder={t('profile.name')} value={name} onChangeText={setName} />
        <TextInput style={CommonStyles.input} placeholder={t('profile.email')} value={email} onChangeText={setEmail} />
        <TextInput style={CommonStyles.input} placeholder={t('profile.phone')} value={phone} onChangeText={setPhone} />


        {/* Input para abrir el dropdown */}
        <View style={[styles.inputBox, { flexDirection: "row", alignItems: "center", backgroundColor: open ? "white" : 'rgba(196,196,196,0.2)', borderWidth: open ? 2 : 0 }]}
              onFocus={()=>setOpen(true)}>
          <TextInput
              style={[styles.textInput, { flex:1, borderWidth:0, outline:"none", color: nationality? "#252525" : "rgba(0,0,0,0.5)"}]}
              placeholder={nationality? nationality : t('profile.selectNationality')}
              value={search}
              onChangeText={setSearch}
          />
          <Text
              style={{ fontSize: 16, marginLeft: "auto", transform: [{ rotate: open ? "0deg" : "180deg" }]}}
              onPress={() => setOpen(!open)}
          >
            ▲
          </Text>
        </View>
        {open && (
              <View style={styles.dropdown}>
              <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const isSelected = nationality === item;
                    return (
                        <TouchableOpacity
                            style={[styles.item,
                              isSelected && styles.itemSelected]}
                            onPress={() => {
                              setNationality(item);
                              setSearch("");
                              setOpen(false);
                            }}
                        >
                          <Text>{item}</Text>
                        </TouchableOpacity>
                    );
                  }}
              />
            </View>
        )}

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  inputBox: {
    backgroundColor: 'rgba(196,196,196,0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'center' },

  textInput: { fontSize: 16, color: '#252525', borderRadius: 8},
  dateInput: {
    // make the TouchableOpacity look like the other inputs
    justifyContent: "center",
  },
  dateText: {
    fontSize: 16,
    color: "#111",
  },
  placeholderText: {
    color: "#999",
  },

  dropdown: { left: 0, right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10,
    marginBottom: 12,},

  item: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#fff" },
  itemHover: { backgroundColor: "#f0f0f0" },
  itemSelected: { backgroundColor: "#d0d0d0" },
});
