import PrimaryButton from "@/components/buttons/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import SecondaryLayout from "@/components/layouts/SecondaryLayout";
import { apiGet, tokenStorage } from "@/helpers/api";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "@/i18n";

// Helper: base64url decode (works in RN / browser)
function base64UrlDecode(input: string) {
  try {
    let s = input.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    if (typeof atob !== "undefined") {
      return atob(s);
    }
    // node / buffer fallback
    // @ts-ignore
    const Buffer = require("buffer").Buffer;
    return Buffer.from(s, "base64").toString("utf8");
  } catch (e) {
    return null;
  }
}

function parseJwt(token: string | null) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const decoded = base64UrlDecode(parts[1]);
    if (!decoded) return null;
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

type Profile = {
  id?: number;
  name?: string;
  email?: string;
  nationality?: string | null;
  birthdate?: string | null;
  phone?: string | null;
  interests?: { id: number; title: string }[];
};

export default function ProfileScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { t, language, setLanguage } = useTranslation();
  
  // Tamaños relativos basados en el tamaño de pantalla
  const btnHeight = Math.round(Math.max(44, Math.min(64, width * 0.14)));
  const btnRadius = Math.round(btnHeight * 0.22);
  const iconSize = Math.round(Math.max(16, Math.min(20, width * 0.045)));

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  // helper: try to read token a few times (handles small race where login sets token just before navigation)
  const getTokenWithRetries = useCallback(async (attempts = 6, delayMs = 250) => {
    for (let i = 0; i < attempts; i++) {
      try {
        const t = await tokenStorage.getToken();
        if (t) return t;
      } catch (e) {
        // ignore
      }
      // small wait
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, delayMs));
    }
    return null;
  }, []);

  // load profile (used on focus and mount)
  const loadProfile = useCallback(async () => {
    let mounted = true;
    setLoading(true);
    try {
      const token = await getTokenWithRetries(6, 250);
      if (!token) {
        console.warn("No token found after retries — redirecting to login");
        // small delay to allow screen transition to finish cleanly
        router.replace("/login");
        return;
      }

      // decode token to get user id and fetch /users/:id
      let resp: any = null;
      try {
        const payload = parseJwt(token);
        const userId = payload?.id ?? payload?.userId ?? payload?.sub ?? null;
        if (userId) {
          const r2 = await apiGet(`/users/${userId}`);
          resp = r2?.data ?? r2;
        } else {
          console.warn("No userId in token; can't fetch profile");
        }
      } catch (err2) {
        console.warn("Fetching by id failed:", err2);
      }

      // Normalize shape { user, interests } or direct user object
      if (resp) {
        const userObj = resp.user ?? resp;
        const normalized: Profile = {
          id: userObj?.id,
          name: userObj?.name ?? "Usuario",
          email: userObj?.email ?? "",
          nationality: userObj?.nationality ?? null,
          birthdate: userObj?.birthdate ?? null,
          phone: (userObj?.phone ?? null) as string | null,
          interests: resp.interests ?? userObj?.interests ?? [],
        };
        if (mounted) setProfile(normalized);
      } else {
        // non-fatal: show placeholders if we couldn't fetch but token existed
        if (mounted)
          setProfile({
            name: "Nombre de usuario",
            email: "usuario@example.com",
            phone: "+54 11 1234 5678",
            nationality: null,
            birthdate: null,
            interests: [],
          });
      }
    } catch (err) {
      console.warn("Profile load error:", err);
      if (mounted)
        setProfile({
          name: "Nombre de usuario",
          email: "usuario@example.com",
          phone: "+54 11 1234 5678",
          nationality: null,
          birthdate: null,
          interests: [],
        });
    } finally {
      if (mounted) setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [getTokenWithRetries, router]);

  // run on focus (and on first mount) to always have fresh data when the screen appears
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      (async () => {
        await loadProfile();
      })();

      return () => {
        isActive = false;
      };
    }, [loadProfile])
  );

  async function performLogout() {
    try {
      try {
        // prefer removeToken if helper provides it
        // @ts-ignore
        if (typeof tokenStorage.removeToken === "function") {
          // @ts-ignore
          await tokenStorage.removeToken();
        } else if (typeof tokenStorage.setToken === "function") {
          await tokenStorage.setToken("");
        }
      } catch (e) {
        // ignore inner
        try {
          await tokenStorage.setToken("");
        } catch {}
      }
      // also try to remove AsyncStorage key directly (best-effort)
      try {
        const AsyncStorage = (() => {
          try {
            return require("@react-native-async-storage/async-storage").default;
          } catch {
            return null;
          }
        })();
        if (AsyncStorage) {
          await AsyncStorage.removeItem("token");
        } else if (typeof localStorage !== "undefined") {
          localStorage.removeItem("token");
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.warn("Logout storage cleanup failed", e);
    } finally {
      router.replace("/login");
    }
  }

  function handleLogout() {
    Alert.alert(t('profile.logoutTitle'), t('profile.logoutMessage'), [
      { text: t('profile.logoutCancel'), style: "cancel" },
      { text: t('profile.logout'), style: "destructive", onPress: performLogout },
    ]);
  }

  function handleEdit() {
    router.push("../(profile)/edit");
  }
  function handleChangePassword() {
    router.push("../(profile)/change-password");
  }

  if (loading || !profile) {
    return (
      <SecondaryLayout title={t('profile.editProfile')}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </SecondaryLayout>
    );
  }

  // Format birthdate to DD/MM/YYYY
  function formatDateOnly(d?: string | null) {
    if (!d) return "—";
    const tryParse = (val: any) => {
      try {
        const date = new Date(val);
        if (isNaN(date.getTime())) return null;
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return null;
      }
    };
    const parsed = tryParse(d);
    if (parsed) return parsed;
    if (typeof d === "string") {
      const short = d.split("T")[0] || d;
      const parsed2 = tryParse(short);
      if (parsed2) return parsed2;
      return short;
    }
    return String(d);
  }

  const displayName = profile.name ?? "Usuario";
  const displayEmail = profile.email ?? "usuario@example.com";
  const displayPhone = profile.phone ?? "+54 11 1234 5678";
  const displayNationality = profile.nationality ?? "—";
  const displayBirthdate = formatDateOnly(profile.birthdate);

  // Tamaños relativos para textos y espaciados
  const fontSizeSmall = Math.round(Math.max(12, Math.min(14, width * 0.033)));
  const fontSizeMedium = Math.round(Math.max(14, Math.min(16, width * 0.038)));
  const fontSizeLarge = Math.round(Math.max(16, Math.min(18, width * 0.043)));
  const paddingSmall = Math.round(Math.max(10, Math.min(12, width * 0.03)));
  const paddingMedium = Math.round(Math.max(12, Math.min(14, width * 0.035)));
  const paddingLarge = Math.round(Math.max(14, Math.min(16, width * 0.04)));
  const borderRadius = Math.round(Math.max(10, Math.min(12, width * 0.03)));

  function InfoRow({ label, value, iconName, iconSize }: { label: string; value: string; iconName?: keyof typeof Ionicons.glyphMap; iconSize?: number }) {
    return (
      <View style={[styles.infoRow, { paddingVertical: paddingSmall }]}>
        <View style={styles.infoLeft}>
          {iconName ? <Ionicons name={iconName} size={iconSize || 18} color="#666" /> : null}
          <Text style={[styles.infoLabel, { fontSize: fontSizeSmall, marginLeft: iconName ? Math.round(width * 0.02) : 0 }]}>{label}</Text>
        </View>
        <Text style={[styles.infoValue, { fontSize: fontSizeMedium }]}>{value}</Text>
      </View>
    );
  }

  return (
    <SecondaryLayout title={t('profile.editProfile')}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View style={[styles.infoCard, { 
          borderRadius: borderRadius,
          paddingVertical: paddingMedium,
          paddingHorizontal: paddingMedium,
          marginTop: 16,
          marginHorizontal: 16,
        }]}>
          <InfoRow label={t('profile.user')} value={displayName} iconName="person" iconSize={iconSize} />
          <InfoRow label={t('profile.email')} value={displayEmail} iconName="mail" iconSize={iconSize} />
          <InfoRow label={t('profile.phone')} value={displayPhone} iconName="call" iconSize={iconSize} />
          <InfoRow label={t('profile.nationality')} value={displayNationality} iconName="flag" iconSize={iconSize} />
          <InfoRow label={t('profile.birthdate')} value={displayBirthdate} iconName="calendar" iconSize={iconSize} />
          
          {/* Language Selector */}
          <View style={[styles.infoRow, { paddingVertical: paddingSmall, borderBottomWidth: 0 }]}>
            <View style={styles.infoLeft}>
              <Ionicons name="globe" size={iconSize} color="#666" />
              <Text style={[styles.infoLabel, { fontSize: fontSizeSmall, marginLeft: Math.round(width * 0.02) }]}>
                {t('profile.language')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setLanguage('es')}
                style={[
                  styles.languageButton,
                  language === 'es' && styles.languageButtonActive,
                  { paddingHorizontal: paddingSmall, paddingVertical: 4, borderRadius: 6 }
                ]}
              >
                <Text style={[
                  { fontSize: fontSizeSmall, fontWeight: '600' },
                  language === 'es' ? { color: '#fff' } : { color: '#666' }
                ]}>
                  {t('profile.spanish')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLanguage('en')}
                style={[
                  styles.languageButton,
                  language === 'en' && styles.languageButtonActive,
                  { paddingHorizontal: paddingSmall, paddingVertical: 4, borderRadius: 6 }
                ]}
              >
                <Text style={[
                  { fontSize: fontSizeSmall, fontWeight: '600' },
                  language === 'en' ? { color: '#fff' } : { color: '#666' }
                ]}>
                  {t('profile.english')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Row with Edit Profile and Change Password */}
          <View style={styles.buttonRow}>
            <PrimaryButton
              title={t('profile.editProfile')}
              onPress={handleEdit}
              height={btnHeight}
              borderRadius={btnRadius}
              style={[styles.actionButton, { flex: 1, marginRight: 8 }]}
            />
            <PrimaryButton
              title={t('profile.changePassword')}
              onPress={handleChangePassword}
              height={btnHeight}
              borderRadius={btnRadius}
              style={[styles.actionButton, { flex: 1, marginLeft: 8 }]}
            />
          </View>

          {/* Logout Button */}
          <View style={[styles.buttonRow, { marginTop: 16 }]}>
            <PrimaryButton
              title={t('profile.logout')}
              onPress={handleLogout}
              height={btnHeight}
              borderRadius={btnRadius}
              style={[styles.actionButton, { width: '100%', backgroundColor: '#DC3545' }]}
            />
          </View>
        </View>
      </ScrollView>
    </SecondaryLayout>
  );
}

const RED = "#FF3951";

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEE",
  },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { color: "#888", fontWeight: "500" },
  infoValue: { color: "#111", fontWeight: "600" },
  languageButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f5f5f5",
  },
  languageButtonActive: {
    backgroundColor: RED,
    borderColor: RED,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
    marginTop: 6,
  },
  interestsText: {
    textAlign: "center",
    color: "#555",
    fontSize: 14,
    paddingHorizontal: 12,
  },

  actionsContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    width: "100%",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    minWidth: 0,
  },
  centered: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center",
    paddingTop: 100,
  },
});



