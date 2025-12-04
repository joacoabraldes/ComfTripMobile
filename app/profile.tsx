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
import { AppColors, ShadowColors } from "@/constants/Colors";
import { getResponsiveValues, responsiveSize } from "@/helpers/responsive";
import TextButton from "@/components/buttons/TextButton";

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
  const responsive = getResponsiveValues(width, height);
  const btnHeight = responsive.heights.button;
  const btnRadius = responsive.borderRadius.button;
  const iconSize = responsiveSize(width, 0.045, 16, 20);

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
  const fontSizeSmall = responsive.fontSizes.small;
  const fontSizeMedium = responsive.fontSizes.medium;
  const fontSizeLarge = responsive.fontSizes.large;
  const paddingSmall = responsive.padding.small;
  const paddingMedium = responsive.padding.medium;
  const paddingLarge = responsive.padding.large;
  const borderRadius = responsive.borderRadius.default;

  function InfoRow({ label, value, iconName, iconSize }: { label: string; value: string; iconName?: keyof typeof Ionicons.glyphMap; iconSize?: number }) {
    return (
      <View style={[styles.infoRow, { paddingVertical: paddingSmall }]}>
        <View style={styles.infoLeft}>
          {iconName ? <Ionicons name={iconName} size={iconSize || 18} color={AppColors.textSecondary} /> : null}
          <Text style={[styles.infoLabel, { fontSize: fontSizeSmall, marginLeft: iconName ? responsive.spacing.small : 0 }]}>{label}</Text>
        </View>
        <Text style={[styles.infoValue, { fontSize: fontSizeMedium }]}>{value}</Text>
      </View>
    );
  }

  return (
    <SecondaryLayout title={t('profile.profile')}>
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
          {/* Profile Photo */}
          <View style={styles.profilePhotoContainer}>
            <View style={[styles.profilePhoto, { width: responsiveSize(width, 0.25, 80, 120), height: responsiveSize(width, 0.25, 80, 120), borderRadius: responsiveSize(width, 0.125, 40, 60) }]}>
              <Ionicons name="person" size={responsiveSize(width, 0.12, 40, 60)} color={AppColors.textSecondary} />
            </View>
          </View>
          
          <InfoRow label={t('profile.user')} value={displayName} iconName="person" iconSize={iconSize} />
          <InfoRow label={t('profile.email')} value={displayEmail} iconName="mail" iconSize={iconSize} />
          <InfoRow label={t('profile.phone')} value={displayPhone} iconName="call" iconSize={iconSize} />
          <InfoRow label={t('profile.nationality')} value={displayNationality} iconName="flag" iconSize={iconSize} />
          <InfoRow label={t('profile.birthdate')} value={displayBirthdate} iconName="calendar" iconSize={iconSize} />
          
          {/* Language Selector */}
          <View style={[styles.infoRow, { paddingVertical: paddingSmall, borderBottomWidth: 0 }]}>
            <View style={styles.infoLeft}>
              <Ionicons name="globe" size={iconSize} color={AppColors.textSecondary} />
              <Text style={[styles.infoLabel, { fontSize: fontSizeSmall, marginLeft: responsive.spacing.small }]}>
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
                  language === 'es' ? { color: AppColors.white } : { color: AppColors.textSecondary }
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
                  language === 'en' ? { color: AppColors.white } : { color: AppColors.textSecondary }
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
          <View style={styles.textButtonRow}>
            <TextButton
              title={t('profile.editProfile')}
              onPress={handleEdit}
            />
            <TextButton
              title={t('profile.changePassword')}
              onPress={handleChangePassword}
            />
          </View>

          {/* Logout Button */}
          <View style={[styles.buttonRow, { marginTop: 32 }]}>
            <PrimaryButton
              title={t('profile.logout')}
              onPress={handleLogout}
              height={btnHeight}
              borderRadius={btnRadius}
              style={[styles.actionButton, { width: '100%' }]}
            />
          </View>
        </View>
      </ScrollView>
    </SecondaryLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: AppColors.backgroundPrimary,
    ...Platform.select({
      ios: {
        shadowColor: ShadowColors.black,
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
    borderBottomColor: AppColors.borderLight,
  },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { color: AppColors.textSecondary, fontWeight: "500" },
  infoValue: { color: AppColors.text, fontWeight: "600" },
  languageButton: {
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.backgroundTertiary,
  },
  languageButtonActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.text,
    marginBottom: 6,
    marginTop: 6,
  },
  interestsText: {
    textAlign: "center",
    color: AppColors.textSecondary,
    fontSize: 14,
    paddingHorizontal: 12,
  },

  profilePhotoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  profilePhoto: {
    backgroundColor: AppColors.backgroundInputMuted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: AppColors.borderLight,
  },
  actionsContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    width: "100%",
  },
  textButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
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



